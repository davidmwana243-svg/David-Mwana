import { Request, Response } from 'express';
import { getDb } from '../firebase/index.js';
import { Order, OrderStatus } from '../models/orderModel.js';
import { sendOrderStatusUpdate } from '../../telegram/bot';

const ORDERS_COLLECTION = 'orders';

export const createOrder = async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = (req as any).user.uid;
    const orderData: Partial<Order> = req.body;

    if (!orderData.items || orderData.items.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    const newOrder: Order = {
      userId,
      items: orderData.items,
      total: orderData.total || 0,
      status: 'processing',
      shippingAddress: orderData.shippingAddress!,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const docRef = await db.collection(ORDERS_COLLECTION).add(newOrder);
    
    res.status(201).json({
      message: 'Order created successfully',
      orderId: docRef.id,
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({ message: 'Failed to create order' });
  }
};

export const getUserOrders = async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userId = (req as any).user.uid;
    const snapshot = await db.collection(ORDERS_COLLECTION)
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();

    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(orders);
  } catch (error: any) {
    console.error('Error fetching user orders:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

export const getOrderById = async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const userId = (req as any).user.uid;
    const userRole = (req as any).user.role;

    const doc = await db.collection(ORDERS_COLLECTION).doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = doc.data() as Order;

    // Only creator or admin can view order details
    if (order.userId !== userId && userRole !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized access to order' });
    }

    res.json({ id: doc.id, ...order });
  } catch (error: any) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Failed to fetch order' });
  }
};

// Admin: Get all orders
export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const snapshot = await db.collection(ORDERS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .get();

    const orders = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(orders);
  } catch (error: any) {
    console.error('Error fetching all orders:', error);
    res.status(500).json({ message: 'Failed to fetch orders' });
  }
};

// Admin: Update order status
export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status, trackingNumber } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const orderDocRef = db.collection(ORDERS_COLLECTION).doc(id);
    const orderDocSnap = await orderDocRef.get();
    
    if (!orderDocSnap.exists) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updateData: any = {
      status: status as OrderStatus,
      updatedAt: Date.now()
    };

    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }

    if (status === 'shipped') {
      const orderData = orderDocSnap.data() as Order;
      if (!orderData.qrToken) {
         updateData.qrToken = 'SECURE-TOK-' + Math.random().toString(36).substring(2, 10).toUpperCase();
      }
      if (!orderData.deliveryPin) {
         updateData.deliveryPin = Math.floor(100000 + Math.random() * 900000).toString();
      }
    }

    await orderDocRef.update(updateData);

    // Notify user via Telegram
    try {
      const orderDoc = await db.collection(ORDERS_COLLECTION).doc(id).get();
      if (orderDoc.exists) {
        const orderData = orderDoc.data() as Order;
        console.log(`[DEBUG] Order found for notification: ${id}, userId: ${orderData.userId}`);
        
        let telegramId = '';
        const userDoc = await db.collection('users').doc(orderData.userId).get();
        if (userDoc.exists) {
          const userData = userDoc.data();
          console.log(`[DEBUG] User found for notification: ${JSON.stringify(userData)}`);
          telegramId = userData?.telegramId || '';
        } else {
          console.log(`[DEBUG] User not found in Firestore for userId: ${orderData.userId}`);
        }

        // Fallback to extracting Telegram ID from userId if it starts with 'tg_'
        if (!telegramId && orderData.userId && orderData.userId.startsWith('tg_')) {
          telegramId = orderData.userId.replace('tg_', '');
          console.log(`[DEBUG] Extracted fallback telegramId from userId: ${telegramId}`);
        }

        if (telegramId) {
          console.log(`[DEBUG] Sending Telegram notification to ${telegramId}`);
          await sendOrderStatusUpdate(telegramId, id, status as OrderStatus, trackingNumber);
          console.log(`[DEBUG] Telegram notification sent`);
        } else {
          console.log(`[DEBUG] No telegramId available to notify user for order ${id}`);
        }
      } else {
        console.log(`[DEBUG] Order not found for ID: ${id}`);
      }
    } catch (notifyError) {
      console.error('Error sending Telegram notification for order update:', notifyError);
    }

    res.json({ message: 'Order status updated successfully' });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    res.status(500).json({ message: 'Failed to update order status' });
  }
};

export const cancelOrder = async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const userId = (req as any).user.uid;

    const docRef = db.collection(ORDERS_COLLECTION).doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = doc.data() as Order;

    if (order.userId !== userId) {
      return res.status(403).json({ message: 'Unauthorized to cancel this order' });
    }

    if (order.status === 'shipped' || order.status === 'delivered' || order.status === 'cancelled') {
      return res.status(400).json({ message: 'Order cannot be cancelled in its current status' });
    }

    await docRef.update({
      status: 'cancelled',
      updatedAt: Date.now()
    });

    // Notify user via Telegram
    try {
      let telegramId = '';
      const userDoc = await db.collection('users').doc(order.userId).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        telegramId = userData?.telegramId || '';
      }

      // Fallback to extracting Telegram ID from userId if it starts with 'tg_'
      if (!telegramId && order.userId && order.userId.startsWith('tg_')) {
        telegramId = order.userId.replace('tg_', '');
        console.log(`[DEBUG] Extracted fallback telegramId from userId: ${telegramId}`);
      }

      if (telegramId) {
        await sendOrderStatusUpdate(telegramId, id, 'cancelled');
      }
    } catch (notifyError) {
      console.error('Error sending Telegram notification for order cancellation:', notifyError);
    }

    res.json({ message: 'Order cancelled successfully' });
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: 'Failed to cancel order' });
  }
};
