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
    
    // Listeners removed until a compatible implementation is decided.
  } catch (err) {
    console.error('[FCM-Server] Failed to setup push notification Firestore observers:', err);
  }
}
