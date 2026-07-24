import admin from 'firebase-admin';
import { getDb } from '../firebase/index.js';

const serverStartTime = Date.now();

/**
 * Sends a multicast FCM notification to a list of tokens.
 * Automatically cleans up invalid and inactive tokens from Firestore to save resources.
 */
async function sendMulticastNotification(tokens: string[], title: string, body: string, data: Record<string, string>) {
  if (admin.apps.length === 0) {
    console.warn('[FCM-Server] Firebase Admin has not been initialized. Skipped pushing.');
    return;
  }

  try {
    const response = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title,
        body,
      },
      data,
    });

    console.log(`[FCM-Server] FCM Multicast Success: ${response.successCount}, Failures: ${response.failureCount}`);

    // Clean up stale or invalid tokens
    if (response.failureCount > 0) {
      const failedTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const errorCode = resp.error?.code;
          if (
            errorCode === 'messaging/invalid-registration-token' ||
            errorCode === 'messaging/registration-token-not-registered'
          ) {
            failedTokens.push(tokens[idx]);
          }
        }
      });

      if (failedTokens.length > 0) {
        try {
          const db = getDb();
          const batch = db.batch();
          failedTokens.forEach((token) => {
            batch.delete(db.collection('fcm_tokens').doc(token));
          });
          await batch.commit();
          console.log(`[FCM-Server] Successfully deleted ${failedTokens.length} expired FCM registration tokens.`);
        } catch (dbErr) {
          console.error('[FCM-Server] Error cleaning database tokens:', dbErr);
        }
      }
    }
  } catch (err) {
    console.error('[FCM-Server] Multicast dispatch error:', err);
  }
}

/**
 * Notifies all admins when a new order is received.
 */
async function notifyNewOrder(order: any) {
  try {
    const db = getDb();
    const tokensSnap = await db.collection('fcm_tokens').where('isAdmin', '==', true).get();
    const tokens = tokensSnap.docs
      .map((doc) => doc.data().token)
      .filter((t): t is string => typeof t === 'string' && t.length > 0);

    if (tokens.length === 0) {
      console.log('[FCM-Server] No administrators registered for FCM. Push skipped.');
      return;
    }

    const title = 'Nouvelle commande';
    const body = 'Le client a passé une nouvelle commande.';
    const data = {
      orderId: order.id || '',
      type: 'new_order',
    };

    console.log(`[FCM-Server] Notifying ${tokens.length} admins about new order`);
    await sendMulticastNotification(tokens, title, body, data);
  } catch (error) {
    console.error('[FCM-Server] Error triggering order notification:', error);
  }
}

/**
 * Notifies all registered devices (clients & guests) when a new product catalog item is released.
 */
async function notifyNewProduct(product: any) {
  try {
    const db = getDb();
    const tokensSnap = await db.collection('fcm_tokens').get();
    const tokens = tokensSnap.docs
      .map((doc) => doc.data().token)
      .filter((t): t is string => typeof t === 'string' && t.length > 0);

    if (tokens.length === 0) {
      console.log('[FCM-Server] No registered devices to send product release alerts.');
      return;
    }

    const title = 'Nouveau produit disponible';
    const body = 'Découvrez les nouveautés sur DavidSTORE.';
    const data = {
      productId: product.id || '',
      type: 'new_product',
    };

    console.log(`[FCM-Server] Notifying ${tokens.length} users about new product`);
    await sendMulticastNotification(tokens, title, body, data);
  } catch (error) {
    console.error('[FCM-Server] Error triggering product release notification:', error);
  }
}

/**
 * Mount snapshots on active collections to mimic real-time background Firebase Cloud Functions in the main thread of Express.
 */
export function startNotificationListeners() {
  try {
    const db = getDb();
    if (!db) {
      console.warn('[FCM-Server] firebase-admin Database is not setup. Skipping FCM listeners registration.');
      return;
    }

    console.log('[FCM-Server] Background Firestore observers for FCM push triggers are currently disabled to prevent SDK conflicts.');
    
    // Start our robust order status change real-time listener
    startOrderStatusListener();
  } catch (err) {
    console.error('[FCM-Server] Failed to setup push notification Firestore observers:', err);
  }
}

/**
 * Real-time listener for order status changes to trigger Telegram notifications automatically
 */
export function startOrderStatusListener() {
  try {
    const db = getDb();
    console.log('[FirestoreListener] Starting real-time listener for order status changes...');

    db.collection('orders').onSnapshot((snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added' || change.type === 'modified') {
          const orderId = change.doc.id;
          const orderData = change.doc.data();

          const status = orderData.status;
          const lastNotifiedStatus = orderData.lastNotifiedStatus;
          const updatedAt = orderData.updatedAt || orderData.createdAt || 0;

          if (!status) return;

          // 1. Ignore historical changes from before server startup to prevent spamming users on boot
          if (updatedAt < serverStartTime) {
            if (!lastNotifiedStatus) {
              try {
                await db.collection('orders').doc(orderId).update({ lastNotifiedStatus: status });
              } catch (err) {}
            }
            return;
          }

          // 2. Only trigger if status has changed
          if (status !== lastNotifiedStatus) {
            console.log(`[FirestoreListener] Order ${orderId} changed status to: ${status}`);

            // Skip payment_pending notification to avoid double alerts on creation
            if (status === 'payment_pending') {
              try {
                await db.collection('orders').doc(orderId).update({ lastNotifiedStatus: 'payment_pending' });
              } catch (err) {}
              return;
            }

            // Resolve Telegram ID
            let telegramId = '';
            const userId = orderData.userId || '';

            try {
              const userDoc = await db.collection('users').doc(userId).get();
              if (userDoc.exists) {
                telegramId = userDoc.data()?.telegramId || '';
              }
            } catch (err) {
              console.error(`[FirestoreListener] Error retrieving user profile for ${userId}:`, err);
            }

            if (!telegramId && userId.startsWith('tg_')) {
              telegramId = userId.replace('tg_', '');
            }

            // Generate security PIN and QR Token if missing and status is 'shipped'
            const updatePayload: any = {
              lastNotifiedStatus: status
            };

            if (status === 'shipped') {
              if (!orderData.qrToken) {
                updatePayload.qrToken = 'SECURE-TOK-' + Math.random().toString(36).substring(2, 10).toUpperCase();
              }
              if (!orderData.deliveryPin) {
                updatePayload.deliveryPin = Math.floor(100000 + Math.random() * 900000).toString();
              }
            }

            // Update database first to prevent trigger race conditions
            try {
              await db.collection('orders').doc(orderId).update(updatePayload);
            } catch (err) {
              console.error(`[FirestoreListener] Error updating order payload for ${orderId}:`, err);
            }

            // Notify via Telegram bot
            if (telegramId) {
              try {
                const { sendOrderStatusUpdate } = await import('../../telegram/bot');
                await sendOrderStatusUpdate(telegramId, orderId, status, orderData.trackingNumber);
                console.log(`[FirestoreListener] Notification dispatched to ${telegramId} for order ${orderId}`);
              } catch (tgErr) {
                console.error(`[FirestoreListener] Failed to dispatch Telegram notification:`, tgErr);
              }
            } else {
              console.log(`[FirestoreListener] No Telegram ID resolved for order ${orderId}; skipped notification.`);
            }
          }
        }
      });
    }, (error) => {
      console.error('[FirestoreListener] Error in order status real-time listener:', error);
    });
  } catch (err) {
    console.error('[FirestoreListener] Failed to initialize order status real-time listener:', err);
  }
}
