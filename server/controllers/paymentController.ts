import { Request, Response } from 'express';
import { getDb } from '../firebase/index.js';

/**
 * Initiates a new payment transaction with Shwary payment gateway.
 * In case of missing credentials or API exceptions, it gracefully triggers a
 * simulated local payment to ensure the checkout/end-user flow remains uninterrupted.
 */
export const initiatePayment = async (req: Request, res: Response) => {
  const { amount, clientPhoneNumber, orderId } = req.body;
  const merchantKey = process.env.SHWARY_MERCHANT_KEY;
  const merchantId = process.env.SHWARY_MERCHANT_ID;

  // Sanitize phone number to standard format
  const sanitizeDRCPhone = (phoneStr: string): string => {
    let cl = (phoneStr || '').replace(/\s+/g, '').replace(/[-\(\)]/g, '');
    if (cl.startsWith('+243')) {
      cl = cl.substring(4);
    } else if (cl.startsWith('243')) {
      cl = cl.substring(3);
    }
    if (cl.startsWith('0')) {
      cl = cl.substring(1);
    }
    return `+243${cl}`;
  };

  const formattedPhone = sanitizeDRCPhone(clientPhoneNumber);

  // Generate the callback URL dynamically based on incoming request request hosts (Cloud Run public endpoints)
  const callbackUrl = `${req.protocol}://${req.get('host')}/api/payment/callback`;

  console.log('================================================================');
  console.log('[SHWARY API] INITIATING TRANSACTION SESSION');
  console.log(`- Order ID: ${orderId}`);
  console.log(`- Client Phone (Raw): ${clientPhoneNumber}`);
  console.log(`- Client Phone (Sanitized): ${formattedPhone}`);
  console.log(`- Amount: ${amount} CDF`);
  console.log(`- Dynamic Callback URL: ${callbackUrl}`);
  console.log('- Credentials Present:', { 
    merchantId: !!merchantId, 
    merchantKey: !!merchantKey 
  });
  console.log('================================================================');

  // Detect missing or dummy configuration placeholders
  const isDummyConfig = !merchantKey || !merchantId || 
                        merchantKey.toLowerCase().includes('placeholder') || 
                        merchantId.toLowerCase().includes('placeholder') ||
                        merchantKey === 'YOUR_KEY' || merchantId === 'YOUR_ID';

  if (isDummyConfig) {
    console.warn('[SHWARY API] Missing or placeholder credentials.');
    return res.status(400).json({
      error: "Le service de paiement n'est pas encore configuré. Veuillez renseigner des identifiants Shwary valides ou d'API."
    });
  }

  try {
    // Set an abort controller to prevent hanging connection issues
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const gatewayUrl = 'https://api.shwary.com/api/v1/merchants/payment/DRC';
    console.log(`[SHWARY API] Posting request to Shwary Gateway: ${gatewayUrl}`);

    const payload = {
      amount,
      clientPhoneNumber: formattedPhone,
      callbackUrl,
      orderId 
    };

    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: {
        'x-merchant-key': merchantKey,
        'x-merchant-id': merchantId,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    const text = await response.text();
    console.log(`[SHWARY API] Shwary HTTP Status Response: ${response.status}`);
    console.log(`[SHWARY API] Shwary Response Raw Data: ${text}`);

    if (!response.ok) {
      console.warn(`[SHWARY API] Gateway error status from Shwary: ${response.status}`);
      
      // Parse response to find if a suggested/retriable alternative transaction amount was sent
      if (response.status === 422) {
        try {
          const errObj = JSON.parse(text);
          const errMsg = errObj.message || '';
          
          // Regex matching: "we can instead process \s*([0-9.]+)"
          const match = errMsg.match(/we can instead process\s+([0-9.]+)/i);
          if (match && match[1]) {
            let recommendedAmount = parseFloat(match[1]);
            if (!isNaN(recommendedAmount) && recommendedAmount > 0) {
              if (recommendedAmount < 100) {
                console.log(`[SHWARY API] Small recommended amount (${recommendedAmount}) detected. Converting from USD to CDF using exchange rate of 2800...`);
                recommendedAmount = Math.ceil(recommendedAmount * 2800);
              }
              console.log(`[SHWARY API] Corrective Trigger: Shwary suggested a different amount. Retrying with adjusted amount: ${recommendedAmount} CDF...`);
              
              const retryPayload = {
                amount: recommendedAmount,
                clientPhoneNumber: formattedPhone,
                callbackUrl,
                orderId
              };
              
              // New short-circuit abort signal
              const retryController = new AbortController();
              const retryTimeoutId = setTimeout(() => retryController.abort(), 8000);
              
              const retryResponse = await fetch(gatewayUrl, {
                method: 'POST',
                headers: {
                  'x-merchant-key': merchantKey!,
                  'x-merchant-id': merchantId!,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(retryPayload),
                signal: retryController.signal
              });
              
              clearTimeout(retryTimeoutId);
              
              const retryText = await retryResponse.text();
              console.log(`[SHWARY API] Retried Request Status: ${retryResponse.status}`);
              console.log(`[SHWARY API] Retried Request Response: ${retryText}`);
              
              if (retryResponse.ok) {
                const retryData = JSON.parse(retryText);
                console.log('[SHWARY API] Alternate transaction completed successfully via auto-retry.', retryData);
                return res.json(retryData);
              } else {
                console.warn(`[SHWARY API] Retry also failed with status: ${retryResponse.status}`);
                return res.status(retryResponse.status).json({
                  error: `La passerelle de paiement Shwary a retourné une erreur (Statut ${retryResponse.status}) lors de l'initiation de rattrapage: ${retryText}`
                });
              }
            }
          }
        } catch (parseErr) {
          console.error('[SHWARY API] Could not extract recommended retry options from 422 error details:', parseErr);
        }
      }
      
      return res.status(response.status).json({
        error: `La passerelle de paiement Shwary a retourné une erreur (Statut ${response.status}): ${text}`
      });
    }

    try {
      const data = JSON.parse(text);
      console.log('[SHWARY API] Payment initiated successfully.', data);
      return res.json(data);
    } catch (parseError) {
      console.error('[SHWARY API] Parse error on response:', parseError);
      return res.status(500).json({
        error: "Impossible de déchiffrer la réponse de la passerelle Shwary.",
        rawResponse: text
      });
    }
  } catch (error: any) {
    console.error('[SHWARY API] Error during payment initiation:', error?.message || error);
    return res.status(500).json({
      error: `Une erreur réseau ou d'exécution est survenue lors de l'initiation du paiement: ${error?.message || String(error)}`
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

    const { 
      status, 
      id, 
      referenceId, 
      orderId, 
      amount, 
      currency, 
      recipientPhoneNumber,
      userId 
    } = req.body;

    // Normalizing values
    const inputStatus = (status || '').toString().trim().toLowerCase();
    
    // 1. Resolve candidate identifier
    const primaryIdCandidate = orderId || referenceId || id;
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
    const directDocRef = db.collection('orders').doc(primaryIdCandidate);
    const directSnap = await directDocRef.get();
    if (directSnap.exists) {
      orderDocRef = directDocRef;
      orderDocSnap = directSnap;
      console.log(`[SHWARY WEBHOOK] Match found directly using ID: ${primaryIdCandidate}`);
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

    // Search Mode C: Scan recent 'orders' where custom fields match
    if (!orderDocRef) {
      console.log(`[SHWARY WEBHOOK] Document key lookup failed. Running collection queries to find matching referenceId...`);
      
      const fieldsToQuery = ['orderId', 'referenceId', 'shwaryTransactionId'];
      for (const field of fieldsToQuery) {
        if (!orderDocRef) {
          const querySnap = await db.collection('orders')
            .where(field, '==', primaryIdCandidate)
            .limit(1)
            .get();
          
          if (!querySnap.empty) {
            orderDocRef = querySnap.docs[0].ref;
            orderDocSnap = querySnap.docs[0];
            console.log(`[SHWARY WEBHOOK] Match found in Firestore collection where ${field} == ${primaryIdCandidate}`);
            break;
          }
        }
      }
    }

    if (!orderDocRef || !orderDocSnap) {
      console.warn(`[SHWARY WEBHOOK] No document matches found in orders collection for ID candidate "${primaryIdCandidate}".`);
      return res.status(200).json({ 
        status: 'not_found', 
        message: `Order reference ${primaryIdCandidate} does not exist in localized system. Callback logged but skipped.` 
      });
    }

    // 2. Map Payment Status
    let dbPaymentStatus = 'pending';
    let dbOrderStatus = 'payment_pending';
    let failureReason = '';

    const isSuccess = ['success', 'completed', 'approved', 'paid'].includes(inputStatus);
    const isFailed = ['failed', 'cancelled', 'error', 'insufficient_balance', 'failed_empty_balance'].includes(inputStatus);

    if (isSuccess) {
      dbPaymentStatus = 'paid';
      dbOrderStatus = 'processing'; // Moves to processing/pending for fulfillment
    } else if (isFailed) {
      dbPaymentStatus = 'failed';
      dbOrderStatus = 'cancelled';
      
      // Determine the precise error reason returned from Shwary
      if (inputStatus === 'insufficient_balance' || inputStatus === 'failed_empty_balance') {
        failureReason = 'Solde insuffisant sur le portefeuille de dépôt.';
      } else {
        failureReason = req.body.failureReason || 'Paiement annulé par le client ou décliné par l\'opérateur.';
      }
    } else if (inputStatus === 'pending') {
      dbPaymentStatus = 'pending';
      dbOrderStatus = 'payment_pending';
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

    if (id) {
      updateData.shwaryTransactionId = id;
    }
    if (failureReason) {
      updateData.failureReason = failureReason;
    }

    console.log(`[SHWARY WEBHOOK] Updating Firestore Document (${orderDocRef.id}) with values:`, updateData);
    await orderDocRef.update(updateData);
    console.log(`⚡ [SHWARY WEBHOOK] Document ${orderDocRef.id} updated successfully.`);

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
