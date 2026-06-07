import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product } from '../models/types';
import { useAuth } from './AuthContext';

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, quantity?: number, selectedSize?: string) => void;
  removeFromCart: (productId: string, selectedSize?: string) => void;
  updateQuantity: (productId: string, quantity: number, selectedSize?: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export const useCart = () => useContext(CartContext);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load items when user changes
  useEffect(() => {
    try {
      const cartKey = user ? `cart_${user.uid}` : 'cart_guest';
      const saved = localStorage.getItem(cartKey);
      if (saved) {
        setItems(JSON.parse(saved));
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error("Failed to parse cart from local storage", error);
      setItems([]);
    }
    setIsInitialized(true);
  }, [user]);

  // Save items when they change
  useEffect(() => {
    if (!isInitialized) return;
    const cartKey = user ? `cart_${user.uid}` : 'cart_guest';
    localStorage.setItem(cartKey, JSON.stringify(items));
  }, [items, user, isInitialized]);

  const addToCart = React.useCallback((product: Product, quantity = 1, selectedSize?: string) => {
    setItems(current => {
      const existing = current.find(item => item.product.id === product.id && item.selectedSize === selectedSize);
      if (existing) {
        return current.map(item =>
          item.product.id === product.id && item.selectedSize === selectedSize
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...current, { product, quantity, selectedSize }];
    });
  }, []);

  const removeFromCart = React.useCallback((productId: string, selectedSize?: string) => {
    setItems(current => current.filter(item => !(item.product.id === productId && item.selectedSize === selectedSize)));
  }, []);

  const updateQuantity = React.useCallback((productId: string, quantity: number, selectedSize?: string) => {
    if (quantity <= 0) {
      removeFromCart(productId, selectedSize);
      return;
    }
    setItems(current =>
      current.map(item =>
        item.product.id === productId && item.selectedSize === selectedSize ? { ...item, quantity } : item
      )
    );
  }, [removeFromCart]);

  const clearCart = React.useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const value = React.useMemo(() => ({ 
    items, 
    addToCart, 
    removeFromCart, 
    updateQuantity, 
    clearCart, 
    totalItems, 
    totalPrice 
  }), [items, totalItems, totalPrice]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};
