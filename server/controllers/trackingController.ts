import { Request, Response } from 'express';
import { getDb } from '../firebase/index';

export const getOrderTracking = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const db = getDb();
    const doc = await db.collection('orders').doc(orderId).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, error: 'Commande non trouvée' });
    }
    const orderData = doc.data();
    res.json({
      success: true,
      tracking: {
        orderId,
        status: orderData?.status || 'pending',
        address: orderData?.deliveryAddress || 'Non spécifiée',
        updatedAt: orderData?.updatedAt || Date.now(),
      }
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
};
