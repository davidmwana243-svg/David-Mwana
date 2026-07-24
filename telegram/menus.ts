import TelegramBot from 'node-telegram-bot-api';
import { 
  getCategories, 
  getProducts, 
  getProductById, 
  getCart, 
  getFavorites, 
  getOrders, 
  getUserByTelegramId,
  deleteOrders 
} from './services';
import { 
  mainKeyboard, 
  buildCategoriesKeyboard, 
  buildProductSelectionKeyboard,
  buildCartItemKeyboard, 
  buildFavoriteItemKeyboard, 
  addressSelectionKeyboard,
  adminKeyboard,
  buildMainKeyboard
} from './keyboards';
import { getLastKnownHostUrl } from '../server/utils/hostStore';
import { formatPrice, formatDate } from './utils';

// --- MENU PRINCIPAL ---

export async function showMainMenu(bot: TelegramBot, chatId: number, text?: string) {
  const welcomeText = text || `🏠 *Bienvenue sur le menu principal de DAVIDSTORE !*\n\n` +
    `Faites vos achats en toute confiance et payez directement via Mobile Money (Shwary).\n` +
    `Utilisez les boutons ci-dessous pour naviguer.`;

  const webAppUrl = await getLastKnownHostUrl();
  const dynamicKeyboard = buildMainKeyboard(webAppUrl);

  await bot.sendMessage(chatId, welcomeText, {
    parse_mode: 'Markdown',
    reply_markup: dynamicKeyboard
  });
}

// --- CATALOGUE ---

export async function showCatalogue(bot: TelegramBot, chatId: number) {
  try {
    const categories = await getCategories();
    if (categories.length === 0) {
      await bot.sendMessage(chatId, "🛍️ Notre catalogue de catégories est actuellement vide.");
      return;
    }

    const replyMarkup = buildCategoriesKeyboard(categories);
    await bot.sendMessage(
      chatId, 
      "🛍️ *CATALOGUE DAVIDSTORE*\n\nSélectionnez une catégorie ci-dessous pour parcourir les articles disponibles :", 
      {
        parse_mode: 'Markdown',
        reply_markup: replyMarkup
      }
    );
  } catch (error) {
    console.error('[MENU] Error showing catalogue:', error);
    await bot.sendMessage(chatId, "⚠️ Impossible de charger le catalogue pour le moment.");
  }
}

// --- PRODUITS D'UNE CATÉGORIE ---

export async function showCategoryProducts(bot: TelegramBot, chatId: number, categoryId: string) {
  try {
    const products = await getProducts(categoryId);
    if (products.length === 0) {
      await bot.sendMessage(chatId, " Aucun produit n'est disponible dans cette catégorie pour le moment.");
      return;
    }

    await bot.sendMessage(chatId, ` Produits trouvés : *${products.length}*. Chargement des fiches articles...`, { parse_mode: 'Markdown' });

    for (const p of products) {
      let text = `🔹 *${p.name}*\n\n` +
        `📝 _${p.description || 'Aucune description.'}_\n\n` +
        `💵 *Prix* : ${formatPrice(p.price)}\n` +
        `📦 *Stock disponible* : ${p.stock > 0 ? `${p.stock} pièces` : '⚠️ En rupture de stock'}`;

      if (p.sizes && p.sizes.length > 0) {
        text += `\n\n📏 *Tailles disponibles :*\n${p.sizes.join(' | ')}`;
      }

      if (p.colors && p.colors.length > 0) {
        text += `\n\n🎨 *Couleurs disponibles :*\n${p.colors.map((c: string) => `• ${c}`).join('\n')}`;
      }

      const replyMarkup = buildProductSelectionKeyboard(p.id, p.sizes, p.colors);

      // Send picture if available
      const imageToSend = p.imageUrl || (p.images && p.images[0]);
      if (imageToSend && imageToSend.startsWith('http')) {
        try {
          await bot.sendPhoto(chatId, imageToSend, {
            caption: text,
            parse_mode: 'Markdown',
            reply_markup: replyMarkup
          });
        } catch {
          // Fallback to text message if image fails to load
          await bot.sendMessage(chatId, text, {
            parse_mode: 'Markdown',
            reply_markup: replyMarkup
          });
        }
      } else {
        await bot.sendMessage(chatId, text, {
          parse_mode: 'Markdown',
          reply_markup: replyMarkup
        });
      }
    }
  } catch (error) {
    console.error('[MENU] Error showing products:', error);
    await bot.sendMessage(chatId, "⚠️ Erreur technique lors du chargement des produits.");
  }
}

// --- PANIER (CART) ---

