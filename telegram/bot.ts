import { getDb } from '../server/firebase/index';
import { getUserByTelegramId } from './services';
import TelegramBot from 'node-telegram-bot-api';
import QRCode from 'qrcode';
import { handleSlashCommand } from './commands';
import { registerHandlers } from './handlers';

let bot: TelegramBot | null = (global as any).telegramBot || null;
const NOTIFICATIONS_COL = 'notifications';

/**
 * Démarre le démon du Bot Telegram (Daemon Polling Client)
 */
export async function startTelegramBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn('⚠️ [TG BOT] TELEGRAM_BOT_TOKEN n\'est pas configurée dans l\'environnement. Le bot Telegram ne sera pas démarré.');
    return;
  }

  if (bot) {
    console.log('🔄 [TG BOT] Arrêt de l\'ancienne instance de polling...');
    try {
      await bot.stopPolling();
    } catch (e) {
      console.warn('⚠️ [TG BOT] Erreur lors de l\'arrêt de l\'ancienne instance:', e);
    }
  }

  try {
    bot = new TelegramBot(token, { polling: true });
    (global as any).telegramBot = bot;
    console.log('🚀 [TG BOT] Démon du Bot Telegram démarré avec succès.');

    // 1. Enregistre les commandes slash (/)
    bot.onText(/^\/([a-zA-Z0-9]+)/, async (msg, match) => {
      if (match && match[0]) {
        await handleSlashCommand(bot!, msg, match[0]);
      }
    });

    // 2. Enregistre les gestionnaires d'événements principaux (contact, location, messages, callback_query)
    registerHandlers(bot);

  } catch (err) {
    console.error('❌ [TG BOT] Échec de l\'initialisation de l\'API de polling du Bot :', err);
  }
}

/**
 * Envoie une notification Push de mise à jour du statut d'une commande
 */
export async function sendOrderStatusUpdate(telegramId: string, orderId: string, status: string, trackingNumber?: string) {
  if (!bot) return;
  
  let statusEmoji = '📦';
  let statusTextFr = status;

  if (status === 'shipped' || status === 'expedié' || status === 'expédiée') {
    statusEmoji = '🚚';
    statusTextFr = 'Expédiée / En livraison';

    try {
        const db = getDb();
        const orderDoc = await db.collection('orders').doc(orderId).get();
        const qrToken = orderDoc.exists ? (orderDoc.data()?.qrToken || orderId) : orderId;
        const deliveryPin = orderDoc.exists ? (orderDoc.data()?.deliveryPin || '123456') : '123456';

        // Generate QR code
        const qrCodeBuffer = await QRCode.toBuffer(qrToken);
        
        const msgText = `🚚 *Votre commande a été expédiée !*\n\n` +
          `Commande : *#${orderId}*\n\n` +
          `Votre colis est prêt à être livré.\n\n` +
          `*Code PIN :* \`${deliveryPin}\`\n\n` +
          `Vous pouvez :\n` +
          `- Présenter votre QR Code au livreur.\n` +
          `- Communiquer votre code PIN au livreur.\n` +
          `- Confirmer vous-même la réception de votre commande.\n`;

        await bot.sendPhoto(telegramId, qrCodeBuffer, {
            caption: msgText,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: '✅ Confirmer la réception', callback_data: `confirm_receipt_${orderId}` }]
              ]
            }
        });
        console.log(`[TG BOT] Notification d'expédition avec QR envoyée à l'ID Telegram ${telegramId}`);
        return;
    } catch (err) {
        console.error(`[TG BOT] Erreur lors de la génération du QR code:`, err);
    }
  } else if (status === 'delivered' || status === 'livrée') {
    statusEmoji = '✅';
    statusTextFr = 'Livrée avec succès !';
  } else if (status === 'cancelled' || status === 'annulée') {
    statusEmoji = '❌';
    statusTextFr = 'Annulée';
  } else if (status === 'processing' || status === 'en cours') {
    statusEmoji = '⏳';
    statusTextFr = 'En cours de préparation';
  }

  let msgText = `${statusEmoji} *Mise à jour de votre commande !*\n\n` +
    `Votre commande *#${orderId}* est passée au statut : *${statusTextFr}*.\n`;

  if (trackingNumber) {
    msgText += `\n🔗 *Numéro de suivi / Colis :* \`${trackingNumber}\``;
  }

  await sendTelegramNotification(telegramId, msgText, `status_update_${status}`);
}


/**
 * Envoie une notification d'état de paiement (Succès ou Échec) Shwary
 */
export async function sendTelegramNotification(
  telegramId: string,
  message: string,
  type: string,
  replyMarkup?: any
) {
  if (!bot) {
    console.warn(`[TG BOT] Notification ${type} ignorée: le bot n'est pas initialisé.`);
    return;
  }
  const db = getDb();
  
  try {
    const user = await getUserByTelegramId(telegramId);
    if (!user || user.notificationsEnabled === false) {
      console.log(`[TG BOT] Notification ignorée (disabled) pour ${telegramId}`);
      return;
    }

    await bot.sendMessage(telegramId, message, { parse_mode: 'Markdown', reply_markup: replyMarkup });
    
    await db.collection(NOTIFICATIONS_COL).add({
      userId: user.id,
      telegramId,
      type,
      message,
      status: 'sent',
      createdAt: Date.now(),
      sentAt: Date.now()
    });
    console.log(`[TG BOT] Notification ${type} envoyée à l'ID Telegram ${telegramId}`);
  } catch (err: any) {
    console.error(`[TG BOT] Échec de l'envoi de notification ${type} à l'ID Telegram ${telegramId}:`, err?.message || err);
    // Try to log failure even if sending failed
    const user = await getUserByTelegramId(telegramId);
    if (user) {
      await db.collection(NOTIFICATIONS_COL).add({
        userId: user.id,
        telegramId,
        type,
        message,
        status: 'failed',
        createdAt: Date.now(),
        error: String(err)
      });
    }
  }
}
