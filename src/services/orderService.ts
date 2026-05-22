import { collection, getDocs, doc, setDoc, query, orderBy, where, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Order, CartItem } from '../models/types';

export const createOrder = async (userId: string, items: CartItem[], total: number, shippingAddress: string): Promise<Order> => {
  const newOrderRef = doc(collection(db, 'orders'));
  const order: Order = {
    id: newOrderRef.id,
    userId,
    items,
    total,
    status: 'processing',
    shippingAddress,
    createdAt: Date.now()
  };
  
  await setDoc(newOrderRef, order);
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
