import { collection, getDocs, doc, getDoc, query, where, orderBy, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { Product, Category } from '../models/types';
import { EX_PRODUCTS, EX_CATEGORIES } from './mockData';

export const getProducts = async (): Promise<Product[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'products'));
    if (snapshot.empty) return EX_PRODUCTS;
    const prods = snapshot.docs.map(doc => doc.data() as Product);
    return prods.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  } catch (error) {
    console.warn('Falling back to mock products due to error: ', error);
    return EX_PRODUCTS;
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
    await updateDoc(productRef, finalUpdates);
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
    return EX_PRODUCTS.find(p => p.id === id) || null;
  } catch (error) {
    return EX_PRODUCTS.find(p => p.id === id) || null;
  }
};

export const getCategories = async (): Promise<Category[]> => {
  try {
    const snapshot = await getDocs(collection(db, 'categories'));
    if (snapshot.empty) return EX_CATEGORIES;
    return snapshot.docs.map(doc => doc.data() as Category);
  } catch (error) {
    return EX_CATEGORIES;
  }
};

export const getProductsByCategory = async (categoryId: string): Promise<Product[]> => {
  try {
    const q = query(collection(db, 'products'), where('category', '==', categoryId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return EX_PRODUCTS.filter(p => p.category === categoryId);
    return snapshot.docs.map(doc => doc.data() as Product);
  } catch (error) {
    return EX_PRODUCTS.filter(p => p.category === categoryId);
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
