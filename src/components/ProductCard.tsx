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
              {product.price.toFixed(2)} FC
            </span>
          </div>
          
          <div className="flex items-center text-xs text-gray-500">
            <Star className="w-3 h-3 fill-orange-400 text-orange-400 mr-1" />
            <span>{product.rating}</span>
            <span className="mx-1">•</span>
            <span>{product.salesCount.toLocaleString()} sold</span>
          </div>
        </div>
      </div>
    </Link>
  );
};
