import React, { useEffect, useState } from 'react';
import { 
  Star, 
  MessageSquare, 
  Award, 
  TrendingUp, 
  Search, 
  Filter, 
  ShoppingBag,
  User,
  Calendar,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../../firebase';
import { Review } from '../../types';
import { computeReviewStats, ReviewStats } from '../../services/reviewService';
import { formatSafeDateShort } from '../../utils/dateUtils';

export const AdminReviewsScreen: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRatingFilter, setSelectedRatingFilter] = useState<number | 'all'>('all');

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'reviews'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetched: Review[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push({ reviewId: docSnap.id, ...docSnap.data() } as Review);
      });
      setReviews(fetched);
      setLoading(false);
    }, (err) => {
      console.error("Error subscribing to reviews:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const stats: ReviewStats = computeReviewStats(reviews);

  const filteredReviews = reviews.filter((r) => {
    const matchesSearch = 
      (r.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.orderId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.comment || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRating = 
      selectedRatingFilter === 'all' || Math.round(r.rating || 5) === selectedRatingFilter;

    return matchesSearch && matchesRating;
  });

  const satisfactionRate = stats.totalReviews > 0
    ? Math.round(((stats.starCounts[5] + stats.starCounts[4]) / stats.totalReviews) * 100)
    : 0;

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-blue-600 font-extrabold text-xs tracking-wider uppercase mb-1">
            <Award className="w-4 h-4" />
            <span>EXPERT-CLIENT DAVIDSTORE</span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Évaluations & Satisfaction Clients
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Suivi en temps réel des avis et notes déposés après livraison.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2.5 rounded-2xl border border-blue-100 font-bold text-xs">
          <CheckCircle2 className="w-4 h-4 text-blue-600 animate-pulse" />
          <span>{stats.totalReviews} évaluation{stats.totalReviews > 1 ? 's' : ''} enregistré{stats.totalReviews > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* KPI Cards & Star Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Metric 1: Average Rating */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-6 rounded-3xl shadow-lg shadow-blue-100 relative overflow-hidden flex flex-col justify-between">
          <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-blue-200">Note Moyenne Globale</span>
            <div className="flex items-baseline gap-3 mt-3">
              <span className="text-5xl font-black tracking-tight">{stats.averageRating}</span>
              <span className="text-lg font-bold text-blue-200">/ 5.0</span>
            </div>
            
            <div className="flex items-center gap-1 mt-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  className={`w-6 h-6 ${
                    star <= Math.round(stats.averageRating)
                      ? 'fill-amber-400 text-amber-400' 
                      : 'text-blue-300/40'
                  }`} 
                />
              ))}
            </div>
          </div>

          <p className="text-xs text-blue-100 font-medium mt-6 pt-4 border-t border-white/10">
            Calculée sur l'ensemble des commandes confirmées.
          </p>
        </div>

        {/* Metric 2: Satisfaction Rate */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400">Taux de Satisfaction</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-4xl font-black text-gray-900">{satisfactionRate}%</span>
              <p className="text-xs text-gray-500 font-medium mt-1">Clients satisfaits (4★ et 5★)</p>
            </div>
          </div>

          <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden mt-6">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${satisfactionRate}%` }} 
            />
          </div>
        </div>

        {/* Rating Breakdown Bars */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-2.5">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-gray-400 mb-3">
            Répartition des Étoiles
          </h3>

          {([5, 4, 3, 2, 1] as const).map((star) => {
            const pct = stats.starPercentages[star];
            const count = stats.starCounts[star];

            return (
              <div key={star} className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1 w-12 font-bold text-gray-700">
                  <span>{star}</span>
                  <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                </div>

                <div className="flex-1 bg-gray-100 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      star >= 4 ? 'bg-amber-400' : star === 3 ? 'bg-blue-400' : 'bg-rose-400'
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                <div className="w-16 text-right font-semibold text-gray-500">
                  <span>{pct}%</span>
                  <span className="text-[10px] text-gray-400 ml-1">({count})</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un avis, client, commande..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-none focus:border-blue-500"
          />
        </div>

        {/* Rating Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedRatingFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedRatingFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Tous ({reviews.length})
          </button>
          {([5, 4, 3, 2, 1] as const).map((star) => (
            <button
              key={star}
              onClick={() => setSelectedRatingFilter(star)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-all ${
                selectedRatingFilter === star
                  ? 'bg-amber-500 text-white shadow-sm shadow-amber-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>{star}</span>
              <Star className="w-3 h-3 fill-current" />
            </button>
          ))}
        </div>
      </div>

      {/* Reviews List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-500" />
            <p className="text-xs font-medium">Chargement des évaluations...</p>
          </div>
        ) : filteredReviews.length === 0 ? (
          <div className="p-12 text-center text-gray-400 space-y-3">
            <MessageSquare className="w-10 h-10 mx-auto text-gray-300" />
            <p className="text-sm font-bold text-gray-700">Aucune évaluation trouvée</p>
            <p className="text-xs text-gray-400">Les avis soumis par les clients après livraison s'afficheront ici.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredReviews.map((rev) => {
              const orderShort = rev.orderId
                ? (rev.orderId.length > 12 ? `#DS-${rev.orderId.slice(-8).toUpperCase()}` : `#DS-${rev.orderId}`)
                : 'Commande';

              return (
                <div key={rev.reviewId} className="p-5 hover:bg-gray-50/50 transition-colors flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-4 h-4 ${
                              s <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'
                            }`}
                          />
                        ))}
                      </div>

                      <span className="text-xs font-black text-gray-900 bg-gray-100 px-2.5 py-1 rounded-lg">
                        {rev.customerName || 'Client DAVIDSTORE'}
                      </span>

                      <span className="text-[11px] font-extrabold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100">
                        {orderShort}
                      </span>
                    </div>

                    {rev.comment ? (
                      <p className="text-xs text-gray-700 font-medium bg-gray-50 p-3 rounded-2xl border border-gray-100 italic">
                        "{rev.comment}"
                      </p>
                    ) : (
                      <p className="text-xs text-gray-400 font-medium italic">
                        Aucun commentaire rédigé.
                      </p>
                    )}
                  </div>

                  <div className="text-right text-[10px] font-semibold text-gray-400 flex items-center gap-1 self-end md:self-center">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    <span>{formatSafeDateShort(rev.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
