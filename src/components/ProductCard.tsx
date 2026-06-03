import React from 'react';
import { Product } from '../models/types';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  return (
    <Link to={`/product/${product.id}`} className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 flex flex-col hover:shadow-md transition-shadow">
      <div className="relative aspect-square">
        <img 
          src={product.imageUrl} 
          alt={product.name} 
          className="w-full h-full object-cover"
        />
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="text-sm text-gray-800 font-medium line-clamp-2 leading-tight mb-2">
          {product.name}
        </h3>
        
        <div className="mt-auto">
          <div className="flex items-center space-x-1 mb-1">
            <span className="text-orange-500 text-lg font-bold">
              {Number(product.price || 0).toLocaleString()} FC
            </span>
          </div>
          
          {/* Sales count removed per user request */}
        </div>
      </div>
    </Link>
  );
};
