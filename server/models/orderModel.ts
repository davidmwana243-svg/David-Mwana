
export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  imageUrl: string;
  size?: string;
}

export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id?: string;
  orderId?: string;
  userId: string;
  clientId?: string;
  driverId?: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  shippingAddress: {
    fullName: string;
    address: string;
    city: string;
    phone: string;
  };
  trackingNumber?: string;
  paymentMethod?: string;
  paymentStatus?: 'pending' | 'paid' | 'failed';
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  secureToken?: string;
  signature?: string;
  qrToken?: string;
  deliveryPin?: string;
  deliveryConfirmed?: boolean;
  deliveryConfirmedAt?: number;
  deliveryConfirmedBy?: string;
  deliveredAt?: number;
  deliveryConfirmationMethod?: string;
}
