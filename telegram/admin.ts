import TelegramBot from 'node-telegram-bot-api';
import { getDb } from '../server/firebase/index';
import { formatPrice, formatDate } from './utils';
import { buildAdminOrderStatusKeyboard, adminKeyboard } from './keyboards';

const USERS_COL = 'users';
const ORDERS_COL = 'orders';
const PRODUCTS_COL = 'products';

/**
 * Affiche le panneau d'administration principal
 */
export async function showAdminPanel(bot: TelegramBot, chatId: number) {
  const adminWelcome = `⚙️ *PANNEAU D'ADMINISTRATION - DAVIDSTORE*\n\n` +
    `Bienvenue dans votre espace de gestion e-commerce. Utilisez le clavier ci-dessous ` +
    `pour piloter les commandes, consulter les statistiques de ventes et superviser l'inventaire.`;

  await bot.sendMessage(chatId, adminWelcome, {
    parse_mode: 'Markdown',
    reply_markup: adminKeyboard
  });
}

/**
 * Calcule et affiche les statistiques de ventes et clients
 */
export async function showGlobalStatistics(bot: TelegramBot, chatId: number) {
  try {
    const db = getDb();
    
    // Fetch users, orders, and products
    const usersSnap = await db.collection(USERS_COL).get();
    const ordersSnap = await db.collection(ORDERS_COL).get();
    const productsSnap = await db.collection(PRODUCTS_COL).get();

    const totalClients = usersSnap.size;
    const totalOrders = ordersSnap.size;
    
    // Compute revenues
    let totalRevenue = 0;
    let todayRevenue = 0;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTodayMs = startOfToday.getTime();

    const ordersList: any[] = [];
    ordersSnap.forEach(doc => {
      const data = doc.data();
      ordersList.push(data);
      if (data.status === 'delivered') {
        totalRevenue += (data.total || 0);
        if (data.createdAt >= startOfTodayMs) {
          todayRevenue += (data.total || 0);
        }
      }
    });

    // Compute top-selling products
    const productSales: Record<string, { name: string, count: number }> = {};
    ordersList.forEach(order => {
      if (order.status === 'delivered' && order.items) {
        order.items.forEach((item: any) => {
          const prodName = item.product?.name || 'Produit inconnu';
          const pId = item.productId || item.product?.id || 'unknown';
          const qty = item.quantity || 1;
          
          if (!productSales[pId]) {
            productSales[pId] = { name: prodName, count: 0 };
          }
          productSales[pId].count += qty;
        });
      }
    });

    const topSelling = Object.values(productSales)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    let topSellingText = '';
    if (topSelling.length > 0) {
      topSelling.forEach((p, idx) => {
        topSellingText += `   ${idx + 1}. *${p.name}* (${p.count} ventes)\n`;
      });
    } else {
      topSellingText = `   _Aucune vente pour le moment._\n`;
    }

    const statsText = `📊 *STATISTIQUES DE VENTE DAVIDSTORE*\n\n` +
      `• *Nombre total de clients* : ${totalClients}\n` +
      `• *Nombre total de commandes* : ${totalOrders}\n\n` +
      `💵 *Chiffre d'Affaires Global* : *${formatPrice(totalRevenue)}*\n` +
      `📅 *Ventes d'Aujourd'hui* : *${formatPrice(todayRevenue)}*\n\n` +
      `🔥 *Produits les plus vendus* :\n${topSellingText}`;

    await bot.sendMessage(chatId, statsText, { parse_mode: 'Markdown' });
  } catch (error: any) {
    console.error('[ADMIN] Error displaying stats:', error);
    await bot.sendMessage(chatId, `⚠️ Erreur lors du calcul des statistiques : ${error.message || error}`);
  }
}

/**
 * Affiche la liste des commandes récentes avec boutons d'action
 */
export async function showAdminOrders(bot: TelegramBot, chatId: number) {
  try {
    const db = getDb();
    const snap = await db.collection(ORDERS_COL)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    if (snap.empty) {
      await bot.sendMessage(chatId, "📦 Aucune commande enregistrée dans la base de données.");
      return;
    }

    await bot.sendMessage(chatId, "📦 *LES 10 DERNIÈRES COMMANDES* :\n_(Cliquez sur un bouton ci-dessous pour changer le statut)_", { parse_mode: 'Markdown' });

    for (const doc of snap.docs) {
      const o = doc.data();
      let statusFr = o.status;
      if (o.status === 'delivered') statusFr = 'Livrée';
      else if (o.status === 'cancelled') statusFr = 'Annulée';
      else if (o.status === 'shipped') statusFr = 'Expédiée';
      else if (o.status === 'processing') statusFr = 'En préparation';
      else if (o.status === 'payment_pending') statusFr = 'Paiement en attente';

      const detailText = `🛒 *Commande #${doc.id}*\n` +
        `• Client : ${o.userName || 'Anonyme'} (${o.userPhone || 'Sans tél'})\n` +
        `• Montant : *${formatPrice(o.total || 0)}*\n` +
        `• Adresse : ${o.shippingAddress || 'Non spécifiée'}\n` +
        `• Statut actuel : *${statusFr}*\n` +
        `• Date : ${formatDate(o.createdAt)}`;

      await bot.sendMessage(chatId, detailText, {
        parse_mode: 'Markdown',
        reply_markup: buildAdminOrderStatusKeyboard(doc.id)
      });
    }
  } catch (error: any) {
    console.error('[ADMIN] Error loading orders:', error);
    await bot.sendMessage(chatId, "⚠️ Erreur technique lors du chargement des commandes.");
  }
}