export async function showCart(bot: TelegramBot, chatId: number, telegramId: string) {
  try {
    const cart = await getCart(telegramId);
    if (!cart.items || cart.items.length === 0) {
      await bot.sendMessage(
        chatId,
        "🛒 *Votre panier est actuellement vide.*\n\nExplorez notre 🛍️ Catalogue pour ajouter des articles.",
        { parse_mode: 'Markdown', reply_markup: mainKeyboard }
      );
      return;
    }

    let messageText = `🛒 *VOTRE PANIER DAVIDSTORE*\n\n`;
    
    for (let i = 0; i < cart.items.length; i++) {
      const item = cart.items[i];
      const prod = item.product;
      if (!prod) continue;

      messageText += `*${i + 1}. ${prod.name}*\n` +
        `   Quantité : ${item.quantity} x ${formatPrice(prod.price)}\n` +
        `   Sous-total : *${formatPrice(prod.price * item.quantity)}*\n\n`;
    }

    messageText += `━━━━━━━━━━━━━━━━━━━━━\n` +
      `Total articles : *${cart.count}*\n` +
      `📦 Total produits : *${formatPrice(cart.subtotal)}*\n` +
      `🚚 Frais de livraison : *${formatPrice(cart.deliveryFee)}*\n` +
      `💵 *TOTAL À PAYER* : *${formatPrice(cart.total)}*`;

    // Send first item's photo or custom icon with inline action keyboard
    await bot.sendMessage(chatId, messageText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '➕ Modifier les articles', callback_data: 'cart_edit_items' }
          ],
          [
            { text: `💳 Payer ${formatPrice(cart.total)}`, callback_data: 'cart_checkout' },
            { text: '🗑️ Vider le panier', callback_data: 'cart_clear' }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('[MENU] Error showing cart:', error);
    await bot.sendMessage(chatId, "⚠️ Erreur technique lors de la récupération de votre panier.");
  }
}

export async function showCartEditorList(bot: TelegramBot, chatId: number, telegramId: string) {
  try {
    const cart = await getCart(telegramId);
    if (!cart.items || cart.items.length === 0) {
      await bot.sendMessage(chatId, "Votre panier est vide.");
      return;
    }

    await bot.sendMessage(chatId, "🛠️ *Ajustement du panier :* Cliquez sur les boutons d'un article pour changer sa quantité.", { parse_mode: 'Markdown' });

    for (const item of cart.items) {
      const prod = item.product;
      if (!prod) continue;

      const itemText = `📦 *${prod.name}*\n` +
        `• Quantité actuelle : ${item.quantity}\n` +
        `• Prix unitaire : ${formatPrice(prod.price)}`;

      await bot.sendMessage(chatId, itemText, {
        parse_mode: 'Markdown',
        reply_markup: buildCartItemKeyboard(prod.id, item.quantity)
      });
    }
  } catch (err) {
    console.error('[MENU] Cart editor error:', err);
  }
}

// --- FAVORIS (FAVORITES) ---

export async function showFavorites(bot: TelegramBot, chatId: number, telegramId: string) {
  try {
    const favorites = await getFavorites(telegramId);
    if (favorites.length === 0) {
      await bot.sendMessage(
        chatId, 
        "❤️ *Vos favoris sont vides.*\n\nParcourez le catalogue et cliquez sur ❤️ pour enregistrer vos coups de coeur.",
        { parse_mode: 'Markdown' }
      );
      return;
    }

    await bot.sendMessage(chatId, `❤️ *VOS FAVORIS (${favorites.length}) :*`, { parse_mode: 'Markdown' });

    for (const p of favorites) {
      const text = `⭐ *${p.name}*\n` +
        `💵 Prix : *${formatPrice(p.price)}*\n` +
        `📦 Stock : ${p.stock > 0 ? 'Disponible' : '⚠️ Rupture'}`;

      await bot.sendMessage(chatId, text, {
        parse_mode: 'Markdown',
        reply_markup: buildFavoriteItemKeyboard(p.id)
      });
    }
  } catch (error) {
    console.error('[MENU] Error showing favorites:', error);
    await bot.sendMessage(chatId, "⚠️ Erreur technique lors du chargement de vos favoris.");
  }
}

// --- MON COMPTE (PROFILE) ---

