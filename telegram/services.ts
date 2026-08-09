import { getDb } from '../server/firebase/index';
import { generateOrderNumber } from './utils';
import TelegramBot from 'node-telegram-bot-api';
import { generateDeliveryQRPayload, generateSecureToken } from '../src/utils/deliveryCrypto';

/**
 * Service Firestore pour le Bot Telegram DavidStore
 */

const USERS_COL = 'users';
const PRODUCTS_COL = 'products';
const CATEGORIES_COL = 'categories';
const CARTS_COL = 'carts';
const FAVORITES_COL = 'favorites';
const ORDERS_COL = 'orders';
const SESSIONS_COL = 'telegram_sessions';
const NOTIFICATIONS_COL = 'notifications';

// --- GESTION DE LA SESSION D'INSCRIPTION ---

export async function getTemporarySession(telegramId: string): Promise<any | null> {
  const db = getDb();
  const doc = await db.collection(SESSIONS_COL).doc(telegramId).get();
  return doc.exists ? doc.data() : null;
}

export async function saveTemporarySession(telegramId: string, data: any): Promise<void> {
  const db = getDb();
  await db.collection(SESSIONS_COL).doc(telegramId).set(data, { merge: true });
}

export async function deleteTemporarySession(telegramId: string): Promise<void> {
  const db = getDb();
  await db.collection(SESSIONS_COL).doc(telegramId).delete();
}

// --- UTILISATEURS ---

export async function getUserByTelegramId(telegramId: string): Promise<any | null> {
  const db = getDb();
  const query = await db.collection(USERS_COL).where('telegramId', '==', telegramId).get();
  if (query.empty) return null;
  const data = { id: query.docs[0].id, ...query.docs[0].data() };
  console.log(`getUserByTelegramId DEBUG: Found user: ${JSON.stringify(data)}`);
  return data;
}

export async function createUserProfile(profile: any): Promise<void> {
  const db = getDb();
  const id = profile.telegramId;
  await db.collection(USERS_COL).doc(id).set({
    ...profile,
    id,
    notificationsEnabled: true,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
}

export async function sendTelegramNotification(
  telegramId: string,
  message: string,
  type: string,
  bot: TelegramBot
): Promise<void> {
  const db = getDb();
  
  const user = await getUserByTelegramId(telegramId);
  if (!user || user.notificationsEnabled === false) {
    console.log(`sendTelegramNotification: Notifications disabled or user not found for ${telegramId}`);
    return;
  }
  
  try {
    await bot.sendMessage(telegramId, message, { parse_mode: 'Markdown' });
    
    await db.collection(NOTIFICATIONS_COL).add({
      userId: user.id,
      telegramId,
      type,
      message,
      status: 'sent',
      createdAt: Date.now(),
      sentAt: Date.now()
    });
  } catch (error) {
    console.error(`sendTelegramNotification error for ${telegramId}:`, error);
    await db.collection(NOTIFICATIONS_COL).add({
      userId: user.id,
      telegramId,
      type,
      message,
      status: 'failed',
      createdAt: Date.now(),
      error: String(error)
    });
  }
}

export async function updateUserProfile(id: string, updates: any): Promise<void> {
  const db = getDb();
  await db.collection(USERS_COL).doc(id).set({
    ...updates,
    updatedAt: Date.now()
  }, { merge: true });
}

// --- CATALOGUE ET PRODUITS ---

export async function getCategories(onlyAvailableWithProducts: boolean = true): Promise<any[]> {
  const db = getDb();
  const snap = await db.collection(CATEGORIES_COL).get();
  const categories = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  if (onlyAvailableWithProducts) {
    const availableProducts = await getProducts(undefined, true);
    const availableCategoryIds = new Set(availableProducts.map((p: any) => p.category));
    return categories.filter((c: any) => availableCategoryIds.has(c.id));
  }

  return categories;
}

export async function getProducts(categoryId?: string, onlyAvailable: boolean = true): Promise<any[]> {
  const db = getDb();
  let query: any = db.collection(PRODUCTS_COL);
  if (categoryId) {
    query = query.where('category', '==', categoryId);
  }
  const snap = await query.get();
  let products = snap.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));

  if (onlyAvailable) {
    products = products.filter((p: any) => {
      const stockNum = p.stock !== undefined && p.stock !== null ? Number(p.stock) : 0;
      const isInStockFlag = p.inStock !== false;
      return stockNum > 0 && isInStockFlag;
    });
  }

  return products;
}

