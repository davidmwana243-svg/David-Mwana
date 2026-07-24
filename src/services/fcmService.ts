import { getMessaging, getToken, onMessage, isSupported } from 'firebase/messaging';
import { doc, setDoc } from 'firebase/firestore';
import { db, app } from '../firebase';

// Web Push VAPID key is configurable via environment.
// Fallback to empty string
const VAPID_KEY = import.meta.env.VITE_FCM_VAPID_KEY || '';

/**
 * Checks if the browser supports push notifications.
 */
export const isPushSupported = async (): Promise<boolean> => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }
  try {
    return await isSupported();
  } catch (e) {
    return false;
  }
};

/**
 * Request notification permissions and register token.
 * Typically triggered immediately on landing or first interaction.
 */
export const requestNotificationPermission = async (userId: string, isAdmin: boolean): Promise<string | null> => {
  try {
    const supported = await isPushSupported();
    if (!supported) {
      console.warn('FCM Push Notifications are not supported in this browser/device.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted by user.');
      return await registerOrUpdateToken(userId, isAdmin);
    } else {
      console.warn('Notification permission was denied.');
      return null;
    }
  } catch (error) {
    console.error('Error requesting notification permission:', error);
    return null;
  }
};

/**
 * Automatically fetch token and register it under the user document in fcm_tokens collection.
 */
export const registerOrUpdateToken = async (userId: string | null, isAdmin: boolean): Promise<string | null> => {
  try {
    const supported = await isPushSupported();
    if (!supported) return null;

    if (Notification.permission !== 'granted') {
      console.log('FCM registration skipped: Permission not granted yet.');
      return null;
    }

    // Register active service worker
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js', {
      scope: '/'
    });
    
    // Ensure the service worker is active before getting the token
    await navigator.serviceWorker.ready;
    
    if (!VAPID_KEY) {
      console.log('FCM registration skipped: VITE_FCM_VAPID_KEY is not set.');
      return null;
    }
    
    const messaging = getMessaging(app);
    
    // Fetch unique registration token from FCM
    const token = await getToken(messaging, {
      serviceWorkerRegistration: registration,
      vapidKey: VAPID_KEY,
    });

    if (token) {
      console.log('FCM Registration Token:', token);
      
      // Store/Update token in Firestore collection 'fcm_tokens'
      const tokenRef = doc(db, 'fcm_tokens', token);
      await setDoc(tokenRef, {
        token,
        userId: userId || 'anonymous',
        isAdmin: !!isAdmin,
        updatedAt: Date.now()
      });
      
      console.log('FCM Token registered in Firestore.');
      
      // Setup foreground push notification handler
      onMessage(messaging, (payload) => {
        console.log('Received foreground dynamic FCM payload:', payload);
        // Show local browser notification or trigger in-app banner
        if (payload.notification) {
          const { title, body } = payload.notification;
          // Trigger a local in-app banner if they are looking at the screen
          const event = new CustomEvent('fcm-foreground-message', {
            detail: { title, body, payload }
          });
          window.dispatchEvent(event);
        }
      });

      return token;
    } else {
      console.warn('FCM token empty. Check VAPID key configuration or network blocks.');
      return null;
    }
  } catch (error) {
    console.error('FCM Token registration error, checking fallback...', error);
    return null;
  }
};
