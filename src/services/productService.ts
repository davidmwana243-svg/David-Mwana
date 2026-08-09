import { collection, getDocs, doc, getDoc, query, where, orderBy, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { Product, Category } from '../types';
import { EX_PRODUCTS, EX_CATEGORIES } from './mockData';

export const getProducts = async (): Promise<Product[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'products'));
    if (snapshot.empty) {
      return [];
    }
    const prods = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Product));
    const seen = new Set<string>();
    const uniqueProds: Product[] = [];
    prods.forEach(p => {
      if (p && p.id && !seen.has(p.id)) {
        seen.add(p.id);
        uniqueProds.push(p);
      }
    });
    return uniqueProds.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (error) {
    console.error('Error fetching products: ', error);
    return [];
  }
};

export const addProduct = async (product: Omit<Product, 'id' | 'createdAt'>): Promise<Product> => {
  const newProductRef = doc(collection(db, 'products'));
  const id = newProductRef.id;
  
  const newProduct: Product = {
    ...product,
    id,
    createdAt: Date.now()
  };
  
  console.log("Saving product to Firestore...", newProduct);
  try {
    await setDoc(newProductRef, newProduct);
    console.log("Product saved successfully to Firestore.");
  } catch (err) {
    console.error("Firestore setDoc error:", err);
    throw err;
  }
  return newProduct;
};

export const updateProduct = async (id: string, updates: Partial<Product>): Promise<void> => {
  const productRef = doc(db, 'products', id);
  console.log("Updating product in Firestore...", id, updates);
  
  const finalUpdates = { ...updates };
  if (updates.imageUrl) {
    finalUpdates.images = [updates.imageUrl];
  }

  try {
    await setDoc(productRef, finalUpdates, { merge: true });
    console.log("Product updated successfully in Firestore.");
  } catch (err) {
    console.error("Firestore updateDoc error:", err);
    throw err;
  }
};

export const deleteProduct = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'products', id));
};


export const getProductById = async (id: string): Promise<Product | null> => {
  try {
    const docRef = doc(db, 'products', id);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return snapshot.data() as Product;
    }
    return null;
  } catch (error) {
    console.error('Error fetching product by ID:', error);
    return null;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'categories'));
    if (snapshot.empty) return [];
    const cats = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Category));
    const seen = new Set<string>();
    const uniqueCats: Category[] = [];
    cats.forEach(c => {
      if (c && c.id && !seen.has(c.id)) {
        seen.add(c.id);
        uniqueCats.push(c);
      }
    });
    return uniqueCats;
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
};

export const addCategory = async (category: Omit<Category, 'id'>): Promise<Category> => {
  const newCatRef = doc(collection(db, 'categories'));
  const id = newCatRef.id;
  const newCat: Category = { ...category, id };
  await setDoc(newCatRef, newCat);
  return newCat;
};

export const updateCategory = async (id: string, updates: Partial<Category>): Promise<void> => {
  const catRef = doc(db, 'categories', id);
  await setDoc(catRef, updates, { merge: true });
};

export const deleteCategory = async (id: string): Promise<void> => {
  await deleteDoc(doc(db, 'categories', id));
};

export const getProductsByCategory = async (categoryId: string): Promise<Product[]> => {
  try {
    const q = query(collection(db, 'products'), where('category', '==', categoryId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return [];
    return snapshot.docs.map(doc => doc.data() as Product);
  } catch (error) {
    console.error('Error fetching products by category:', error);
    return [];
  }
};

export const searchProducts = async (queryText: string): Promise<Product[]> => {
  // Simple client-side search fallback if algolia isn't used
  const allProducts = await getProducts();
  const lowerQuery = queryText.toLowerCase();
  return allProducts.filter(p => 
    p.name.toLowerCase().includes(lowerQuery) || 
    p.description.toLowerCase().includes(lowerQuery)
  );
};

export interface ProductReview {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: number;
}

export const getProductReviews = async (productId: string): Promise<ProductReview[]> => {
  try {
    const q = query(collection(db, 'reviews'), where('productId', '==', productId));
    const snap = await getDocs(q);
    if (snap.empty) {
      return [];
    }
    return snap.docs.map(doc => doc.data() as ProductReview);
  } catch (error) {
    return [];
  }
};

export const addProductReview = async (productId: string, userId: string, userName: string, rating: number, comment: string): Promise<ProductReview> => {
  const reviewsCol = collection(db, 'reviews');
  const newReviewRef = doc(reviewsCol);
  
  const review: any = {
    id: newReviewRef.id,
    reviewId: newReviewRef.id,
    productId,
    userId,
    customerId: userId,
    userName,
    customerName: userName,
    rating,
    comment,
    createdAt: Date.now()
  };
  
  await setDoc(newReviewRef, review);
  
  // Update the product's overall rating average dynamically
  try {
    const productRef = doc(db, 'products', productId);
    const pSnap = await getDoc(productRef);
    if (pSnap.exists()) {
      const pData = pSnap.data() as Product;
      console.log("Updating product rating, product data:", pData);
      const currentRatingCount = (pData.totalReviews ?? pData.reviewsCount ?? 0);
      const oldRating = (pData.averageRating ?? pData.rating ?? 0);
      
      let newAverage = rating;
      if (currentRatingCount > 0) {
        newAverage = parseFloat(((oldRating * currentRatingCount + rating) / (currentRatingCount + 1)).toFixed(1));
      }
      
      console.log("New average rating calculation:", newAverage, currentRatingCount + 1);
      
      await updateDoc(productRef, {
        rating: newAverage,
        reviewsCount: currentRatingCount + 1,
        averageRating: newAverage,
        totalReviews: currentRatingCount + 1
      });
      console.log("Product updated successfully in Firestore.");
    }
  } catch (err) {
    console.warn("Could not calculate and update average rating in DB, ignoring", err);
  }
  
  return review as ProductReview;
};

export interface StockCheckResult {
  valid: boolean;
  outOfStockProduct?: {
    name: string;
    requested: number;
    available: number;
  };
}

export const checkCartStock = async (items: Array<{ product: { id: string; name: string }; quantity: number }>): Promise<StockCheckResult> => {
  try {
    for (const item of items) {
      if (!item.product || !item.product.id) continue;
      const docRef = doc(db, 'products', item.product.id);
      const snapshot = await getDoc(docRef);
      if (snapshot.exists()) {
        const data = snapshot.data() as Product;
        const availableStock = typeof data.stock === 'number' ? data.stock : 999;
        if (item.quantity > availableStock) {
          return {
            valid: false,
            outOfStockProduct: {
              name: data.name || item.product.name,
              requested: item.quantity,
              available: availableStock
            }
          };
        }
      }
    }
  } catch (err) {
    console.warn('Stock check error:', err);
  }
  return { valid: true };
};
