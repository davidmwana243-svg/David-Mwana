import TelegramBot from 'node-telegram-bot-api';
import QRCode from 'qrcode';
import { 
  getTemporarySession, 
  saveTemporarySession, 
  deleteTemporarySession,
  getUserByTelegramId,
  createUserProfile,
  updateUserProfile,
  getProductById,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  addToFavorites,
  removeFromFavorites,
  createOrder,
  getCart,
  deleteOrders,
  updateOrderStatus
} from './services';
import { 
  formatTelegramTrackingMessage, 
  getTelegramTrackingKeyboard 
} from '../src/utils/orderTracking';
import { generateDeliveryQRPayload } from '../src/utils/deliveryCrypto';
import { getDb } from '../server/firebase/index';
import { 
  contactKeyboard, 
  locationKeyboard, 
  mainKeyboard, 
  addressSelectionKeyboard,
  buildProductSelectionKeyboard 
} from './keyboards';
import { 
  reverseGeocode, 
  formatPrice, 
  isValidDRCPhone, 
  sanitizeDRCPhone 
} from './utils';

async function verifyCartStockInDB(items: any[]): Promise<{ valid: boolean; outOfStockItem?: { name: string; requested: number; available: number } }> {
  try {
    const db = getDb();
    for (const item of items) {
      const prodId = item.productId || item.product?.id || item.id;
      if (!prodId) continue;
      const snap = await db.collection('products').doc(prodId).get();
      if (snap.exists) {
        const prodData = snap.data();
        const availableStock = typeof prodData?.stock === 'number' ? prodData.stock : 999;
        const requestedQty = item.quantity || 1;
        if (requestedQty > availableStock) {
          return {
            valid: false,
            outOfStockItem: {
              name: prodData?.name || item.product?.name || 'Produit',
              requested: requestedQty,
              available: availableStock
            }
          };
        }
      }
    }
  } catch (e) {
    console.error('[STOCK CHECK] Error checking stock in DB:', e);
  }
  return { valid: true };
}
import { 
  showCatalogue, 
  showCategoryProducts, 
  showCart, 
  showCartEditorList, 
  showFavorites, 
  showAccount, 
  showOrders, 
  showSupportInfo,
  showMainMenu
} from './menus';
import { 
  isAdmin, 
  requireRegistration 
} from './middlewares';
import { 
  routeSupportMessageToAdmin, 
  handleAdminReplyToSupport,
  showAdminPanel,
  showGlobalStatistics,
  showAdminOrders,
  showAdminUsers,
  showAdminProducts,
  notifyAdminsOfNewReview
} from './admin';
import { processShwaryPayment } from '../server/controllers/paymentController';

/**
 * Configure les gestionnaires d'événements principaux du bot
 */