export async function getProductById(productId: string): Promise<any | null> {
  const db = getDb();
  const doc = await db.collection(PRODUCTS_COL).doc(productId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

// --- PANIER (CARTS) ---

export async function getCart(telegramId: string): Promise<any> {
  const db = getDb();
  const doc = await db.collection(CARTS_COL).doc(telegramId).get();
  if (!doc.exists) {
    return { items: [], total: 0, count: 0 };
  }
  const data = doc.data() || { items: [] };
  
  // Recalculate total amounts securely based on the original database price, not client inputs
  let subtotal = 0;
  let count = 0;
  for (const item of data.items) {
    const freshProduct = await getProductById(item.productId || item.product?.id);
    if (freshProduct) {
      item.product = freshProduct;
      subtotal += freshProduct.price * item.quantity;
      count += item.quantity;
    }
  }
  
  let deliveryFee = 0;
  if (subtotal > 0 && subtotal < 50000) {
    deliveryFee = 3000;
  }
  
  const total = subtotal + deliveryFee;
  
  return { items: data.items, subtotal, total, deliveryFee, count };
}

export async function addToCart(telegramId: string, productId: string, quantity: number, selectedSize?: string, selectedColor?: string): Promise<void> {
  const db = getDb();
  const cart = await getCart(telegramId);
  console.log(`addToCart DEBUG: Finding item: prod=${productId}, size=${selectedSize}, color=${selectedColor}`);
  const existingItem = cart.items.find((i: any) => 
    (i.productId === productId || i.product?.id === productId) &&
    (i.selectedSize || undefined) === (selectedSize || undefined) &&
    (i.selectedColor || undefined) === (selectedColor || undefined)
  );
  
  if (existingItem) {
    console.log("addToCart DEBUG: Found existing item");
    existingItem.quantity += quantity;
  } else {
    console.log("addToCart DEBUG: Adding new item");
    const product = await getProductById(productId);
    if (!product) return;
    const item: any = {
      productId,
      product,
      quantity
    };
    if (selectedSize) item.selectedSize = selectedSize;
    if (selectedColor) item.selectedColor = selectedColor;
    cart.items.push(item);
  }
  
  await db.collection(CARTS_COL).doc(telegramId).set({ items: cart.items, updatedAt: Date.now() });
}

export async function updateCartItemQuantity(telegramId: string, productId: string, delta: number): Promise<void> {
  const db = getDb();
  const cart = await getCart(telegramId);
  const idx = cart.items.findIndex((i: any) => (i.productId === productId || i.product?.id === productId));
  
  if (idx !== -1) {
    cart.items[idx].quantity += delta;
    if (cart.items[idx].quantity <= 0) {
      cart.items.splice(idx, 1);
    }
    await db.collection(CARTS_COL).doc(telegramId).set({ items: cart.items, updatedAt: Date.now() });
  }
}

export async function removeFromCart(telegramId: string, productId: string): Promise<void> {
  const db = getDb();
  const cart = await getCart(telegramId);
  const items = cart.items.filter((i: any) => (i.productId !== productId && i.product?.id !== productId));
  await db.collection(CARTS_COL).doc(telegramId).set({ items, updatedAt: Date.now() });
}

export async function clearCart(telegramId: string): Promise<void> {
  const db = getDb();
  await db.collection(CARTS_COL).doc(telegramId).delete();
}

// --- FAVORIS (FAVORITES) ---

export async function getFavorites(telegramId: string): Promise<any[]> {
  const db = getDb();
  const doc = await db.collection(FAVORITES_COL).doc(telegramId).get();
  if (!doc.exists) return [];
  const data = doc.data() || { productIds: [] };
  const products: any[] = [];
  
  for (const pid of data.productIds) {
    const p = await getProductById(pid);
    if (p) products.push(p);
  }
  return products;
}

export async function isFavorite(telegramId: string, productId: string): Promise<boolean> {
  const db = getDb();
  const doc = await db.collection(FAVORITES_COL).doc(telegramId).get();
  if (!doc.exists) return false;
  const data = doc.data() || { productIds: [] };
  return data.productIds.includes(productId);
}

export async function addToFavorites(telegramId: string, productId: string): Promise<void> {
  const db = getDb();
  const doc = await db.collection(FAVORITES_COL).doc(telegramId).get();
  let productIds = [];
  if (doc.exists) {
    productIds = doc.data()?.productIds || [];
  }
  if (!productIds.includes(productId)) {
    productIds.push(productId);
    await db.collection(FAVORITES_COL).doc(telegramId).set({ productIds, updatedAt: Date.now() });
  }
}

export async function removeFromFavorites(telegramId: string, productId: string): Promise<void> {
  const db = getDb();
  const doc = await db.collection(FAVORITES_COL).doc(telegramId).get();
  if (doc.exists) {
    const productIds = (doc.data()?.productIds || []).filter((id: string) => id !== productId);
    await db.collection(FAVORITES_COL).doc(telegramId).set({ productIds, updatedAt: Date.now() });
  }
}

// --- COMMANDES (ORDERS) ---

export async function createOrder(telegramId: string, orderData: any): Promise<string> {
  const db = getDb();
  const orderId = generateOrderNumber();
  const docRef = db.collection(ORDERS_COL).doc(orderId);

  const createdAt = Date.now();
  const expiresAt = createdAt + 30 * 24 * 60 * 60 * 1000;
  const secureToken = orderData.secureToken || orderData.deliveryPin || generateSecureToken();

  const { payloadObj } = generateDeliveryQRPayload({
    id: orderId,
    secureToken,
    createdAt,
    expiresAt,
    userId: orderData.userId || `tg_${telegramId}`
  } as any, orderData.driverId || '', orderData.userId || `tg_${telegramId}`);
  
  await docRef.set({
    ...orderData,
    id: orderId,
    orderId,
    status: orderData.status || 'payment_pending',
    createdAt,
    updatedAt: createdAt,
    secureToken,
    qrToken: secureToken,
    deliveryPin: secureToken,
    signature: payloadObj.signature,
    expiresAt,
    deliveryConfirmed: false
  });
  
  return orderId;
}

export async function getOrders(userId: string): Promise<any[]> {
  const db = getDb();
  console.log(`getOrders DEBUG: Fetching orders for userId: tg_${userId}`);
  const snap = await db.collection(ORDERS_COL).where('userId', '==', `tg_${userId}`).get();
  console.log(`getOrders DEBUG: Found ${snap.docs.length} orders`);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function deleteOrders(telegramId: string): Promise<void> {
  const db = getDb();
  const snap = await db.collection(ORDERS_COL).where('userId', '==', `tg_${telegramId}`).get();
  
  const batch = db.batch();
  snap.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  await batch.commit();
}

export async function getOrderById(orderId: string): Promise<any | null> {
  const db = getDb();
  const doc = await db.collection(ORDERS_COL).doc(orderId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function updateOrderStatus(orderId: string, status: string): Promise<void> {
  const db = getDb();
  await db.collection(ORDERS_COL).doc(orderId).update({ status, updatedAt: Date.now() });
}
