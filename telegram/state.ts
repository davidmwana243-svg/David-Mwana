import { getDb } from '../server/firebase/index';

export type RegistrationStep = 'WAITING_FOR_CONTACT' | 'WAITING_FOR_LOCATION' | 'WAITING_FOR_ADDRESS' | 'REGISTERED';

export interface TelegramSession {
  step: RegistrationStep;
  firstName: string;
  lastName: string;
  username: string;
  language: string;
  phone?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  province?: string;
  city?: string;
  commune?: string;
  district?: string;
}

const SESSION_COLLECTION = 'telegram_sessions';

/**
 * Get or create session state for a user.
 */
export async function getSession(telegramId: string): Promise<TelegramSession | null> {
  try {
    const db = getDb();
    const docRef = db.collection(SESSION_COLLECTION).doc(telegramId);
    const snap = await docRef.get();
    if (snap.exists) {
      return snap.data() as TelegramSession;
    }
    return null;
  } catch (error) {
    console.error(`[SESSION] Error getting session for ${telegramId}:`, error);
    return null;
  }
}

/**
 * Save or update session state for a user.
 */
export async function saveSession(telegramId: string, session: Partial<TelegramSession>): Promise<void> {
  try {
    const db = getDb();
    const docRef = db.collection(SESSION_COLLECTION).doc(telegramId);
    await docRef.set(session, { merge: true });
  } catch (error) {
    console.error(`[SESSION] Error saving session for ${telegramId}:`, error);
  }
}

/**
 * Delete session state once registration is complete.
 */
export async function deleteSession(telegramId: string): Promise<void> {
  try {
    const db = getDb();
    await db.collection(SESSION_COLLECTION).doc(telegramId).delete();
  } catch (error) {
    console.error(`[SESSION] Error deleting session for ${telegramId}:`, error);
  }
}
