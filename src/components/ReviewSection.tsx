import React, { useState } from 'react';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { Star } from 'lucide-react';

interface Review {
  rating: number;
  comment: string;
  createdAt: any;
}

interface ReviewSectionProps {
  txId: string;
  isBuyer: boolean;
  isSeller: boolean;
  buyerReview?: Review;
  sellerReview?: Review;
  user: any;
}

export default function ReviewSection({ txId, isBuyer, isSeller, buyerReview, sellerReview, user }: ReviewSectionProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);

  const isReviewSubmitted = isBuyer ? !!buyerReview : (isSeller ? !!sellerReview : false);
  const existingReview = isBuyer ? buyerReview : sellerReview;
  const otherPartyReview = isBuyer ? sellerReview : buyerReview;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !txId || !user) return;

    setLoading(true);
    try {
      const txRef = doc(db, 'transactions', txId);
      const reviewData = {
        rating,
        comment,
        createdAt: serverTimestamp()
      };

      if (isBuyer) {
        await updateDoc(txRef, { buyerReview: reviewData });
      } else if (isSeller) {
        await updateDoc(txRef, { sellerReview: reviewData });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `transactions/${txId}`, { currentUser: user });
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (currentRating: number, interactive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive || loading}
            onClick={() => interactive && setRating(star)}
            onMouseEnter={() => interactive && setHoverRating(star)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            className={`${interactive ? 'cursor-pointer hover:scale-110 transition-transform' : 'cursor-default'}`}
          >
            <Star
              className={`w-6 h-6 ${
                star <= (interactive ? (hoverRating || rating) : currentRating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (!isBuyer && !isSeller) return null;

  return (
    <div className="bg-white p-6 rounded-2xl border border-divider space-y-6 mt-6">
      <h3 className="font-semibold text-gray-900 text-lg">Ulasan Transaksi</h3>
      
      {/* Form to submit review */}
      {!isReviewSubmitted && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Berikan Penilaian Anda
            </label>
            {renderStars(rating, true)}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Komentar (Opsional)
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Bagaimana pengalaman Anda dengan transaksi ini?"
              className="w-full px-4 py-3 rounded-xl border border-pencil focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none h-24"
              disabled={loading}
            />
          </div>
          <button
            type="submit"
            disabled={loading || rating === 0}
            className="btn-primary w-full"
          >
            {loading ? 'Menyimpan...' : 'Kirim Ulasan'}
          </button>
        </form>
      )}

      {/* Display user's own review */}
      {isReviewSubmitted && existingReview && (
        <div className="bg-paper-alt p-4 rounded-xl border border-divider">
          <div className="flex justify-between items-start mb-2">
            <span className="font-medium text-gray-900">Ulasan Anda</span>
            {renderStars(existingReview.rating)}
          </div>
          {existingReview.comment && (
            <p className="text-gray-600 text-sm mt-2">{existingReview.comment}</p>
          )}
        </div>
      )}

      {/* Display other party's review */}
      {otherPartyReview && (
        <div className="bg-paper-alt p-4 rounded-xl border border-divider">
          <div className="flex justify-between items-start mb-2">
            <span className="font-medium text-gray-900">
              Ulasan dari {isBuyer ? 'Penjual' : 'Pembeli'}
            </span>
            {renderStars(otherPartyReview.rating)}
          </div>
          {otherPartyReview.comment && (
            <p className="text-gray-600 text-sm mt-2">{otherPartyReview.comment}</p>
          )}
        </div>
      )}
      
      {!otherPartyReview && isReviewSubmitted && (
         <p className="text-sm text-gray-500 italic text-center">
           Menunggu ulasan dari {isBuyer ? 'penjual' : 'pembeli'}...
         </p>
      )}
    </div>
  );
}
