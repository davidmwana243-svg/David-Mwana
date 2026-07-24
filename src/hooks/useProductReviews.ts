import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { Review } from '../types';

export const useProductReviews = (productId: string) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!productId) return;

    const q = query(
      collection(db, 'reviews'),
      where('productId', '==', productId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newReviews = snapshot.docs.map(doc => {
        const data = doc.data() as any;
        return {
          reviewId: data.reviewId || data.id || doc.id,
          productId: data.productId,
          customerId: data.customerId || data.userId,
          customerName: data.customerName || data.userName || 'Client',
          rating: data.rating,
          comment: data.comment,
          createdAt: data.createdAt
        } as Review;
      });
      setReviews(newReviews);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [productId]);

  return { reviews, loading };
};
