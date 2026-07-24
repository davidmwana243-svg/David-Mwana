import { Request, Response } from 'express';
import { getDb } from '../firebase/index.js';
import { processShwaryPayment, sanitizeDRCPhone } from '../services/shwaryService';

export { processShwaryPayment, sanitizeDRCPhone };

/**
 * Initiates a new payment transaction with Shwary payment gateway.
 */
export const initiatePayment = async (req: Request, res: Response) => {
  const { amount, clientPhoneNumber, orderId } = req.body;
  const hostUrl = `${req.protocol}://${req.get('host')}`;

  try {
    const result = await processShwaryPayment(amount, clientPhoneNumber, orderId, hostUrl);
    return res.json(result);
  } catch (error: any) {
    console.error('[SHWARY WEB API] Error during payment initiation:', error?.message || error);
    return res.status(500).json({
      error: error?.message || "Une erreur est survenue lors de l'initiation du paiement."
    });
  }
};

/**
 * Receives payment status updates (webhooks) from the Shwary platform.
 * Supports flexible order lookup via direct document ID or reference matching,
 * updates Firestore documents automatically, and yields real-time terminal logs.
 */
export const handleCallback = async (req: Request, res: Response) => {
  console.log('\n=========================================');
  console.log('📬 [SHWARY WEBHOOK] RECEIVED NOTIFICATION');
  console.log(`- HTTP Method: ${req.method}`);
  console.log(`- Action Path: ${req.originalUrl}`);
  console.log('- Incoming Headers:', JSON.stringify(req.headers, null, 2));
  console.log('- Raw Payload Body:', JSON.stringify(req.body, null, 2));
  console.log('=========================================\n');

  try {
    const db = getDb();
    if (!db) {
      console.error('[SHWARY WEBHOOK] Firebase database reference is null. Ensure initialized.');
      return res.status(500).json({ error: 'Database uninitialized' });
    }

    // Support both flat req.body fields and nested fields inside a "data" or "payload" property
    const body = req.body || {};
    const nestedData = body.data || {};
    const nestedPayload = body.payload || {};

    const status = body.status ?? nestedData.status ?? nestedPayload.status;
    const id = body.id ?? nestedData.id ?? nestedPayload.id;
    const referenceId = body.referenceId ?? nestedData.referenceId ?? nestedPayload.referenceId ?? body.reference_id ?? nestedData.reference_id ?? nestedPayload.reference_id;
    const orderId = body.orderId ?? nestedData.orderId ?? nestedPayload.orderId ?? body.order_id ?? nestedData.order_id ?? nestedPayload.order_id;
    const reference = body.reference ?? nestedData.reference ?? nestedPayload.reference;
    const transaction_id = body.transaction_id ?? nestedData.transaction_id ?? nestedPayload.transaction_id;
    const transactionId = body.transactionId ?? nestedData.transactionId ?? nestedPayload.transactionId;
    const amount = body.amount ?? nestedData.amount ?? nestedPayload.amount;
    const currency = body.currency ?? nestedData.currency ?? nestedPayload.currency;
    const recipientPhoneNumber = body.recipientPhoneNumber ?? nestedData.recipientPhoneNumber ?? nestedPayload.recipientPhoneNumber ?? body.phone ?? nestedData.phone ?? nestedPayload.phone ?? body.clientPhoneNumber ?? nestedData.clientPhoneNumber ?? nestedPayload.clientPhoneNumber;
    const userId = body.userId ?? nestedData.userId ?? nestedPayload.userId;

    // Normalizing values
    const inputStatus = (status || '').toString().trim().toLowerCase();
    
    // 1. Resolve candidate identifier
    const actualTransactionId = id || transaction_id || transactionId;
    const primaryIdCandidate = orderId || referenceId || reference || actualTransactionId;

    console.log('[SHWARY WEBHOOK] Extracted Fields Details for Diagnostics:');
    console.log(`  - status: "${status}" (normalized: "${inputStatus}")`);
    console.log(`  - id: "${id}"`);
    console.log(`  - referenceId: "${referenceId}"`);
    console.log(`  - orderId: "${orderId}"`);
    console.log(`  - reference: "${reference}"`);
    console.log(`  - transaction_id: "${transaction_id}"`);
    console.log(`  - transactionId: "${transactionId}"`);
    console.log(`  - actualTransactionId: "${actualTransactionId}"`);
    console.log(`  - primaryIdCandidate: "${primaryIdCandidate}"`);

    if (!primaryIdCandidate) {
      console.warn('[SHWARY WEBHOOK] No recognizable identifier found in payload (orderId, referenceId, id are empty).');
      return res.status(200).json({ 
        status: 'ignored', 
        message: 'No order identifier found in payload' 
      });
    }

    console.log(`[SHWARY WEBHOOK] Resolving Firestore order for candidate ID: ${primaryIdCandidate}...`);

    let orderDocRef = null;
    let orderDocSnap = null;

    // Search Mode A: Check if candidate ID is a direct document key in the 'orders' table
    const directDocRef = db.collection('orders').doc(String(primaryIdCandidate));
    const directSnap = await directDocRef.get();
    if (directSnap.exists) {
      orderDocRef = directDocRef;
      orderDocSnap = directSnap;
      console.log(`[SHWARY WEBHOOK] Match found directly using ID as document key: ${primaryIdCandidate}`);
    }

    // Search Mode B: Try stripping the merchant prefix if formatted as "merchant-orderId"
    if (!orderDocRef && typeof primaryIdCandidate === 'string' && primaryIdCandidate.startsWith('merchant-')) {
      const strippedId = primaryIdCandidate.replace(/^merchant-/, '');
      console.log(`[SHWARY WEBHOOK] Attempting lookup with stripped prefix: ${strippedId}`);
      const strippedDocRef = db.collection('orders').doc(strippedId);
      const strippedSnap = await strippedDocRef.get();
      if (strippedSnap.exists) {
        orderDocRef = strippedDocRef;
        orderDocSnap = strippedSnap;
        console.log(`[SHWARY WEBHOOK] Match found after stripping merchant prefix: ${strippedId}`);
      }
    }

    // Search Mode C: Scan 'orders' where custom fields match candidate
    if (!orderDocRef) {
      console.log(`[SHWARY WEBHOOK] Document key lookup failed. Running collection queries to find matching referenceId or field values...`);
      
      const fieldsToQuery = ['orderId', 'referenceId', 'shwaryTransactionId', 'id', 'reference', 'qrToken'];
      for (const field of fieldsToQuery) {
        if (!orderDocRef) {
          console.log(`[SHWARY WEBHOOK] Searching collection where field "${field}" == "${primaryIdCandidate}"`);
          const querySnap = await db.collection('orders')
            .where(field, '==', primaryIdCandidate)
            .limit(1)
            .get();
          
          if (!querySnap.empty) {
            orderDocRef = querySnap.docs[0].ref;
            orderDocSnap = querySnap.docs[0];
            console.log(`[SHWARY WEBHOOK] Match found in Firestore collection where field "${field}" == "${primaryIdCandidate}"`);
            break;
          }
        }
      }
    }

    if (!orderDocRef || !orderDocSnap) {
      console.warn(`[SHWARY WEBHOOK] No document matches found in orders collection for ID candidate "${primaryIdCandidate}".`);
      
      try {
        const recentOrdersSnap = await db.collection('orders').orderBy('createdAt', 'desc').limit(5).get();
        if (!recentOrdersSnap.empty) {
          console.log('[SHWARY WEBHOOK] DIAGNOSTIC: 5 most recent orders in Firestore to assist troubleshooting:');
          recentOrdersSnap.docs.forEach(doc => {
            const data = doc.data();
            console.log(`  - Order ID: "${doc.id}"`);
            console.log(`    * status: "${data.status}", paymentStatus: "${data.paymentStatus}"`);
            console.log(`    * userId: "${data.userId || 'none'}"`);
            console.log(`    * userName: "${data.userName || 'none'}", userPhone: "${data.userPhone || 'none'}"`);
          });
        } else {
          console.log('[SHWARY WEBHOOK] DIAGNOSTIC: The orders collection is currently empty.');
        }
      } catch (err: any) {
        console.warn('[SHWARY WEBHOOK] DIAGNOSTIC failed to fetch recent orders list:', err?.message || err);
      }

      return res.status(200).json({ 
        status: 'not_found', 
        message: `Order reference ${primaryIdCandidate} does not exist in localized system. Callback logged but skipped.` 
      });
    }

    // 2. Map Payment Status
    let dbPaymentStatus = 'pending';
    let dbOrderStatus = 'pending';
    let failureReason = '';

    const isSuccess = ['success', 'successful', 'completed', 'approved', 'paid'].includes(inputStatus);
    const isFailed = ['failed', 'refused', 'declined', 'cancelled', 'error', 'insufficient_balance', 'failed_empty_balance'].includes(inputStatus);

    // Extract failureReason if present in the payload (top-level or nested)
    const failureReasonPayload = body.failureReason ?? nestedData.failureReason ?? nestedPayload.failureReason ?? body.reason ?? nestedData.reason ?? nestedPayload.reason;

    if (isSuccess) {
      dbPaymentStatus = 'paid';
      dbOrderStatus = 'processing'; // Moves to processing/pending for fulfillment
    } else if (isFailed) {
      dbPaymentStatus = 'failed';
      dbOrderStatus = 'cancelled';
      
      if (failureReasonPayload) {
        failureReason = failureReasonPayload;
      } else if (inputStatus === 'insufficient_balance' || inputStatus === 'failed_empty_balance') {
        failureReason = 'Solde insuffisant sur le portefeuille de dépôt.';
      } else {
        failureReason = 'Paiement annulé par le client ou décliné par l\'opérateur.';
      }
    } else if (inputStatus === 'pending') {
      dbPaymentStatus = 'pending';
      dbOrderStatus = 'pending';
    }

    console.log('[SHWARY WEBHOOK] Status Mapping Determined:', {
      shwaryStatus: inputStatus,
      mappedPaymentStatus: dbPaymentStatus,
      mappedOrderStatus: dbOrderStatus,
      failureReason: failureReason || 'None'
    });

    // 3. Update Firestore Document
    const updateData: any = {
      paymentStatus: dbPaymentStatus,
      status: dbOrderStatus,
      updatedAt: Date.now(),
      completedAt: Date.now()
    };

    if (actualTransactionId) {
      updateData.shwaryTransactionId = actualTransactionId;
      updateData.transaction_id = actualTransactionId;
    }
    if (failureReason) {
      updateData.failureReason = failureReason;
    }

    console.log(`[SHWARY WEBHOOK] Updating Firestore Document (${orderDocRef.id}) with values:`, updateData);
    await orderDocRef.update(updateData);
    console.log(`⚡ [SHWARY WEBHOOK] Document ${orderDocRef.id} updated successfully.`);

    // Trigger Telegram notification to the user if the order has an associated Telegram user
    try {
      const orderData = orderDocSnap.data() || {};
      const totalAmount = orderData.total || amount || 0;
      
      const userDocRef = db.collection('users').doc(orderData.userId);
      const userSnap = await userDocRef.get();
      let telegramId = '';
      if (userSnap.exists) {
        telegramId = userSnap.data()?.telegramId || '';
      }
      
      if (telegramId && (isSuccess || isFailed)) {
        console.log(`[SHWARY WEBHOOK] Direct Telegram client detected (${telegramId}). Sending callback message...`);
        const { sendTelegramNotification } = await import('../../telegram/bot');
        
        const message = isSuccess 
          ? `✅ *Paiement confirmé !*\n\nCommande : *#${orderDocRef.id}*\n\n💰 Montant payé : *${totalAmount.toLocaleString('fr-FR')}* CDF\n\n📦 Votre commande est maintenant en préparation.`
          : `❌ *Échec du paiement*\n\nCommande : *#${orderDocRef.id}*\n\n💰 Montant : *${totalAmount.toLocaleString('fr-FR')}* CDF\n\nRaison : _${failureReason || 'Délai d\'attente dépassé ou solde insuffisant'}_`;

        await sendTelegramNotification(
          telegramId,
          message,
          isSuccess ? 'payment_success' : 'payment_failed'
        );
      }
    } catch (tgNotificationErr: any) {
      console.error('[SHWARY WEBHOOK] Failed to dispatch Telegram notification:', tgNotificationErr?.message || tgNotificationErr);
    }

    // 4. Send standard HTTP 200 response
    return res.status(200).json({
      status: 'success',
      orderId: orderDocRef.id,
      paymentStatus: dbPaymentStatus,
      orderStatus: dbOrderStatus,
      processedAt: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('❌ [SHWARY WEBHOOK] Global execution error occurred:', error?.message || error);
    
    // Always return HTTP 200 to Shwary to prevent retrying behavior blocks, while detailing internal error context
    return res.status(200).json({
      status: 'error',
      message: 'Internal execution error logged',
      error: error?.message || String(error)
    });
  }
};
