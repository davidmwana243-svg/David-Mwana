import { getDb } from '../firebase/index.js';

let cachedHostUrl = '';

/**
 * Persists the latest active host URL dynamically to Firestore if it changes.
 * This guarantees the correct domain is used for Shwary callbacks without manual configuration.
 */
export async function setLastKnownHostUrl(url: string) {
  if (!url || url.includes('localhost') || url.includes('127.0.0.1')) {
    return;
  }

  // Remove any trailing slash for consistency
  let cleanUrl = url.replace(/\/+$/, '');

  // Automatically convert development URLs (ais-dev-) to production/preview URLs (ais-pre-) only when in production mode
  if (process.env.NODE_ENV === 'production') {
    if (cleanUrl.includes('ais-dev-htongq6rmqzf7q2pg4r7vz-437132868753.europe-west2.run.app')) {
      cleanUrl = 'https://ais-pre-htongq6rmqzf7q2pg4r7vz-437132868753.europe-west2.run.app';
    } else if (cleanUrl.includes('ais-dev-')) {
      cleanUrl = cleanUrl.replace('ais-dev-', 'ais-pre-');
    }
  }

  if (cachedHostUrl === cleanUrl) {
    return;
  }

  cachedHostUrl = cleanUrl;
  console.log(`[HOST STORE] Updating last known host URL cache to: ${cleanUrl}`);

  try {
    const db = getDb();
    if (db) {
      await db.collection('settings').doc('system').set({
        lastKnownHostUrl: cleanUrl,
        updatedAt: Date.now()
      }, { merge: true });
    }
  } catch (err: any) {
    console.error('[HOST STORE] Failed to persist host URL to Firestore:', err?.message || err);
  }
}

/**
 * Retrieves the host URL to use for Shwary webhooks.
 * Prioritizes:
 * 1. process.env.APP_URL
 * 2. In-memory cached URL
 * 3. Firestore persisted settings URL
 * 4. Default fallback
 */
export async function getLastKnownHostUrl(): Promise<string> {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/+$/, '');
  }

  let url = '';

  if (cachedHostUrl) {
    url = cachedHostUrl;
  } else {
    try {
      const db = getDb();
      if (db) {
        const doc = await db.collection('settings').doc('system').get();
        if (doc.exists) {
          const data = doc.data();
          if (data && data.lastKnownHostUrl) {
            cachedHostUrl = data.lastKnownHostUrl;
            console.log(`[HOST STORE] Restored host URL from Firestore: ${cachedHostUrl}`);
            url = cachedHostUrl;
          }
        }
      }
    } catch (err: any) {
      console.warn('[HOST STORE] Could not fetch host URL from Firestore settings:', err?.message || err);
    }
  }

  if (url) {
    if (process.env.NODE_ENV === 'production') {
      if (url.includes('ais-dev-htongq6rmqzf7q2pg4r7vz-437132868753.europe-west2.run.app')) {
        return 'https://ais-pre-htongq6rmqzf7q2pg4r7vz-437132868753.europe-west2.run.app';
      } else if (url.includes('ais-dev-')) {
        return url.replace('ais-dev-', 'ais-pre-');
      }
    }
    return url;
  }

  return 'https://ais-pre-htongq6rmqzf7q2pg4r7vz-437132868753.europe-west2.run.app'; // Absolute fallback to production URL
}
