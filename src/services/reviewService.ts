import { db } from "../firebase";
import { 
  collection, 
  doc, 
  runTransaction 
} from "firebase/firestore";
import { Review, Product } from "../types";

export const addReview = async (review: Omit<Review, 'reviewId' | 'createdAt'>) => {
  const reviewsRef = collection(db, "reviews");
  const productRef = collection(db, "products").withConverter({
    toFirestore: (data: Product) => data,
    fromFirestore: (snap) => snap.data() as Product,
  }); // Need actual product ref
  
  // Actually, I need the document reference for the specific product
  const productDocRef = doc(db, "products", review.productId);

  await runTransaction(db, async (transaction) => {
    const productDoc = await transaction.get(productDocRef);
    if (!productDoc.exists()) throw new Error("Product not found");

    const product = productDoc.data() as Product;
    
    // Add review
    const newReviewRef = doc(collection(db, "reviews"));
    transaction.set(newReviewRef, {
      ...review,
      reviewId: newReviewRef.id,
      createdAt: Date.now(),
    });

    // Update Product stats
    const totalReviews = (product.totalReviews || 0) + 1;
    const newAverageRating = 
      ((product.averageRating || 0) * (product.totalReviews || 0) + review.rating) / totalReviews;

    transaction.update(productDocRef, {
      totalReviews: totalReviews,
      averageRating: newAverageRating,
    });
  });
};
