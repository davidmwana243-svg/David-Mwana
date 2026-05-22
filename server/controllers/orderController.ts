import { Request, Response } from 'express';
import admin from 'firebase-admin';
import { Order, OrderStatus } from '../models/orderModel.js';

const ORDERS_COLLECTION = 'orders';

const getDb = () => admin.firestore();

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
      paymentMethod: orderData.paymentMethod || 'COD',
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

    const updateData: any = {
      status: status as OrderStatus,
      updatedAt: Date.now()
    };

    if (trackingNumber) {
      updateData.trackingNumber = trackingNumber;
    }

    await db.collection(ORDERS_COLLECTION).doc(id).update(updateData);

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

    if (order.status !== 'processing') {
      return res.status(400).json({ message: 'Order cannot be cancelled in its current status' });
    }

    await docRef.update({
      status: 'cancelled',
      updatedAt: Date.now()
    });

    res.json({ message: 'Order cancelled successfully' });
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    res.status(500).json({ message: 'Failed to cancel order' });
  }
};
