import React, { useEffect, useState } from 'react';
import { Category } from '../models/types';
import { getCategories } from '../services/productService';

import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CategoriesScreen: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCats = async () => {
      const cats = await getCategories();
      setCategories(cats);
      setIsLoading(false);
    };
    fetchCats();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10 border-b border-gray-100 flex items-center">
        <button onClick={() => navigate(-1)} className="mr-3">
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1 text-center pr-8">Toutes les catégories</h1>
      </div>

      <div className="flex-1 p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bg-gray-200 h-32 rounded-xl animate-pulse"></div>)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => (
              <div key={cat.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col items-center p-4 cursor-pointer hover:shadow-md transition">
                <div className="w-20 h-20 mb-3 rounded-full bg-gray-50 overflow-hidden border border-gray-100">
                  <img src={cat.imageUrl} alt={cat.name} className="w-full h-full object-cover" />
                </div>
                <h3 className="font-medium text-gray-900 text-sm text-center">{cat.name}</h3>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
