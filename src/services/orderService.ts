import { collection, getDocs, doc, setDoc, query, orderBy, where, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Order, CartItem, UserAddress } from '../models/types';

// Coordinates parsing utility simulating customer addresses in Haut-Katanga to demonstrate Google Maps tracking
export interface DRCAddressDetails {
  city: string;
  commune: string;
  quartier: string;
  avenue: string;
  reference: string;
  latitude: number;
  longitude: number;
}

export const parseDRCOnlineAddress = (address: string): DRCAddressDetails => {
  const lowercase = address.toLowerCase();
  
  // 1. Detect City (strictly Haut-Katanga cities)
  let city = 'Lubumbashi';
  if (lowercase.includes('likasi')) {
    city = 'Likasi';
  } else if (lowercase.includes('kasumbalesa')) {
    city = 'Kasumbalesa';
  } else if (lowercase.includes('kipushi')) {
    city = 'Kipushi';
  } else if (lowercase.includes('kambove')) {
    city = 'Kambove';
  } else if (lowercase.includes('sakania')) {
    city = 'Sakania';
  }

  // Helper matching function
  const extractField = (text: string, patterns: RegExp[]): string => {
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return '';
  };

  // 2. Extract Commune, Quartier, Avenue, Reference with robust DRC formats
  let commune = extractField(address, [
    /C\/\s*([^,\(\)]+)/i,
    /Commune\s*d[e’']?\s*([^,\(\)]+)/i,
    /Commune\s+([^,\(\)]+)/i
  ]);
  
  let quartier = extractField(address, [
    /Q\/\s*([^,\(\)]+)/i,
    /Quartier\s+([^,\(\)]+)/i
  ]);
  
  let avenue = extractField(address, [
    /Av(?:enue)?\.?\s+([^,\(\)]+)/i
  ]);
  
  let reference = extractField(address, [
    /Réf\.?\s*:\s*([^\)]+)/i,
    /Réf\.?\s+([^\)]+)/i,
    /Référence\s*:\s*([^\)]+)/i,
    /Reference\s*:\s*([^\)]+)/i
  ]);

  // Fallbacks if regex doesn't capture to avoid visual gaps in UI
  if (!commune) {
    if (city === 'Lubumbashi') commune = 'Lubumbashi';
    else commune = city;
  }
  
  if (!quartier) {
    quartier = 'Golf';
  }
  
  if (!avenue) {
    avenue = 'Non spécifiée';
  }
  
  if (!reference) {
    reference = 'Aucun repère renseigné';
  }

  // 3. Smart GPS coordinates mapping for Haut-Katanga
  let latitude = -11.66089;
  let longitude = 27.4794; // Default Lubumbashi center

  if (city === 'Lubumbashi') {
    latitude = -11.66089;
    longitude = 27.4794;
    
    // Zoom into specific neighborhoods if mentioned
    const combinedLower = (commune + ' ' + quartier + ' ' + avenue).toLowerCase();
    
    if (combinedLower.includes('golf')) {
      latitude = -11.6912;
      longitude = 27.4851;
    } else if (combinedLower.includes('penga') || lowercase.includes('penga')) {
      latitude = -11.6853;
      longitude = 27.5021;
    } else if (combinedLower.includes('ruashi')) {
      latitude = -11.6375;
      longitude = 27.5255;
    } else if (combinedLower.includes('annexe')) {
      latitude = -11.6245;
      longitude = 27.5012;
    }
  } else if (city === 'Likasi') {
    latitude = -10.9856;
    longitude = 26.7314;
  } else if (city === 'Kasumbalesa') {
    latitude = -12.2573;
    longitude = 27.8105;
  } else if (city === 'Kipushi') {
    latitude = -11.7589;
    longitude = 27.2458;
  } else if (city === 'Kambove') {
    latitude = -10.8752;
    longitude = 26.5982;
  } else if (city === 'Sakania') {
    latitude = -12.7505;
    longitude = 28.5606;
  }

  return {
    city,
    commune,
    quartier,
    avenue,
    reference,
    latitude,
    longitude
  };
};

const cleanUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(v => cleanUndefined(v));
  } else if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, v]) => v !== undefined)
        .map(([k, v]) => [k, cleanUndefined(v)])
    );
  }
  return obj;
};

export const createOrder = async (userId: string, items: CartItem[], total: number, shippingAddress: string, userName?: string, userPhone?: string, addressObj?: UserAddress): Promise<Order> => {
  const newOrderRef = doc(collection(db, 'orders'));
  const parsedAddr = parseDRCOnlineAddress(shippingAddress);
  const token = 'SECURE-TOK-' + Math.random().toString(36).substring(2, 10).toUpperCase();

  const finalName = userName || 'Client DavidSTORE';
  const finalPhone = userPhone || '+243 000 000 000';

  const order: Order = {
    id: newOrderRef.id,
    userId,
    items,
    total,
    status: 'payment_pending',
    shippingAddress,
    createdAt: Date.now(),
    qrToken: token,
    shippingAddressObj: {
      id: newOrderRef.id + '_addr',
      label: addressObj?.label || 'Adresse de livraison',
      fullName: finalName,
      phone: finalPhone,
      addressLines: shippingAddress,
      city: addressObj?.city || parsedAddr.city,
      country: addressObj?.country || 'RD Congo',
      latitude: addressObj?.latitude !== undefined ? addressObj.latitude : parsedAddr.latitude,
      longitude: addressObj?.longitude !== undefined ? addressObj.longitude : parsedAddr.longitude,
      commune: addressObj?.commune || parsedAddr.commune,

      quartier: addressObj?.quartier || parsedAddr.quartier,
      avenue: addressObj?.avenue || parsedAddr.avenue,
      reference: addressObj?.reference || parsedAddr.reference
    },
    userName: finalName,
    userPhone: finalPhone
  };
  
  const cleanedOrder = cleanUndefined(order);
  await setDoc(newOrderRef, cleanedOrder);
  return order;
};

export const getOrders = async (): Promise<Order[]> => {
  try {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Order);
  } catch (error) {
    console.error("Error getting orders", error);
    return [];
  }
};

export const getUserOrders = async (userId: string): Promise<Order[]> => {
  try {
    const q = query(collection(db, 'orders'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as Order).sort((a,b) => b.createdAt - a.createdAt);
  } catch (error) {
    return [];
  }
};

export const updateOrderStatus = async (orderId: string, status: Order['status']): Promise<void> => {
  const orderRef = doc(db, 'orders', orderId);
  await updateDoc(orderRef, { status });
};

export const updateOrderItemSize = async (orderId: string, itemIdx: number, newSize: string): Promise<void> => {
  const orderRef = doc(db, 'orders', orderId);
  const snap = await getDoc(orderRef);
  if (snap.exists()) {
    const orderData = snap.data() as Order;
    if (orderData.items && orderData.items[itemIdx]) {
      const updatedItems = [...orderData.items];
      updatedItems[itemIdx] = {
        ...updatedItems[itemIdx],
        selectedSize: newSize || undefined
      };
      await updateDoc(orderRef, { items: updatedItems });
    }
  }
};

export const confirmQRReceived = async (orderId: string, token: string): Promise<boolean> => {
  try {
    const orderRef = doc(db, 'orders', orderId);
    
    // Verify token matches before updating
    const snap = await getDoc(orderRef);
    if (!snap.exists()) return false;
    const orderData = snap.data() as Order;
    
    if (orderData.qrToken !== token) {
      console.warn("QR Token mismatch", { provided: token, expected: orderData.qrToken });
      return false;
    }

    await updateDoc(orderRef, {
      status: 'delivered',
      deliveredAt: Date.now()
    });
    return true;
  } catch (error) {
    console.error("Error confirming QR delivery:", error);
    return false;
  }
};
