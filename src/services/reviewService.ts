import { db } from "../firebase";
import { 
  collection, 
  doc, 
  getDocs,
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  runTransaction 
} from "firebase/firestore";
import { Review, Product } from "../types";

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  starCounts: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
  starPercentages: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

/**
 * Adds product review with product average rating transaction
 */
export const addReview = async (review: Omit<Review, 'reviewId' | 'createdAt'>) => {
  if (review.productId) {
    const productDocRef = doc(db, "products", review.productId);

    await runTransaction(db, async (transaction) => {
      const productDoc = await transaction.get(productDocRef);
      if (!productDoc.exists()) throw new Error("Product not found");

      const product = productDoc.data() as Product;
      
      const newReviewRef = doc(collection(db, "reviews"));
      transaction.set(newReviewRef, {
        ...review,
        reviewId: newReviewRef.id,
        createdAt: Date.now(),
      });

      const totalReviews = (product.totalReviews || 0) + 1;
      const newAverageRating = 
        ((product.averageRating || 0) * (product.totalReviews || 0) + review.rating) / totalReviews;

      transaction.update(productDocRef, {
        totalReviews: totalReviews,
        averageRating: newAverageRating,
      });
    });
  } else {
    const newReviewRef = doc(collection(db, "reviews"));
    await setDoc(newReviewRef, {
      ...review,
      reviewId: newReviewRef.id,
      createdAt: Date.now(),
    });
  }
};

/**
 * Submits an order review with anti-duplication check
 */
export const addOrderReview = async (data: {
  orderId: string;
  userId: string;
  telegramId?: string;
  customerName: string;
  rating: number;
  comment?: string;
}): Promise<{ success: boolean; message: string; reviewId?: string }> => {
  try {
    const reviewRef = doc(db, "reviews", `rev_${data.orderId}`);
    const existingSnap = await getDoc(reviewRef);

    if (existingSnap.exists()) {
      return { success: false, message: "Vous avez déjà évalué cette commande." };
    }

    const reviewId = `rev_${data.orderId}`;
    const newReview: Review = {
      reviewId,
      orderId: data.orderId,
      userId: data.userId,
      telegramId: data.telegramId || '',
      customerName: data.customerName || 'Client DAVIDSTORE',
      rating: Math.min(5, Math.max(1, data.rating)),
      comment: data.comment || '',
      createdAt: Date.now()
    };

    await setDoc(reviewRef, newReview);
    return { success: true, message: "Évaluation enregistrée avec succès !", reviewId };
  } catch (err: any) {
    console.error("Error submitting order review:", err);
    return { success: false, message: err?.message || "Erreur lors de l'enregistrement de l'avis." };
  }
};

/**
 * Check if order is already reviewed
 */
export const isOrderReviewed = async (orderId: string): Promise<boolean> => {
  try {
    const reviewRef = doc(db, "reviews", `rev_${orderId}`);
    const snap = await getDoc(reviewRef);
    if (snap.exists()) return true;

    // Fallback query by orderId
    const q = query(collection(db, "reviews"), where("orderId", "==", orderId));
    const querySnap = await getDocs(q);
    return !querySnap.empty;
  } catch (e) {
    return false;
  }
};

/**
 * Fetch all reviews from Firestore sorted by date
 */
export const getAllReviews = async (): Promise<Review[]> => {
  try {
    const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ reviewId: d.id, ...d.data() } as Review));
  } catch (err) {
    console.error("Error fetching all reviews:", err);
    return [];
  }
};

/**
 * Computes statistics from reviews list
 */
export const computeReviewStats = (reviews: Review[]): ReviewStats => {
  const totalReviews = reviews.length;
  if (totalReviews === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      starCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      starPercentages: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    };
  }

  const starCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  let totalRatingSum = 0;

  reviews.forEach(r => {
    const ratingKey = Math.min(5, Math.max(1, Math.round(r.rating || 5))) as 1 | 2 | 3 | 4 | 5;
    starCounts[ratingKey] = (starCounts[ratingKey] || 0) + 1;
    totalRatingSum += r.rating || 5;
  });

  const averageRating = Number((totalRatingSum / totalReviews).toFixed(1));

  const starPercentages = {
    5: Math.round((starCounts[5] / totalReviews) * 100),
    4: Math.round((starCounts[4] / totalReviews) * 100),
    3: Math.round((starCounts[3] / totalReviews) * 100),
    2: Math.round((starCounts[2] / totalReviews) * 100),
    1: Math.round((starCounts[1] / totalReviews) * 100)
  };

  return {
    averageRating,
    totalReviews,
    starCounts,
    starPercentages
  };
};
