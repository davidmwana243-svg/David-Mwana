import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { addReview } from '../../services/reviewService';
import { Star } from 'lucide-react';

export const ReviewForm: React.FC<{ productId: string }> = ({ productId }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!user) return <p className="text-sm text-gray-500">Connectez-vous pour laisser un avis.</p>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await addReview({
        productId,
        customerId: user.uid,
        customerName: user.displayName || 'Client',
        rating,
        comment,
      });
      setComment('');
      setRating(5);
    } catch (error) {
      console.error(error);
    }
    setSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((s) => (
          <button type="button" key={s} onClick={() => setRating(s)}>
            <Star className={`w-6 h-6 ${s <= rating ? 'fill-orange-400 text-orange-400' : 'text-gray-300'}`} />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        className="w-full p-2 border rounded-xl"
        placeholder="Votre avis..."
        required
      />
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Envoi...' : 'Envoyer'}
      </Button>
    </form>
  );
};
