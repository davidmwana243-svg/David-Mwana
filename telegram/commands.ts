import TelegramBot from 'node-telegram-bot-api';
import { getUserByTelegramId, saveTemporarySession, updateUserProfile } from './services';
import { contactKeyboard, mainKeyboard, buildMainKeyboard } from './keyboards';
import { getLastKnownHostUrl } from '../server/utils/hostStore';
import { isAdmin, requireRegistration } from './middlewares';
import { showOrders } from './menus';
import { 
  showAdminPanel, 
  showGlobalStatistics, 
  showAdminOrders, 
  showAdminUsers, 
  showAdminProducts 
} from './admin';

/**
 * Traitement des commandes d'administration et d'onboarding slash (/) du bot
 */
export async function handleSlashCommand(bot: TelegramBot, msg: any, command: string) {
  const chatId = msg.chat.id;
  const telegramId = msg.from?.id ? String(msg.from.id) : null;
  if (!telegramId) return;

  const normalizedCmd = command.trim().toLowerCase();

  switch (normalizedCmd) {
    case '/start':
      try {
        const user = await getUserByTelegramId(telegramId);
        const webAppUrl = await getLastKnownHostUrl();
        const userKeyboard = buildMainKeyboard(webAppUrl);

        if (user) {
          // Welcome back existing user
          // Ensure notifications are enabled
          if (user.notificationsEnabled !== true) {
            await updateUserProfile(user.id, { notificationsEnabled: true });
          }

          await bot.sendMessage(
            chatId,
            `👋 *Bon retour sur DAVIDSTORE, ${user.firstName || 'Ami'} !*\n\n` +
            `Explorez notre catalogue et profitez de notre service de livraison express.\n\n` +
            `ℹ️ *Besoin d'aide ?* Cliquez sur le bouton "Guide d'utilisation" dans le menu principal pour apprendre comment utiliser le bot.`,
            {
              parse_mode: 'Markdown',
              reply_markup: userKeyboard
            }
          );
        } else {
          // New registration session initiation
          const firstName = msg.from?.first_name || '';
          const lastName = msg.from?.last_name || '';
          const username = msg.from?.username || '';
          const language = msg.from?.language_code || 'fr';

          await saveTemporarySession(telegramId, {
            step: 'WAITING_FOR_CONTACT',
            firstName,
            lastName,
            username,
            language
          });

          await bot.sendMessage(
            chatId,
            `👋 *Bienvenue sur DAVIDSTORE !*\n\n` +
            `Pour créer votre compte client en moins d'une minute, veuillez cliquer sur le bouton ci-dessous afin de partager votre numéro de téléphone.`,
            {
              parse_mode: 'Markdown',
              reply_markup: contactKeyboard
            }
          );
        }
      } catch (err: any) {
        console.error('[COMMANDS] Error on /start:', err);
        await bot.sendMessage(chatId, "⚠️ Une erreur technique est survenue. Veuillez réessayer.");
      }
      break;

    case '/admin':
      if (await isAdmin(telegramId)) {
        await showAdminPanel(bot, chatId);
      } else {
        await bot.sendMessage(chatId, "❌ Accès refusé : Vous devez être administrateur pour utiliser cette commande.");
      }
      break;

    case '/statistiques':
      if (await isAdmin(telegramId)) {
        await showGlobalStatistics(bot, chatId);
      } else {
        await bot.sendMessage(chatId, "❌ Non autorisé.");
      }
      break;

    case '/commandes':
    case '/mescommandes':
    case '/orders':
      await showOrders(bot, chatId, telegramId);
      if (await isAdmin(telegramId)) {
        await bot.sendMessage(
          chatId,
          "💡 *Conseil Admin* : Pour administrer et modifier le statut de toutes les commandes du magasin, utilisez la commande /admin_commandes ou le panneau /admin.",
          { parse_mode: 'Markdown' }
        );
      }
      break;

    case '/admin_commandes':
      if (await isAdmin(telegramId)) {
        await showAdminOrders(bot, chatId);
      } else {
        await bot.sendMessage(chatId, "❌ Non autorisé : Vous devez être administrateur.");
      }
      break;

    case '/utilisateurs':
      if (await isAdmin(telegramId)) {
        await showAdminUsers(bot, chatId);
      } else {
        await bot.sendMessage(chatId, "❌ Non autorisé.");
      }
      break;

    case '/produits':
      if (await isAdmin(telegramId)) {
        await showAdminProducts(bot, chatId);
      } else {
        await bot.sendMessage(chatId, "❌ Non autorisé.");
      }
      break;

    default:
      await bot.sendMessage(chatId, "❓ Commande inconnue. Utilisez le menu interactif ou tapez /start.");
      break;
  }
}
