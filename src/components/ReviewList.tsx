import React from 'react';
import { useProductReviews } from '../hooks/useProductReviews';
import { Star, MessageSquare } from 'lucide-react';

export const ReviewList: React.FC<{ productId: string }> = ({ productId }) => {
  const { reviews, loading } = useProductReviews(productId);

  if (loading) {
    return (
      <div className="flex items-center space-x-2 py-4 text-xs text-gray-400 font-bold uppercase tracking-wider justify-center">
        <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Chargement des commentaires...</span>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 px-4 bg-gray-50 rounded-2xl border border-gray-100 flex flex-col items-center justify-center">
        <MessageSquare className="w-8 h-8 text-gray-300 mb-2" />
        <p className="text-xs text-gray-550 font-bold">Aucun avis pour l'instant</p>
        <p className="text-[10px] text-gray-400 mt-0.5 leading-normal max-w-[200px]">Soyez le premier à commander et donner votre note depuis l'historique de vos commandes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {reviews.map((review) => {
        const initials = review.customerName ? review.customerName.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'CL';
        const reviewDate = review.createdAt ? new Date(review.createdAt).toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }) : '';

        return (
          <div key={review.reviewId} className="bg-gray-50/50 p-3.5 rounded-2xl border border-gray-100 transition-all hover:bg-gray-50">
            <div className="flex justify-between items-start gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xs font-black shrink-0 font-sans">
                  {initials}
                </div>
                <div>
                  <span className="font-extrabold text-xs text-gray-800 block leading-tight">{review.customerName}</span>
                  {reviewDate && (
                    <span className="text-[9px] text-gray-450 block font-medium mt-0.5">{reviewDate}</span>
                  )}
                </div>
              </div>
              <div className="flex items-center bg-white shadow-sm border border-gray-100 px-1.5 py-0.5 rounded-lg shrink-0">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} className={`w-2.5 h-2.5 ${s <= review.rating ? 'fill-orange-400 text-orange-400' : 'text-gray-250'}`} />
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-650 leading-relaxed font-sans mt-2.5 pl-0.5 font-medium">
              {review.comment}
            </p>
          </div>
        );
      })}
    </div>
  );
};
