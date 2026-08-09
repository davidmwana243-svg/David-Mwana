import { getDb } from '../server/firebase/index';
import { getUserByTelegramId } from './services';
import TelegramBot from 'node-telegram-bot-api';
import QRCode from 'qrcode';
import { handleSlashCommand } from './commands';
import { registerHandlers } from './handlers';
import { generateDeliveryQRPayload } from '../src/utils/deliveryCrypto';
import { 
  formatTelegramTrackingMessage, 
  getTelegramTrackingKeyboard, 
  getStepDetails 
} from '../src/utils/orderTracking';

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

    bot.setMyCommands([
      { command: 'start', description: 'Démarrer / ouvrir le menu principal' },
      { command: 'commandes', description: 'Consulter mon historique de commandes' },
      { command: 'admin', description: 'Panneau d administration (Admins)' },
      { command: 'admin_commandes', description: 'Gérer les commandes du magasin (Admins)' }
    ]).catch(err => console.warn('⚠️ Erreur setMyCommands:', err.message));

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

export function getBotInstance(): TelegramBot | null {
  return bot;
}

/**
 * Envoie ou met à jour en temps réel le message de suivi de commande sur Telegram
 */
export async function sendOrderStatusUpdate(telegramId: string, orderId: string, status: string, trackingNumber?: string) {
  if (!bot) return;

  try {
    const db = getDb();
    const orderRef = db.collection('orders').doc(orderId);
    const orderDoc = await orderRef.get();

    if (!orderDoc.exists) {
      console.warn(`[TG BOT] Order #${orderId} not found for notification.`);
      return;
    }

    const orderData: any = orderDoc.data() || {};
    orderData.id = orderData.id || orderId;
    orderData.status = status;

    if (trackingNumber) {
      orderData.trackingNumber = trackingNumber;
    }

    // Maintain statusHistory in Firestore
    const stepDetails = getStepDetails(status);
    const currentHistory = Array.isArray(orderData.statusHistory) ? orderData.statusHistory : [];
    const updatedHistory = [
      ...currentHistory,
      {
        status,
        label: stepDetails.title,
        timestamp: Date.now()
      }
    ];

    // Format modern message & keyboard
    const msgText = formatTelegramTrackingMessage(orderData);
    const keyboard = getTelegramTrackingKeyboard(orderData);

    let updatedExisting = false;

    // Try editing existing message in-place for seamless real-time tracking
    if (orderData.telegramMessageId && (orderData.telegramChatId || telegramId)) {
      const chatId = orderData.telegramChatId || telegramId;
      try {
        await bot.editMessageText(msgText, {
          chat_id: chatId,
          message_id: orderData.telegramMessageId,
          parse_mode: 'Markdown',
          reply_markup: keyboard
        });
        updatedExisting = true;
        console.log(`[TG BOT] Message de suivi mis à jour en direct pour #${orderId} (msgId: ${orderData.telegramMessageId})`);
      } catch (editErr: any) {
        console.warn(`[TG BOT] Échec de la modification du message existant, envoi d'un nouveau message:`, editErr?.message);
      }
    }

    // If message was not edited in place, send a new message
    if (!updatedExisting) {
      const sentMsg = await bot.sendMessage(telegramId, msgText, {
        parse_mode: 'Markdown',
        reply_markup: keyboard
      });

      // Save message details for future in-place real-time edits
      await orderRef.update({
        telegramMessageId: sentMsg.message_id,
        telegramChatId: telegramId,
        statusHistory: updatedHistory,
        updatedAt: Date.now()
      });
      console.log(`[TG BOT] Nouveau message de suivi envoyé pour #${orderId} (msgId: ${sentMsg.message_id})`);
    } else {
      await orderRef.update({
        statusHistory: updatedHistory,
        updatedAt: Date.now()
      });
    }

    // Record notification history
    const user = await getUserByTelegramId(telegramId);
    if (user) {
      await db.collection(NOTIFICATIONS_COL).add({
        userId: user.id,
        telegramId,
        type: `order_status_${status}`,
        message: msgText,
        status: 'sent',
        createdAt: Date.now(),
        sentAt: Date.now()
      });
    }

    // Trigger Client Evaluation Prompt if order is delivered / completed
    const normalized = (status || '').toLowerCase().trim();
    if (['delivered', 'completed', 'livree', 'livrée', 'livraison terminée', 'livraison terminee'].includes(normalized) || orderData.deliveryConfirmed) {
      await sendOrderReviewPrompt(telegramId, orderId);
    }

  } catch (err: any) {
    console.error(`[TG BOT] Erreur lors de l'envoi de la mise à jour de commande à ${telegramId}:`, err?.message || err);
  }
}

/**
 * Automatiquement déclenché après livraison terminée pour solliciter l'évaluation client
 */
export async function sendOrderReviewPrompt(telegramId: string, orderId: string) {
  if (!bot) return;

  try {
    const db = getDb();

    // Anti-duplication check: check if order is already reviewed
    const reviewDocRef = db.collection('reviews').doc(`rev_${orderId}`);
    const reviewDoc = await reviewDocRef.get();
    if (reviewDoc.exists) {
      console.log(`[TG BOT] Commande #${orderId} déjà évaluée. Skip review prompt.`);
      return;
    }

    const reviewsSnap = await db.collection('reviews').where('orderId', '==', orderId).limit(1).get();
    if (!reviewsSnap.empty) {
      console.log(`[TG BOT] Commande #${orderId} déjà évaluée via query. Skip review prompt.`);
      return;
    }

    // 1. Message de confirmation de livraison
    const confirmText = `🎉 *Livraison confirmée*\n\nMerci d'avoir choisi DAVIDSTORE ❤️`;
    await bot.sendMessage(telegramId, confirmText, { parse_mode: 'Markdown' });

    // 2. Message de demande d'évaluation
    const reviewPromptText = `⭐⭐⭐⭐⭐\n\n*Évaluez votre expérience*`;

    const reviewKeyboard = {
      inline_keyboard: [
        [{ text: '⭐⭐⭐⭐⭐ Excellent', callback_data: `rate_order_${orderId}_5` }],
        [{ text: '⭐⭐⭐⭐ Très bien', callback_data: `rate_order_${orderId}_4` }],
        [{ text: '⭐⭐⭐ Moyen', callback_data: `rate_order_${orderId}_3` }],
        [{ text: '⭐⭐ Correct', callback_data: `rate_order_${orderId}_2` }],
        [{ text: '⭐ Mauvais', callback_data: `rate_order_${orderId}_1` }]
      ]
    };

    await bot.sendMessage(telegramId, reviewPromptText, {
      parse_mode: 'Markdown',
      reply_markup: reviewKeyboard
    });

    console.log(`[TG BOT] Sollicitation d'évaluation envoyée à ${telegramId} pour la commande #${orderId}`);
  } catch (err: any) {
    console.error(`[TG BOT] Erreur envoi sollicitation d'évaluation pour #${orderId}:`, err?.message || err);
  }
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
