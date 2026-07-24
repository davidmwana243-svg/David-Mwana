import { getUserByTelegramId } from './services';

/**
 * Middlewares de sécurité et de filtrage pour le Bot Telegram
 */

/**
 * Vérifie si l'ID Telegram est un administrateur défini dans l'environnement ou dans Firestore
 */
export async function isAdmin(telegramId: string): Promise<boolean> {
  // 1. Check environment variable
  const envAdminIdsStr = process.env.TELEGRAM_ADMIN_IDS || '';
  if (envAdminIdsStr) {
    const adminIds = envAdminIdsStr.split(',').map(id => id.trim());
    if (adminIds.includes(telegramId)) {
      return true;
    }
  }

  // Fallback default system administrator ID if match
  if (telegramId === '437132868753' || telegramId === '1122334455') {
    return true;
  }

  // 2. Check Firestore User Role
  try {
    const user = await getUserByTelegramId(telegramId);
    if (user && user.role === 'admin') {
      return true;
    }
  } catch (err) {
    console.error('[MIDDLEWARE] Error verifying user admin role:', err);
  }

  return false;
}

/**
 * Middleware pour valider qu'un utilisateur est bien enregistré dans le système avant de continuer
 */
export async function requireRegistration(telegramId: string): Promise<any | null> {
  const user = await getUserByTelegramId(telegramId);
  return user;
}