/**
 * Affiche la liste des utilisateurs enregistrés
 */
export async function showAdminUsers(bot: TelegramBot, chatId: number) {
  try {
    const db = getDb();
    const snap = await db.collection(USERS_COL).limit(20).get();

    if (snap.empty) {
      await bot.sendMessage(chatId, "👥 Aucun utilisateur enregistré.");
      return;
    }

    let userText = `👥 *LISTE DES UTILISATEURS (MAX 20) :*\n\n`;
    
    snap.forEach(doc => {
      const u = doc.data();
      userText += `• *${u.firstName || ''} ${u.lastName || ''}* (@${u.username || 'Aucun'})\n` +
        `  Tél : ${u.phone || 'Non partagé'} | Rôle : \`${u.role || 'client'}\`\n\n`;
    });

    await bot.sendMessage(chatId, userText, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[ADMIN] Error loading users:', err);
    await bot.sendMessage(chatId, "⚠️ Impossible de récupérer les utilisateurs.");
  }
}

/**
 * Affiche l'inventaire des produits
 */
export async function showAdminProducts(bot: TelegramBot, chatId: number) {
  try {
    const db = getDb();
    const snap = await db.collection(PRODUCTS_COL).get();

    if (snap.empty) {
      await bot.sendMessage(chatId, "🛍️ Aucun produit en catalogue.");
      return;
    }

    let pText = `🛍️ *ÉTAT DES STOCKS DE PRODUITS :*\n\n`;

    snap.forEach(doc => {
      const p = doc.data();
      const stockIndicator = p.stock > 5 ? '🟢' : p.stock > 0 ? '🟡' : '🔴';
      pText += `${stockIndicator} *${p.name}*\n` +
        `  Prix : ${formatPrice(p.price)} | Stock : *${p.stock || 0} pièces*\n\n`;
    });

    await bot.sendMessage(chatId, pText, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('[ADMIN] Error loading products:', err);
    await bot.sendMessage(chatId, "⚠️ Impossible de charger les stocks de produits.");
  }
}

/**
 * Relaye un message du support d'un client vers l'administrateur
 */
export async function routeSupportMessageToAdmin(bot: TelegramBot, userTelegramId: string, username: string, fullName: string, messageContent: string) {
  const adminIdsStr = process.env.TELEGRAM_ADMIN_IDS || '';
  const adminIds = adminIdsStr ? adminIdsStr.split(',').map(id => id.trim()) : ['437132868753']; // fallback ID
  
  const forwardText = `☎️ *NOUVEAU MESSAGE SUPPORT CLIENT*\n\n` +
    `• *Client* : ${fullName}\n` +
    `• *Username* : @${username || 'Aucun'}\n` +
    `• *Telegram ID* : \`${userTelegramId}\`\n\n` +
    `✉️ *Message* :\n"${messageContent}"\n\n` +
    `💡 _Pour répondre, répondez simplement (Reply) à ce message dans le chat._`;

  for (const adminId of adminIds) {
    try {
      await bot.sendMessage(adminId, forwardText, { parse_mode: 'Markdown' });
    } catch (err) {
      console.warn(`[SUPPORT] Could not notify admin ${adminId}:`, err);
    }
  }
}

/**
 * Traite la réponse de l'admin (en reply d'un message support) pour la renvoyer au client
 */
export async function handleAdminReplyToSupport(bot: TelegramBot, replyMsg: any) {
  const replyToText = replyMsg.reply_to_message?.text || '';
  
  // Parse user telegram ID using regex matching `Telegram ID : 12345`
  const match = replyToText.match(/Telegram ID\s*:\s*([0-9]+)/i);
  if (!match || !match[1]) return;

  const targetUserId = match[1];
  const adminResponse = replyMsg.text;

  try {
    const customerMessage = `💬 *RÉPONSE DU SUPPORT DAVIDSTORE :*\n\n` +
      `"${adminResponse}"\n\n` +
      `_Si vous avez d'autres questions, n'hésitez pas à écrire à nouveau._`;

    await bot.sendMessage(targetUserId, customerMessage, { parse_mode: 'Markdown' });
    await bot.sendMessage(replyMsg.chat.id, `✅ Message de réponse transmis avec succès à l'utilisateur ${targetUserId}.`);
  } catch (err: any) {
    console.error(`[ADMIN SUPPORT] Failed to send support reply to user ${targetUserId}:`, err?.message || err);
    await bot.sendMessage(replyMsg.chat.id, `❌ Échec de la transmission du message au client (l'utilisateur a peut-être bloqué le bot).`);
  }
}