export function registerHandlers(bot: TelegramBot) {
  
  // 1. ÉVÉNEMENT : CONTACT (Numéro de téléphone)
  bot.on('contact', async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id ? String(msg.from.id) : null;
    const contact = msg.contact;

    if (!telegramId || !contact) return;

    try {
      // Security Check: Verify shared contact matches the sending user
      if (String(contact.user_id) !== telegramId) {
        await bot.sendMessage(
          chatId,
          `⚠️ *Sécurité :* Veuillez partager votre propre contact de profil en cliquant sur le bouton officiel ci-dessous.`,
          { parse_mode: 'Markdown', reply_markup: contactKeyboard }
        );
        return;
      }

      const session = await getTemporarySession(telegramId);
      
      if (session && session.step === 'WAITING_FOR_CONTACT') {
        await saveTemporarySession(telegramId, {
          phone: contact.phone_number,
          step: 'WAITING_FOR_LOCATION'
        });

        await bot.sendMessage(
          chatId,
          `👍 *Numéro de téléphone enregistré.* \n\nMaintenant, veuillez partager votre localisation géographique pour configurer la livraison standard :`,
          {
            parse_mode: 'Markdown',
            reply_markup: locationKeyboard
          }
        );
      } else {
        // Not in registration but shared contact (e.g., profile update)
        const user = await getUserByTelegramId(telegramId);
        if (user) {
          await updateUserProfile(user.id, { phone: contact.phone_number });
          await bot.sendMessage(chatId, `✅ *Numéro de téléphone mis à jour :* \`${contact.phone_number}\``, {
            parse_mode: 'Markdown',
            reply_markup: mainKeyboard
          });
          await showAccount(bot, chatId, telegramId);
        } else {
          await bot.sendMessage(chatId, "Veuillez taper /start pour débuter l'inscription.");
        }
      }
    } catch (err) {
      console.error('[HANDLERS] Error processing contact:', err);
    }
  });

  // 2. ÉVÉNEMENT : LOCALISATION (Géolocalisation)
  bot.on('location', async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id ? String(msg.from.id) : null;
    const location = msg.location;

    if (!telegramId || !location) return;

    try {
      const session = await getTemporarySession(telegramId);
      const user = await getUserByTelegramId(telegramId);

      const { latitude, longitude } = location;
      const statusMsg = await bot.sendMessage(chatId, "⏳ *Analyse de votre position en cours...*", { parse_mode: 'Markdown' });
      const addressDetails = await reverseGeocode(latitude, longitude);
      await bot.deleteMessage(chatId, statusMsg.message_id).catch(() => {});

      if (session && session.step === 'WAITING_FOR_LOCATION') {
        // Normal registration onboarding flow
        await saveTemporarySession(telegramId, {
          latitude,
          longitude,
          ...addressDetails,
          step: 'WAITING_FOR_ADDRESS'
        });

        await bot.sendMessage(
          chatId,
          `📍 *Zone détectée* : ${addressDetails.district}, ${addressDetails.commune}, ${addressDetails.city}, ${addressDetails.province}\n\n` +
          `🏠 *Dernière étape :* Saisissez et envoyez par message votre adresse résidentielle exacte.\n\n` +
          `_Exemple : Avenue Lumumba N°25, Quartier Golf, Lubumbashi_`,
          {
            parse_mode: 'Markdown',
            reply_markup: { remove_keyboard: true }
          }
        );
      } else if (session && session.step === 'CHECKOUT_WAITING_LOCATION') {
        // Live checkout update location
        await saveTemporarySession(telegramId, {
          latitude,
          longitude,
          ...addressDetails,
          step: 'CHECKOUT_WAITING_ADDRESS_TEXT'
        });

        await bot.sendMessage(chatId, `📍 Localisation validée. Saisissez maintenant l'adresse complète de livraison par message textuel :`);
      } else if (user) {
        // Normal profile location update
        await updateUserProfile(user.id, {
          latitude,
          longitude,
          ...addressDetails
        });

        await bot.sendMessage(
          chatId,
          `✅ *Votre géolocalisation de profil a été mise à jour !*\n` +
          `Zone : ${addressDetails.district}, ${addressDetails.commune}, ${addressDetails.city}`,
          {
            parse_mode: 'Markdown',
            reply_markup: mainKeyboard
          }
        );
        await showAccount(bot, chatId, telegramId);
      } else {
        await bot.sendMessage(chatId, "Veuillez taper /start pour commencer.");
      }
    } catch (err) {
      console.error('[HANDLERS] Error processing location:', err);
    }
  });

  // 3. ÉVÉNEMENT : MESSAGE TEXTE GÉNÉRAL
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const telegramId = msg.from?.id ? String(msg.from.id) : null;
    const text = msg.text;

    if (!telegramId || !text) return;

    // Ignore commands starting with "/"
    if (text.startsWith('/')) return;

    // List of official navigation and menu buttons that should instantly reset state wizard/flows
    const MENU_BUTTONS = [
      '🛍️ Ouvrir DAVIDSTORE',
      '🛍️ Catalogue',
      '🛒 Mon panier',
      '📦 Mes commandes',
      '❤️ Favoris',
      '👤 Mon compte',
      '📍 Mes adresses',
      '🔔 Notifications',
      '☎️ Support',
      '📊 Statistiques Globales',
      '📦 Liste des Commandes',
      '👥 Liste des Utilisateurs',
      '🛍️ Liste des Produits',
      '🏠 Retour au Menu Client'
    ];

    const isMenuButtonClick = MENU_BUTTONS.includes(text);
    if (isMenuButtonClick) {
      try {
        await deleteTemporarySession(telegramId);
      } catch (err) {
        console.error('[HANDLERS] Error resetting session on menu button click:', err);
      }
    }

    try {
      // 3.1 Check if reply is to support message by an administrator
      if (msg.reply_to_message && await isAdmin(telegramId)) {
        await handleAdminReplyToSupport(bot, msg);
        return;
      }

      const session = isMenuButtonClick ? null : await getTemporarySession(telegramId);
      const user = await getUserByTelegramId(telegramId);

      // 3.2 REGISTRATION FLOW: Address creation input
      if (session && session.step === 'WAITING_FOR_ADDRESS') {
        const newUserProfile = {
          telegramId: telegramId,
          firstName: session.firstName || msg.from?.first_name || '',
          lastName: session.lastName || msg.from?.last_name || '',
          username: session.username || msg.from?.username || '',
          languageCode: session.language || 'fr',
          phone: session.phone || '',
          latitude: session.latitude || 0,
          longitude: session.longitude || 0,
          country: session.country || 'Congo-Kinshasa (RDC)',
          province: session.province || 'Haut-Katanga',
          city: session.city || 'Lubumbashi',
          commune: session.commune || '',
          district: session.district || '',
          address: text,
          role: 'customer',
          status: 'active'
        };

        await createUserProfile(newUserProfile);
        await deleteTemporarySession(telegramId);

        await bot.sendMessage(
          chatId,
          `✅ *Votre compte DAVIDSTORE a été créé avec succès !*\n\nExplorez notre catalogue et profitez de l'expérience d'achat sur Telegram.`,
          {
            parse_mode: 'Markdown',
            reply_markup: mainKeyboard
          }
        );
        return;
      }

      // 3.2.1 REVIEW COMMENT INPUT FLOW
      if (session && session.step === 'WAITING_REVIEW_COMMENT') {
        const orderId = session.reviewOrderId;
        const commentText = text.trim();

        const db = getDb();
        const reviewRef = db.collection('reviews').doc(`rev_${orderId}`);
        const reviewDoc = await reviewRef.get();

        let reviewData: any;

        if (reviewDoc.exists) {
          await reviewRef.update({
            comment: commentText,
            updatedAt: Date.now()
          });
          reviewData = { ...reviewDoc.data(), comment: commentText };
        } else {
          reviewData = {
            reviewId: `rev_${orderId}`,
            orderId,
            userId: user?.id || `tg_${telegramId}`,
            telegramId,
            customerName: (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') || 'Client DAVIDSTORE',
            rating: 5,
            comment: commentText,
            createdAt: Date.now()
          };
          await reviewRef.set(reviewData);
        }

        await deleteTemporarySession(telegramId);

        await bot.sendMessage(
          chatId,
          `❤️ *Merci pour votre avis !*\n\nVotre commentaire a été enregistré avec succès. Merci d'avoir fait confiance à DAVIDSTORE !`,
          {
            parse_mode: 'Markdown',
            reply_markup: mainKeyboard
          }
        );

        try {
          await notifyAdminsOfNewReview(bot, reviewData);
        } catch (err) {
          console.error('[HANDLERS] Error notifying admins of new review comment:', err);
        }
        return;
      }

      // 3.3 PROFILE EDIT FLOWS
      if (session && session.step === 'EDITING_PHONE') {
        if (!isValidDRCPhone(text)) {
          await bot.sendMessage(chatId, `❌ *Format invalide.* Entrez un numéro congolais valide (ex: 082XXXXXXX, 099XXXXXXX, etc.) :`, { parse_mode: 'Markdown' });
          return;
        }

        const formatted = sanitizeDRCPhone(text);
        await updateUserProfile(`tg_${telegramId}`, { phone: formatted });
        await deleteTemporarySession(telegramId);

        await bot.sendMessage(chatId, `✅ Numéro de téléphone modifié avec succès : \`${formatted}\``, { parse_mode: 'Markdown', reply_markup: mainKeyboard });
        await showAccount(bot, chatId, telegramId);
        return;
      }

      if (session && session.step === 'EDITING_ADDRESS') {
        await updateUserProfile(`tg_${telegramId}`, { address: text });
        await deleteTemporarySession(telegramId);

        await bot.sendMessage(chatId, `✅ Adresse de livraison modifiée avec succès : \n"${text}"`, { reply_markup: mainKeyboard });
        await showAccount(bot, chatId, telegramId);
        return;
      }

      // 3.4 CHECKOUT FLOW TEXT INPUTS
      if (session && session.step === 'CHECKOUT_CHOOSE_ADDRESS_ROUTE') {
        if (text === '🏠 Utiliser mon adresse enregistrée') {
          const addressToDisplay = (user?.addresses && user.addresses.length > 0) ? user.addresses[0] : null;
          if (!user || (!user.address && !addressToDisplay)) {
            await bot.sendMessage(chatId, "⚠️ Vous n'avez pas d'adresse pré-enregistrée. Veuillez en saisir une nouvelle.");
            return;
          }

          const addressData = addressToDisplay || {
            addressLines: user.address,
            city: user.city || 'Lubumbashi',
            district: user.district || '',
            commune: user.commune || '',
            province: user.province || 'Haut-Katanga',
            country: user.country || 'RDC',
            latitude: user.latitude || 0,
            longitude: user.longitude || 0,
          };

          await saveTemporarySession(telegramId, {
            address: addressData.addressLines || addressData.address || user.address || '',
            city: addressData.city || user.city || 'Lubumbashi',
            district: addressData.district || user.district || 'Golf',
            commune: addressData.commune || user.commune || 'Lubumbashi',
            province: addressData.province || user.province || 'Haut-Katanga',
            country: addressData.country || user.country || 'RDC',
            latitude: addressData.latitude || user.latitude || 0,
            longitude: addressData.longitude || user.longitude || 0,
            step: 'CHECKOUT_WAITING_PHONE'
          });

          await bot.sendMessage(chatId, `📱 Entrez votre numéro Mobile Money pour finaliser le paiement💰💰(ex: 082xxxxxxx ou 097xxxxxxx) :`, {
            reply_markup: { remove_keyboard: true }
          });
          return;
        } 
        else if (text === '📝 Modifier mon adresse') {
          await saveTemporarySession(telegramId, {
            step: 'CHECKOUT_WAITING_ADDRESS_TEXT'
          });
          await bot.sendMessage(chatId, `🏠 Saisissez votre adresse complète de livraison :`, {
            reply_markup: { remove_keyboard: true }
          });
          return;
        } 
        else if (text === '📍 Partager une nouvelle localisation') {
          await saveTemporarySession(telegramId, {
            step: 'CHECKOUT_WAITING_LOCATION'
          });
          await bot.sendMessage(chatId, `📍 Partagez votre position actuelle avec le bouton ci-dessous :`, {
            reply_markup: locationKeyboard
          });
          return;
        }
        else if (text === '⬅️ Retour') {
          await deleteTemporarySession(telegramId);
          await showCart(bot, chatId, telegramId);
          return;
        }
      }

      if (session && session.step === 'CHECKOUT_WAITING_ADDRESS_TEXT') {
        // Merge text address details with geocoded ones
        await saveTemporarySession(telegramId, {
          address: text,
          step: 'CHECKOUT_WAITING_PHONE'
        });

        await bot.sendMessage(chatId, `📱 Entrez votre numéro Mobile Money pour finaliser le paiement💰💰(ex: 082xxxxxxx ou 097xxxxxxx) :`);
        return;
      }

      if (session && session.step === 'CHECKOUT_WAITING_PHONE') {
        if (!isValidDRCPhone(text)) {
          await bot.sendMessage(chatId, `❌ Numéro invalide. Réessayez :`);
          return;
        }

        const formattedPhone = sanitizeDRCPhone(text);
        const cart = await getCart(telegramId);

        // 0. Stock validation
        const stockCheck = await verifyCartStockInDB(cart.items);
        if (!stockCheck.valid && stockCheck.outOfStockItem) {
          const item = stockCheck.outOfStockItem;
          await bot.sendMessage(
            chatId,
            `⚠️ *Impossible de continuer*\n\n` +
            `Le produit "*${item.name}*" n'est plus disponible dans cette quantité.\n\n` +
            `📌 *Stock disponible :* ${item.available} pièce(s)\n` +
            `📌 *Quantité demandée :* ${item.requested} pièce(s)\n\n` +
            `Veuillez modifier la quantité dans votre panier pour continuer.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }
        
        // Build address line
        const shippingAddress = session.address || `${session.district}, ${session.commune}, ${session.city}`;

        const loadingMessage = await bot.sendMessage(chatId, "⏳ Génération de votre commande...\n\n🛒 Préparation du panier...\n\n💳 Création du lien de paiement...\n\n🔐 Connexion sécurisée au service de paiement...");
        
        // Send 'typing' action periodically for 4 seconds
        for (let i = 0; i < 4; i++) {
          await bot.sendChatAction(chatId, 'typing');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }

        const orderId = await createOrder(telegramId, {
          userId: `tg_${telegramId}`,
          userName: `${user.firstName} ${user.lastName}`,
          userPhone: formattedPhone,
          items: cart.items,
          total: cart.total,
          shippingAddress,
          shippingAddressObj: {
            country: session.country || user.country || 'RDC',
            city: session.city || user.city || 'Lubumbashi',
            addressLines: shippingAddress,
            phone: formattedPhone
          },
          deliveryFee: 3000,
          paymentMethod: 'Shwary Mobile Money',
          status: 'payment_pending'
        });

        // Notification: Nouvelle commande
        const { sendTelegramNotification } = await import('./bot');
        await sendTelegramNotification(
          telegramId,
          `📦 *Nouvelle commande créée !*\n\nCommande : *#${orderId}*\n\n💰 Montant : *${formatPrice(cart.total)}* CDF\n\n📌 Statut : _En attente de paiement_\n\nMerci pour votre commande chez DAVIDSTORE.`,
          'new_order'
        );

        // Trigger Shwary payment transaction
        try {
          // Empty live cart
          await clearCart(telegramId);
          await deleteTemporarySession(telegramId);

          // Retrieve the dynamic host URL from our host store
          const { getLastKnownHostUrl } = await import('../server/utils/hostStore');
          const appUrl = await getLastKnownHostUrl();
          await processShwaryPayment(cart.total, formattedPhone, orderId, appUrl);
          
          // Delete the loading message
          await bot.deleteMessage(chatId, loadingMessage.message_id);

          await bot.sendMessage(
            chatId,
            `📦 Commande #${orderId} créée !\n\n` +
            `💰 Montant : *${formatPrice(cart.total)}* CDF\n` +
            `📱 Numéro de débit : \`${formattedPhone}\`\n\n` +
            `⏳ Un message pop-up de validation de transaction USSD Mobile Money a été envoyé sur votre téléphone.\n\n` +
            `Veuillez valider la demande et confirmer votre code PIN Mobile Money pour finaliser votre commande.`,
            { parse_mode: 'Markdown', reply_markup: mainKeyboard }
          );
        } catch (paymentErr: any) {
          // Attempt to delete loading message even if payment fails
          await bot.deleteMessage(chatId, loadingMessage.message_id).catch(() => {});
          console.error('[HANDLERS] Checkout payment trigger failed:', paymentErr);
          await bot.sendMessage(
            chatId,
            `❌ *Échec du paiement :* ${paymentErr.message || paymentErr}\n\n` +
            `Votre commande #${orderId} reste en attente de paiement. Vous pouvez contacter le support en cas de souci.`,
            { parse_mode: 'Markdown', reply_markup: mainKeyboard }
          );
        }
        return;
      }

      // 3.5 CLIENT MENU BUTTONS
      switch (text) {
        case '🛍️ Catalogue':
          await showCatalogue(bot, chatId);
          break;

        case '🛒 Mon panier':
          await showCart(bot, chatId, telegramId);
          break;

        case '📦 Mes commandes':
          await showOrders(bot, chatId, telegramId);
          break;

        case '❤️ Favoris':
          await showFavorites(bot, chatId, telegramId);
          break;

        case '👤 Mon compte':
          await showAccount(bot, chatId, telegramId);
          break;

        case '📍 Mes adresses':
          if (user) {
            const addressToDisplay = (user.addresses && user.addresses.length > 0) ? user.addresses[0] : null;
            if (addressToDisplay) {
              await bot.sendMessage(chatId, `📍 *VOS COORDONNÉES DE LIVRAISON :*\n\n• Adresse exacte : ${addressToDisplay.addressLines || 'Non renseignée'}\n• Ville/Pays : ${addressToDisplay.city || ''} / ${addressToDisplay.country || ''}`, { parse_mode: 'Markdown' });
            } else {
              await bot.sendMessage(chatId, `📍 *VOS COORDONNÉES DE LIVRAISON :*\n\n• Adresse exacte : ${user.address || 'Non renseignée'}\n• Ville / Province : ${user.city || ''} (${user.province || ''})\n• Pays : ${user.country || ''}`, { parse_mode: 'Markdown' });
            }
          } else {
            await bot.sendMessage(chatId, "Veuillez vous inscrire d'abord.");
          }
          break;

        case '🔔 Notifications':
          await bot.sendMessage(chatId, "🔔 *Préférences de Notifications :*\n\nVos alertes de commande et de paiement sont connectées et actives en direct sur ce canal de discussion Telegram.", { parse_mode: 'Markdown' });
          break;

        case '☎️ Support':
          await showSupportInfo(bot, chatId);
          break;

        case 'ℹ️ Guide d\'utilisation':
          await bot.sendMessage(chatId, `ℹ️ *GUIDE D'UTILISATION DAVIDSTORE*\n\n` +
            `Bienvenue ! Voici comment utiliser notre service :\n\n` +
            `1. *Parcourir les produits* : Cliquez sur "🛍️ Catalogue" pour voir nos articles.\n` +
            `2. *Commander* : Ajoutez des articles à votre "🛒 Panier", puis validez.\n` +
            `3. *Suivi* : Consultez "📦 Mes commandes" pour voir le statut de vos achats.\n` +
            `4. *Support* : Cliquez sur "☎️ Support" pour nous écrire directement.\n\n` +
            `Si vous avez des questions, nous sommes là pour vous aider !`, { parse_mode: 'Markdown' });
          break;

        // --- ADMIN COMMANDS (TEXT REPLICAS) ---
        case '📊 Statistiques Globales':
          if (await isAdmin(telegramId)) await showGlobalStatistics(bot, chatId);
          break;

        case '📦 Liste des Commandes':
          if (await isAdmin(telegramId)) await showAdminOrders(bot, chatId);
          break;

        case '👥 Liste des Utilisateurs':
          if (await isAdmin(telegramId)) await showAdminUsers(bot, chatId);
          break;

        case '🛍️ Liste des Produits':
          if (await isAdmin(telegramId)) await showAdminProducts(bot, chatId);
          break;

        case '🏠 Retour au Menu Client':
          await showMainMenu(bot, chatId, "Retour au menu principal client.");
          break;

        default:
          // Treat unstructured text as support message forward
          if (user) {
            const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || msg.from?.first_name || 'Client';
            await routeSupportMessageToAdmin(bot, telegramId, msg.from?.username || '', fullName, text);
          } else {
            await bot.sendMessage(chatId, "Bonjour ! Pour acheter des produits ou configurer votre profil, veuillez taper /start.");
          }
          break;
      }
    } catch (err) {
      console.error('[HANDLERS] Error handling text message:', err);
    }
  });

  // 4. ÉVÉNEMENT : CALLBACK QUERY (Boutons Inline)
  bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id;
    const telegramId = query.from?.id ? String(query.from.id) : null;
    const data = query.data;

    if (!chatId || !telegramId || !data) return;

    try {
      const user = await getUserByTelegramId(telegramId);

      // 4.1 Click Category -> Show Category Products
      if (data.startsWith('cat_')) {
        const catId = data.replace('cat_', '');
        await showCategoryProducts(bot, chatId, catId);
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // 4.2 Click Add product to cart
      if (data.startsWith('add_cart_')) {
        const parts = data.split('_');
        const prodId = parts[2];
        const size = parts[3] === 'none' ? undefined : parts[3];
        const color = parts[4] === 'none' ? undefined : parts[4];
        
        const product = await getProductById(prodId);
        if (!product || (product.stock !== undefined && Number(product.stock) <= 0)) {
          await bot.answerCallbackQuery(query.id, { text: '⚠️ Désolé, cet article n\'est plus disponible en stock.', show_alert: true });
          return;
        }

        console.log(`DEBUG: Adding to cart: prodId=${prodId}, size=${size}, color=${color}`);
        await addToCart(telegramId, prodId, 1, size, color);
        const cart = await getCart(telegramId);
        
        await bot.sendMessage(chatId, `🛍️ *Article ajouté au panier !*\n\n` +
          `📦 Total produits : *${formatPrice(cart.subtotal)}*\n` +
          `🚚 Frais de livraison : *${formatPrice(cart.deliveryFee)}*\n` +
          `💵 *TOTAL : ${formatPrice(cart.total)}*`, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [
                { text: `💳 Payer ${formatPrice(cart.total)}`, callback_data: 'cart_checkout' },
                { text: '🛍️ Continuer les achats', callback_data: 'view_catalogue' }
              ]
            ]
          }
        });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // 4.1.1 Select Size
      if (data.startsWith('select_size_')) {
        const parts = data.split('_');
        const prodId = parts[2];
        const size = parts[3];
        const color = parts[4] === 'none' ? undefined : parts[4];
        
        const p = await getProductById(prodId);
        if (p) {
          const keyboard = buildProductSelectionKeyboard(p.id, p.sizes, p.colors, size, color);
          await bot.editMessageReplyMarkup(keyboard, {
            chat_id: chatId,
            message_id: query.message!.message_id
          });
        }
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // 4.1.2 Select Color
      if (data.startsWith('select_color_')) {
        const parts = data.split('_');
        const prodId = parts[2];
        const size = parts[3] === 'none' ? undefined : parts[3];
        const color = parts[4];
        
        const p = await getProductById(prodId);
        if (p) {
          const keyboard = buildProductSelectionKeyboard(p.id, p.sizes, p.colors, size, color);
          await bot.editMessageReplyMarkup(keyboard, {
            chat_id: chatId,
            message_id: query.message!.message_id
          });
        }
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // 4.3 Click Add product to favorites
      if (data.startsWith('add_fav_')) {
        const prodId = data.replace('add_fav_', '');
        await addToFavorites(telegramId, prodId);
        await bot.answerCallbackQuery(query.id, { text: '❤️ Article ajouté aux favoris !' });
        return;
      }

      // 4.4 Click Remove product from favorites
      if (data.startsWith('remove_fav_')) {
        const prodId = data.replace('remove_fav_', '');
        await removeFromFavorites(telegramId, prodId);
        await bot.answerCallbackQuery(query.id, { text: '💔 Retiré de vos favoris.' });
        // Refresh favorites display list
        await showFavorites(bot, chatId, telegramId);
        return;
      }

      // 4.5 Navigate back to category catalog list
      if (data === 'view_catalogue') {
        await showCatalogue(bot, chatId);
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // 4.8 Clear order history
      if (data === 'delete_orders') {
        await bot.sendChatAction(chatId, 'typing');
        await deleteOrders(telegramId);
        await bot.answerCallbackQuery(query.id, { text: '🗑️ Historique supprimé' });
        // Refresh orders view
        await showOrders(bot, chatId, telegramId);
        return;
      }

      // 4.12 Confirm receipt
      if (data.startsWith('confirm_receipt_yes_')) {
        const orderId = data.replace('confirm_receipt_yes_', '');
        const db = getDb();
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
           await bot.answerCallbackQuery(query.id, { text: "Commande introuvable.", show_alert: true });
           return;
        }

        const orderData = orderDoc.data() || {};
        if (orderData.deliveryConfirmed || orderData.status === 'delivered' || orderData.status === 'cancelled') {
           await bot.answerCallbackQuery(query.id, { text: "Cette commande a déjà été traitée ou n'est plus valide.", show_alert: true });
           if (query.message) {
               await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: query.message.message_id });
           }
           return;
        }

        const now = Date.now();
        await updateOrderStatus(orderId, 'delivered');
        await db.collection('orders').doc(orderId).update({
            deliveryConfirmed: true,
            deliveryConfirmedAt: now,
            deliveredAt: now,
            deliveryConfirmedBy: `telegram_${telegramId}`,
            deliveryConfirmationMethod: 'telegram'
        });

        if (query.message) {
           await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: query.message.message_id });
        }

        await bot.answerCallbackQuery(query.id, { text: '✅ Réception confirmée !' });
        await bot.sendMessage(chatId, `🎉 *Commande livrée avec succès !*\n\nCommande : *#${orderId}*\n\nMerci d'avoir choisi DAVIDSTORE.`, { parse_mode: 'Markdown' });
        return;
      }

      if (data.startsWith('confirm_receipt_no_')) {
        const orderId = data.replace('confirm_receipt_no_', '');
        if (query.message) {
            await bot.deleteMessage(chatId, query.message.message_id);
        }
        await bot.answerCallbackQuery(query.id, { text: 'Confirmation annulée.' });
        return;
      }

      if (data.startsWith('confirm_receipt_')) {
        const orderId = data.replace('confirm_receipt_', '');
        const db = getDb();
        const orderDoc = await db.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
           await bot.answerCallbackQuery(query.id, { text: "Commande introuvable.", show_alert: true });
           return;
        }

        const orderData = orderDoc.data() || {};
        if (orderData.deliveryConfirmed || orderData.status === 'delivered' || orderData.status === 'cancelled') {
           await bot.answerCallbackQuery(query.id, { text: "Cette commande a déjà été livrée ou annulée.", show_alert: true });
           if (query.message) {
               await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: query.message.message_id });
           }
           return;
        }

        await bot.sendMessage(chatId, `Êtes-vous certain d'avoir reçu votre commande ?\n\nCommande : *#${orderId}*`, {
           parse_mode: 'Markdown',
           reply_markup: {
              inline_keyboard: [
                 [{ text: 'Oui, confirmer', callback_data: `confirm_receipt_yes_${orderId}` }],
                 [{ text: 'Annuler', callback_data: `confirm_receipt_no_${orderId}` }]
              ]
           }
        });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // 4.13 Live Order Tracking: Track / Refresh
      if (data.startsWith('track_order_') || data.startsWith('refresh_order_')) {
        const orderId = data.replace('track_order_', '').replace('refresh_order_', '');
        const db = getDb();
        const orderDoc = await db.collection('orders').doc(orderId).get();

        if (!orderDoc.exists) {
          await bot.answerCallbackQuery(query.id, { text: 'Commande introuvable.', show_alert: true });
          return;
        }

        const orderData = { id: orderDoc.id, ...orderDoc.data() };
        const msgText = formatTelegramTrackingMessage(orderData);
        const keyboard = getTelegramTrackingKeyboard(orderData);

        if (query.message) {
          try {
            await bot.editMessageText(msgText, {
              chat_id: chatId,
              message_id: query.message.message_id,
              parse_mode: 'Markdown',
              reply_markup: keyboard
            });
          } catch (e) {
            // Message might be unchanged or edit failed, send fresh message
            await bot.sendMessage(chatId, msgText, { parse_mode: 'Markdown', reply_markup: keyboard });
          }
        } else {
          await bot.sendMessage(chatId, msgText, { parse_mode: 'Markdown', reply_markup: keyboard });
        }

        await bot.answerCallbackQuery(query.id, { text: '🔄 Suivi de commande actualisé !' });
        return;
      }

      // 4.14 View Order Details
      if (data.startsWith('view_order_details_')) {
        const orderId = data.replace('view_order_details_', '');
        const db = getDb();
        const orderDoc = await db.collection('orders').doc(orderId).get();

        if (!orderDoc.exists) {
          await bot.answerCallbackQuery(query.id, { text: 'Commande introuvable.', show_alert: true });
          return;
        }

        const orderData: any = orderDoc.data();
        const items = orderData.items || [];
        
        let detailsText = `📦 *Détails de la Commande #${orderId.slice(-8).toUpperCase()}*\n\n`;
        
        items.forEach((item: any, idx: number) => {
          const name = item.product?.name || item.name || 'Article';
          const qty = item.quantity || 1;
          const price = item.product?.price || item.price || 0;
          const sizeStr = item.selectedSize ? ` (Taille: ${item.selectedSize})` : '';
          detailsText += `${idx + 1}. *${name}*${sizeStr}\n   Quantité: x${qty} • ${(price * qty).toLocaleString()} FC\n`;
        });

        const total = orderData.total || 0;
        detailsText += `\n*Montant Total :* ${total.toLocaleString()} FC\n`;
        
        if (orderData.shippingAddress) {
          detailsText += `📍 *Adresse de livraison :*\n${orderData.shippingAddress}\n`;
        }

        detailsText += `\n👤 *Client :* ${orderData.userName || 'Client DavidSTORE'} (${orderData.userPhone || 'Téléphone non spécifié'})`;

        await bot.sendMessage(chatId, detailsText, { parse_mode: 'Markdown' });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // 4.15 Display HD QR Code for Delivery
      if (data.startsWith('show_qr_')) {
        const orderId = data.replace('show_qr_', '');
        const db = getDb();
        const orderDoc = await db.collection('orders').doc(orderId).get();

        if (!orderDoc.exists) {
          await bot.answerCallbackQuery(query.id, { text: 'Commande introuvable.', show_alert: true });
          return;
        }

        const orderData: any = { id: orderDoc.id, ...orderDoc.data() };
        const { payloadObj, jsonString } = generateDeliveryQRPayload(orderData, orderData.driverId || '', orderData.userId || '');
        const deliveryPin = payloadObj.secureToken;

        // Persist generated security tokens to Firestore immediately
        await db.collection('orders').doc(orderId).update({
          secureToken: deliveryPin,
          qrToken: deliveryPin,
          deliveryPin: deliveryPin,
          signature: payloadObj.signature,
          expiresAt: payloadObj.expiresAt,
          updatedAt: Date.now()
        });

        // High definition QR Code with crisp, large module grid for instant camera scanning
        const qrBuffer = await QRCode.toBuffer(jsonString, {
          width: 1024,
          margin: 4,
          errorCorrectionLevel: 'M',
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          }
        });

        const caption = `📱 *Pass de Livraison HD DavidSTORE*\n\n` +
          `Commande : *#${orderId}*\n` +
          `Code PIN : \`${deliveryPin}\`\n\n` +
          `Présentez ce QR Code au livreur lors de la livraison de votre colis.`;

        await bot.sendPhoto(chatId, qrBuffer, {
          caption,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Confirmer la réception', callback_data: `confirm_receipt_${orderId}` }]
            ]
          }
        });
        await bot.answerCallbackQuery(query.id, { text: '📱 QR Code HD généré !' });
        return;
      }

      // 4.16 Display PIN Code for Delivery
      if (data.startsWith('show_pin_')) {
        const orderId = data.replace('show_pin_', '');
        const db = getDb();
        const orderDoc = await db.collection('orders').doc(orderId).get();

        if (!orderDoc.exists) {
          await bot.answerCallbackQuery(query.id, { text: 'Commande introuvable.', show_alert: true });
          return;
        }

        const orderData: any = { id: orderDoc.id, ...orderDoc.data() };
        let pin = orderData.deliveryPin || orderData.secureToken;

        if (!pin) {
          const { payloadObj } = generateDeliveryQRPayload(orderData, orderData.driverId || '', orderData.userId || '');
          pin = payloadObj.secureToken;
          await db.collection('orders').doc(orderId).update({
            secureToken: pin,
            qrToken: pin,
            deliveryPin: pin,
            signature: payloadObj.signature,
            expiresAt: payloadObj.expiresAt,
            updatedAt: Date.now()
          });
        }

        await bot.sendMessage(chatId, `🔐 *Code PIN de Confirmation de Livraison*\n\nCommande : *#${orderId}*\n\nCode PIN : \`${pin}\`\n\nCommuniquez ce code au livreur pour valider la réception de votre colis.`, { parse_mode: 'Markdown' });
        await bot.answerCallbackQuery(query.id, { text: `🔐 Code PIN : ${pin}`, show_alert: true });
        return;
      }

      // 4.17 Support Assistance
      if (data.startsWith('support_order_')) {
        const orderId = data.replace('support_order_', '');
        await bot.sendMessage(chatId, `📞 *Support Client DAVIDSTORE*\n\nPour toute assistance concernant votre commande *#${orderId}*, vous pouvez :\n\n- Téléphoner au : *+243 97 123 45 67*\n- Contacter le service client sur WhatsApp / Telegram : *@DavidStoreSupport*\n\nNos agents sont disponibles 24h/24 pour vous assister.`, { parse_mode: 'Markdown' });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // 4.18 CLIENT REVIEW EVALUATION HANDLERS
      if (data.startsWith('rate_order_')) {
        const parts = data.replace('rate_order_', '').split('_');
        const rating = parseInt(parts[parts.length - 1], 10);
        const orderId = parts.slice(0, parts.length - 1).join('_');

        const db = getDb();

        // Anti-duplication check: orderId + userId
        const reviewRef = db.collection('reviews').doc(`rev_${orderId}`);
        const existingDoc = await reviewRef.get();

        if (existingDoc.exists) {
          await bot.answerCallbackQuery(query.id, {
            text: '⚠️ Vous avez déjà évalué cette commande. Merci !',
            show_alert: true
          });
          return;
        }

        const querySnap = await db.collection('reviews').where('orderId', '==', orderId).get();
        if (!querySnap.empty) {
          await bot.answerCallbackQuery(query.id, {
            text: '⚠️ Vous avez déjà évalué cette commande. Merci !',
            show_alert: true
          });
          return;
        }

        // Fetch order details
        const orderDoc = await db.collection('orders').doc(orderId).get();
        const orderData: any = orderDoc.exists ? orderDoc.data() : {};
        const user = await getUserByTelegramId(telegramId);

        const customerName = orderData.userName ||
          (user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : '') ||
          user?.username ||
          'Client DAVIDSTORE';

        const reviewId = `rev_${orderId}`;
        const newReviewData = {
          reviewId,
          orderId,
          userId: orderData.userId || user?.id || `tg_${telegramId}`,
          telegramId,
          customerName,
          rating,
          comment: '',
          createdAt: Date.now()
        };

        await reviewRef.set(newReviewData);

        const starsStr = '⭐'.repeat(Math.min(5, Math.max(1, rating)));
        const commentPromptText = `💬 *Voulez-vous laisser un commentaire ?*\n\n` +
          `Note attribuée : ${starsStr} (${rating}/5)\n\n` +
          `Partagez votre expérience pour nous aider à améliorer nos services.`;

        const commentKeyboard = {
          inline_keyboard: [
            [{ text: '✍️ Ajouter un commentaire', callback_data: `comment_order_${orderId}` }],
            [{ text: '⏭ Ignorer', callback_data: `skip_comment_${orderId}` }]
          ]
        };

        if (query.message) {
          try {
            await bot.editMessageText(commentPromptText, {
              chat_id: chatId,
              message_id: query.message.message_id,
              parse_mode: 'Markdown',
              reply_markup: commentKeyboard
            });
          } catch (e) {
            await bot.sendMessage(chatId, commentPromptText, { parse_mode: 'Markdown', reply_markup: commentKeyboard });
          }
        } else {
          await bot.sendMessage(chatId, commentPromptText, { parse_mode: 'Markdown', reply_markup: commentKeyboard });
        }

        await bot.answerCallbackQuery(query.id, { text: `Note enregistrée : ${starsStr}` });
        return;
      }

      if (data.startsWith('skip_comment_')) {
        const orderId = data.replace('skip_comment_', '');
        const db = getDb();

        const thankYouMsg = `❤️ *Merci pour votre évaluation !*\n\nVotre avis a été enregistré avec succès. Merci d'avoir fait confiance à DAVIDSTORE !`;

        if (query.message) {
          try {
            await bot.editMessageText(thankYouMsg, {
              chat_id: chatId,
              message_id: query.message.message_id,
              parse_mode: 'Markdown'
            });
          } catch (e) {
            await bot.sendMessage(chatId, thankYouMsg, { parse_mode: 'Markdown' });
          }
        } else {
          await bot.sendMessage(chatId, thankYouMsg, { parse_mode: 'Markdown' });
        }

        await bot.answerCallbackQuery(query.id, { text: 'Évaluation enregistrée !' });

        try {
          const revDoc = await db.collection('reviews').doc(`rev_${orderId}`).get();
          if (revDoc.exists) {
            await notifyAdminsOfNewReview(bot, revDoc.data());
          }
        } catch (err) {
          console.error('[HANDLERS] Error notifying admins on skip comment:', err);
        }
        return;
      }

      if (data.startsWith('comment_order_')) {
        const orderId = data.replace('comment_order_', '');

        await saveTemporarySession(telegramId, {
          step: 'WAITING_REVIEW_COMMENT',
          reviewOrderId: orderId
        });

        const promptMsg = `✍️ *Saisissez votre commentaire :*\n\nÉcrivez votre avis ci-dessous...`;

        await bot.sendMessage(chatId, promptMsg, {
          parse_mode: 'Markdown'
        });

        await bot.answerCallbackQuery(query.id);
        return;
      }

      // 4.6 Edit cart item quantities list view
      if (data === 'cart_edit_items') {
        await showCartEditorList(bot, chatId, telegramId);
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // 4.7 Increment / Decrement quantity inside editor
      if (data.startsWith('cart_incr_')) {
        const prodId = data.replace('cart_incr_', '');
        await updateCartItemQuantity(telegramId, prodId, 1);
        await bot.answerCallbackQuery(query.id, { text: '➕ Quantité augmentée (+1)' });
        
        // Delete original and re-draw updated cart view
        await bot.deleteMessage(chatId, query.message!.message_id).catch(() => {});
        await showCart(bot, chatId, telegramId);
        return;
      }

      if (data.startsWith('cart_decr_')) {
        const prodId = data.replace('cart_decr_', '');
        await updateCartItemQuantity(telegramId, prodId, -1);
        await bot.answerCallbackQuery(query.id, { text: '➖ Quantité diminuée (-1)' });
        
        await bot.deleteMessage(chatId, query.message!.message_id).catch(() => {});
        await showCart(bot, chatId, telegramId);
        return;
      }

      if (data.startsWith('cart_remove_')) {
        await bot.sendChatAction(chatId, 'typing');
        const prodId = data.replace('cart_remove_', '');
        await removeFromCart(telegramId, prodId);
        await bot.answerCallbackQuery(query.id, { text: '❌ Article retiré du panier.' });
        
        await bot.deleteMessage(chatId, query.message!.message_id).catch(() => {});
        await showCart(bot, chatId, telegramId);
        return;
      }

      // 4.8 Clear all items in cart
      if (data === 'cart_clear') {
        await bot.sendChatAction(chatId, 'typing');
        await clearCart(telegramId);
        await bot.answerCallbackQuery(query.id, { text: '🗑️ Panier entièrement vidé.' });
        await bot.deleteMessage(chatId, query.message!.message_id).catch(() => {});
        await showCart(bot, chatId, telegramId);
        return;
      }

      // 4.9 Cart checkout trigger with quantity & variants specification
      if (data === 'cart_checkout') {
        if (!user) {
          await bot.sendMessage(chatId, "Inscrivez-vous pour passer une commande.");
          await bot.answerCallbackQuery(query.id);
          return;
        }

        const cart = await getCart(telegramId);
        if (!cart.items || cart.items.length === 0) {
          await bot.answerCallbackQuery(query.id, { text: '⚠️ Votre panier est vide.' });
          return;
        }

        let summaryMsg = `🛒 *RÉCAPITULATIF DE VOTRE COMMANDE*\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n\n`;

        for (let i = 0; i < cart.items.length; i++) {
          const item = cart.items[i];
          const prod = item.product;
          if (!prod) continue;
          summaryMsg += `📦 *Produit ${i + 1}*\n` +
            `*Nom :* ${prod.name}\n`;

          const variants: string[] = [];
          if (item.selectedColor) variants.push(`Couleur : ${item.selectedColor}`);
          if (item.selectedSize) variants.push(`Taille : ${item.selectedSize}`);
          if (variants.length > 0) {
            summaryMsg += `*Variante :* ${variants.join(' | ')}\n`;
          }

          summaryMsg += `*Quantité :* ${item.quantity} pièce${item.quantity > 1 ? 's' : ''}\n` +
            `*Prix unitaire :* ${formatPrice(prod.price)}\n` +
            `*Sous-total :* ${formatPrice(prod.price * item.quantity)}\n\n`;
        }

        summaryMsg += `━━━━━━━━━━━━━━━━━━━━━\n` +
          `💰 *RÉSUMÉ DU PAIEMENT*\n` +
          `• Produits : ${formatPrice(cart.subtotal)}\n` +
          `• Livraison : ${cart.deliveryFee > 0 ? formatPrice(cart.deliveryFee) : 'Gratuite (LIVRAISON EXPRESS)'}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━━\n` +
          `💵 *TOTAL À PAYER :* *${formatPrice(cart.total)}*\n\n` +
          `👇 Veuillez valider votre commande ci-dessous :`;

        await bot.deleteMessage(chatId, query.message!.message_id).catch(() => {});
        await bot.sendMessage(
          chatId,
          summaryMsg,
          {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  { text: '✅ Confirmer & payer', callback_data: 'confirm_pieces_checkout' }
                ],
                [
                  { text: '✏️ Modifier', callback_data: 'cart_edit_items' },
                  { text: '❌ Annuler', callback_data: 'checkout_cancel' }
                ],
                [
                  { text: '📍 Modifier l\'adresse', callback_data: 'checkout_change_address' }
                ]
              ]
            }
          }
        );
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // 4.9.1 Cancel checkout
      if (data === 'checkout_cancel') {
        await deleteTemporarySession(telegramId);
        await bot.answerCallbackQuery(query.id, { text: '❌ Commande annulée.' });
        await bot.deleteMessage(chatId, query.message!.message_id).catch(() => {});
        await showCart(bot, chatId, telegramId);
        return;
      }

      // 4.9.2 Change address trigger
      if (data === 'checkout_change_address') {
        await saveTemporarySession(telegramId, { step: 'CHECKOUT_CHOOSE_ADDRESS_ROUTE' });
        await bot.answerCallbackQuery(query.id);
        await bot.deleteMessage(chatId, query.message!.message_id).catch(() => {});
        await bot.sendMessage(
          chatId,
          `📍 *MODIFICATION DE L'ADRESSE DE LIVRAISON*\n\nChoisissez ou entrez une nouvelle adresse :`,
          {
            parse_mode: 'Markdown',
            reply_markup: addressSelectionKeyboard
          }
        );
        return;
      }

      // 4.9.3 Confirmation of product pieces & stock validation -> Proceed to address/payment
      if (data === 'confirm_pieces_checkout') {
        const cart = await getCart(telegramId);
        if (!cart.items || cart.items.length === 0) {
          await bot.answerCallbackQuery(query.id, { text: '⚠️ Votre panier est vide.' });
          return;
        }

        // Verify stock in DB before proceeding
        const stockCheck = await verifyCartStockInDB(cart.items);
        if (!stockCheck.valid && stockCheck.outOfStockItem) {
          const item = stockCheck.outOfStockItem;
          await bot.answerCallbackQuery(query.id, { text: '⚠️ Rupture de stock !', show_alert: true });
          await bot.sendMessage(
            chatId,
            `⚠️ *Impossible de continuer*\n\n` +
            `Le produit "*${item.name}*" n'est plus disponible dans cette quantité.\n\n` +
            `📌 *Stock disponible :* ${item.available} pièce(s)\n` +
            `📌 *Quantité demandée :* ${item.requested} pièce(s)\n\n` +
            `Veuillez réduire la quantité pour continuer.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        await saveTemporarySession(telegramId, {
          step: 'CHECKOUT_CHOOSE_ADDRESS_ROUTE'
        });

        await bot.deleteMessage(chatId, query.message!.message_id).catch(() => {});
        await bot.sendMessage(
          chatId,
          `✅ *COMMANDE CONFIRMÉE (${cart.count} pièces)*\n\n` +
          `• Total produits : *${formatPrice(cart.subtotal)}*\n` +
          `• Frais de livraison : *${formatPrice(cart.deliveryFee)}*\n` +
          `• *TOTAL À PAYER* : *${formatPrice(cart.total)}*\n\n` +
          `🏠 *Où souhaitez-vous être livré ?* Choisissez ci-dessous :`,
          {
            parse_mode: 'Markdown',
            reply_markup: addressSelectionKeyboard
          }
        );
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // 4.10 Profile modifier clicks
      if (data === 'toggle_notifications') {
        const newState = !user.notificationsEnabled;
        await updateUserProfile(user.id, { notificationsEnabled: newState });
        await bot.answerCallbackQuery(query.id, { text: newState ? '✅ Notifications activées' : '🔕 Notifications désactivées' });
        // Refresh account view
        await bot.deleteMessage(chatId, query.message!.message_id).catch(() => {});
        await showAccount(bot, chatId, telegramId);
        return;
      }
      
      if (data === 'edit_profile_phone') {
        await saveTemporarySession(telegramId, { step: 'EDITING_PHONE' });
        await bot.sendMessage(chatId, `📱 Saisissez votre nouveau numéro de téléphone (ex: 082XXXXXXX) :`, {
          reply_markup: { remove_keyboard: true }
        });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      if (data === 'edit_profile_address') {
        await saveTemporarySession(telegramId, { step: 'EDITING_ADDRESS' });
        await bot.sendMessage(chatId, `🏠 Saisissez votre nouvelle adresse complète par message :`, {
          reply_markup: { remove_keyboard: true }
        });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      if (data === 'edit_profile_location') {
        await bot.sendMessage(chatId, `📍 Cliquez sur le bouton ci-dessous pour envoyer votre nouvelle position géographique :`, {
          reply_markup: locationKeyboard
        });
        await bot.answerCallbackQuery(query.id);
        return;
      }

      // 4.11 Admin changes order status
      if (data.startsWith('admin_status_')) {
        if (!(await isAdmin(telegramId))) {
          await bot.answerCallbackQuery(query.id, { text: '❌ Droits insuffisants.' });
          return;
        }

        const parts = data.replace('admin_status_', '').split('_');
        const orderId = parts[0];
        const status = parts.slice(1).join('_'); // 'processing', 'shipped', etc.

        // Standard mapping status names to english Firestore formats
        let cleanStatus = status;
        if (status === 'preparation') cleanStatus = 'processing';
        if (status === 'delivery') cleanStatus = 'shipped';

        const db = getDb();
        await db.collection('orders').doc(orderId).update({
          status: cleanStatus,
          updatedAt: Date.now()
        });

        await bot.answerCallbackQuery(query.id, { text: '✅ Statut mis à jour !' });
        
        // Update the visual status text on the admin's view
        let statusTextFr = cleanStatus;
        if (cleanStatus === 'processing') statusTextFr = 'En préparation';
        else if (cleanStatus === 'shipped') statusTextFr = 'En livraison / Expédiée';
        else if (cleanStatus === 'delivered') statusTextFr = 'Livrée';
        else if (cleanStatus === 'cancelled') statusTextFr = 'Annulée';

        await bot.editMessageText(
          `📦 *Commande #${orderId}*\n\n` +
          `✅ Statut modifié avec succès en : *${statusTextFr}*.\n` +
          `Le client a été notifié en temps réel par notification push.`,
          {
            chat_id: chatId,
            message_id: query.message!.message_id,
            parse_mode: 'Markdown'
          }
        );
        return;
      }

    } catch (err) {
      console.error('[HANDLERS] Error in callback query handler:', err);
    }
  });
}
