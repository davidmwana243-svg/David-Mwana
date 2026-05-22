import React, { useEffect, useState } from 'react';
import { Product, Category } from '../models/types';
import { getProducts, getCategories } from '../services/productService';
import { seedDatabase } from '../services/mockData';
import { ProductCard } from '../components/ProductCard';
import { Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const HomeScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      // Setup DB on first load for demo purposes
      await seedDatabase();
      const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prods);
      setCategories(cats);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  return (
    <div className="flex flex-col w-full">
      {/* Header / Search */}
      <div className="bg-orange-500 pt-6 pb-4 px-4 sticky top-0 z-20 shadow-sm">
        <div className="flex flex-col space-y-3">
          <h1 className="text-white text-xl font-black tracking-tighter">DavidSTORE</h1>
          <div 
            onClick={() => navigate('/categories')}
            className="flex-1 bg-white rounded-full flex items-center px-4 py-2.5 shadow-sm cursor-text"
          >
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-gray-400 text-sm">Rechercher des produits...</span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Recommended Products */}
        <div>
          <h3 className="font-bold text-gray-900 mb-4">Recommandé pour vous</h3>
          {isLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-gray-100 rounded-xl aspect-[3/4] animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {products.map(product => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
