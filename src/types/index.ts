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
  averageRating?: number;
  totalReviews?: number;
  stock: number;
  salesCount: number;
  createdAt: number;
  sizes?: string[];
  colors?: string[];
}

export interface Review {
  reviewId: string;
  orderId?: string;
  productId?: string;
  userId?: string;
  customerId?: string;
  telegramId?: string;
  customerName: string;
  rating: number;
  comment: string;
  createdAt: number;
}

export interface Category {
  id: string;
  name: string;
  icon?: string;
  imageUrl?: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
  selectedSize?: string;
  selectedColor?: string;
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
  nom?: string;       // French name mapping
  displayName?: string;
  fullName?: string;  // Direct requested naming
  photoUrl?: string;
  photoURL?: string; // requested format mapping
  profilePhoto?: string; // Schema requested mapping
  phone?: string;
  telephone?: string; // French phone mapping
  phoneNumber?: string; // fallback mapping
  firstName?: string;
  lastName?: string;
  telegramId?: string;
  username?: string;
  languageCode?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  wishlist: string[]; // Product IDs
  addresses?: UserAddress[];
  preferredPaymentMethod?: string;
  paymentPhone?: string;
  createdAt: number;
  dateCreation?: number; // French date mapping
  pendingEmail?: string;
  updatedAt?: number;
}

export interface Order {
  id: string;
  orderId?: string;
  userId: string;
  clientId?: string;
  driverId?: string;
  items: CartItem[];
  total: number;
  status: 'payment_pending' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  shippingAddress: string;
  createdAt: number;
  expiresAt?: number;
  secureToken?: string;
  signature?: string;
  qrToken?: string;
  deliveryPin?: string;
  deliveryConfirmed?: boolean;
  deliveryConfirmedAt?: number;
  deliveryConfirmedBy?: string;
  deliveredAt?: number;
  shippingAddressObj?: UserAddress;
  userName?: string;
  userPhone?: string;
}
