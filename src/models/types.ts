export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  images: string[];
  category: string;
  rating: number;
  reviewsCount: number;
  stock: number;
  salesCount: number;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  imageUrl: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface UserAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  addressLines: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  isDefault?: boolean;
  commune?: string;
  quartier?: string;
  avenue?: string;
  houseNumber?: string;
  reference?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName?: string;
  photoUrl?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  wishlist: string[]; // Product IDs
  addresses?: UserAddress[];
  preferredPaymentMethod?: string;
  paymentPhone?: string;
  createdAt: number;
}

export interface Order {
  id: string;
  userId: string;
  items: CartItem[];
  total: number;
  status: 'payment_pending' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: string;
  createdAt: number;
  qrToken?: string;
  deliveredAt?: number;
  shippingAddressObj?: UserAddress;
  userName?: string;
  userPhone?: string;
}
