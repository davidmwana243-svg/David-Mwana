import { CartItem, Product } from '../types';

export const calculateCartTotal = (items: CartItem[]): number => {
  return items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
};

export const calculateCartCount = (items: CartItem[]): number => {
  return items.reduce((sum, item) => sum + item.quantity, 0);
};

export const addItemToCartList = (
  items: CartItem[],
  product: Product,
  selectedSize?: string,
  selectedColor?: string,
  quantity: number = 1
): CartItem[] => {
  const existingIndex = items.findIndex(
    item =>
      item.product.id === product.id &&
      item.selectedSize === selectedSize &&
      item.selectedColor === selectedColor
  );

  if (existingIndex > -1) {
    const updated = [...items];
    updated[existingIndex] = {
      ...updated[existingIndex],
      quantity: updated[existingIndex].quantity + quantity,
    };
    return updated;
  }

  return [...items, { product, quantity, selectedSize, selectedColor }];
};
