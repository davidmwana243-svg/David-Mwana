import React from 'react';
import { Product } from '../../types';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <Link to={`/product/${product.id}`} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow h-full">
      <div className="relative w-full pt-[100%] overflow-hidden bg-gray-100">
        <img 
          src={product.imageUrl} 
          alt={product.name} 
          className="absolute inset-0 w-full h-full object-cover"
          onError={(e) => {
            e.currentTarget.src = 'https://placehold.co/400x400/e2e8f0/64748b?text=Image+Indisponible';
          }}
        />
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="text-sm text-gray-800 font-bold line-clamp-2 leading-tight mb-2 min-h-[2.5rem]">
          {product.name}
        </h3>
        
        <div className="mt-auto">
          <div className="flex items-center space-x-1 mb-1">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-xs font-bold text-gray-700">
              {product.averageRating?.toFixed(1) || '0.0'}
            </span>
            <span className="text-xs text-gray-400">
              ({product.totalReviews || 0})
            </span>
          </div>
          <div className="flex items-center space-x-1 mb-1">
            <span className="text-blue-600 text-sm font-black">
              {Number(product.price || 0).toLocaleString()} <span className="text-[10px]">FC</span>
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
};