export async function showAccount(bot: TelegramBot, chatId: number, telegramId: string) {
  try {
    const user = await getUserByTelegramId(telegramId);
    if (!user) {
      await bot.sendMessage(chatId, "Profil introuvable. Tapez /start pour vous inscrire.");
      return;
    }

    const orders = await getOrders(user.telegramId);
    const totalSpent = orders
      .filter(o => o.status === 'delivered')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const addressToDisplay = (user.addresses && user.addresses.length > 0) ? user.addresses[0] : null;
    const addressLine = addressToDisplay ? addressToDisplay.addressLines : (user.address || 'Aucune');
    const cityProvince = addressToDisplay ? `${addressToDisplay.city || ''} / ${addressToDisplay.country || ''}` : `${user.city || ''} (${user.province || ''})`;
    const country = addressToDisplay ? addressToDisplay.country : (user.country || '');

    const profileText = `👤 *VOTRE COMPTE DAVIDSTORE*\n\n` +
      `• *Nom* : ${user.firstName || ''} ${user.lastName || ''}\n` +
      `• *Nom d'utilisateur* : @${user.username || 'Aucun'}\n` +
      `• *Téléphone* : \`${user.phone || 'Non configuré'}\`\n` +
      `• *Adresse enregistrée* : ${addressLine}\n` +
      `• *Ville / Province* : ${cityProvince}\n` +
      `• *Pays* : ${country}\n` +
      `• *Commandes passées* : ${orders.length}\n` +
      `• *Chiffre d'affaires livré* : *${formatPrice(totalSpent)}*\n\n` +
      `🔔 *Notifications Telegram :* ${user.notificationsEnabled ? '✅ Activées' : '🔕 Désactivées'}\n\n` +
      `⚙️ _Vous pouvez modifier vos informations de livraison à tout moment en cliquant sur les boutons ci-dessous._`;

    await bot.sendMessage(chatId, profileText, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: user.notificationsEnabled ? '🔕 Désactiver les notifs' : '🔔 Activer les notifs', callback_data: 'toggle_notifications' }
          ],
          [
            { text: '📱 Modifier le téléphone', callback_data: 'edit_profile_phone' },
            { text: '🏠 Modifier l\'adresse', callback_data: 'edit_profile_address' }
          ],
          [
            { text: '📍 Mettre à jour la localisation', callback_data: 'edit_profile_location' }
          ]
        ]
      }
    });
  } catch (error) {
    console.error('[MENU] Error showing account:', error);
    await bot.sendMessage(chatId, "⚠️ Erreur technique lors du chargement de votre profil.");
  }
}

// --- MES COMMANDES ---

export async function showOrders(bot: TelegramBot, chatId: number, telegramId: string) {
  try {
    const user = await getUserByTelegramId(telegramId);
    console.log(`showOrders DEBUG: User: ${JSON.stringify(user)}`);
    if (!user) return;

    const orders = await getOrders(telegramId);
    console.log(`showOrders DEBUG: Found ${orders.length} orders for telegramId ${telegramId}`);
    if (orders.length === 0) {
      await bot.sendMessage(chatId, "📦 *Vous n'avez pas encore passé de commande.*", { parse_mode: 'Markdown' });
      return;
    }

    let text = `📦 *HISTORIQUE DES COMMANDES (${orders.length})*\n\n`;
    const inlineKeyboard: any[][] = [];

    for (const o of orders) {
      let statusFr = o.status;
      let emoji = '📦';
      if (o.status === 'delivered') { statusFr = 'Livrée'; emoji = '✅'; }
      else if (o.status === 'cancelled') { statusFr = 'Annulée'; emoji = '❌'; }
      else if (o.status === 'shipped') { 
        statusFr = 'Expédiée'; 
        emoji = '🚚'; 
        inlineKeyboard.push([{ text: `✅ Confirmer la réception #${o.id}`, callback_data: `confirm_receipt_${o.id}` }]);
      }
      else if (o.status === 'processing') { statusFr = 'En préparation'; emoji = '⚙️'; }
      else if (o.status === 'payment_pending') { statusFr = 'Paiement en attente'; emoji = '⏳'; }

      text += `${emoji} *Commande #${o.id}*\n` +
        `• Date : ${formatDate(o.createdAt)}\n` +
        `• Total : *${formatPrice(o.total)}*\n` +
        `• Statut : *${statusFr}*\n\n`;
    }

    // Always append the clear history button
    inlineKeyboard.push([{ text: '🗑️ Supprimer l\'historique', callback_data: 'delete_orders' }]);

    await bot.sendMessage(chatId, text, { 
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    });
  } catch (error) {
    console.error('[MENU] Error showing orders:', error);
    await bot.sendMessage(chatId, "⚠️ Erreur lors du chargement de vos commandes.");
  }
}

// --- SUPPORT INFO ---

export async function showSupportInfo(bot: TelegramBot, chatId: number) {
  const supportText = `☎️ *SUPPORT CLIENT DAVIDSTORE*\n\n` +
    `Besoin d'aide, d'une assistance pour un produit ou d'un remboursement ?\n\n` +
    `💬 *Vous pouvez écrire directement votre message d'assistance ci-dessous.* ` +
    `Votre message sera automatiquement transmis à nos gestionnaires administratifs, et nous vous répondrons directement ici-même.\n\n` +
    `💡 _Vous pouvez aussi nous contacter à tout moment sur Telegram : @davidmwana_`;

  await bot.sendMessage(chatId, supportText, { parse_mode: 'Markdown' });
}
