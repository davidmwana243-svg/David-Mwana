import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Product } from '../types';

export const useProduct = (productId: string) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;

    const unsub = onSnapshot(doc(db, 'products', productId), (docSnap) => {
      if (docSnap.exists()) {
        setProduct({ ...docSnap.data(), id: docSnap.id } as Product);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [productId]);

  return { product, loading };
};
