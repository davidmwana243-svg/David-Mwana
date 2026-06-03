import React, { useEffect, useState } from 'react';
import { Product, Category } from '../models/types';
import { getProducts, getCategories } from '../services/productService';
import { seedDatabase } from '../services/mockData';
import { ProductCard } from '../components/ProductCard';
import { Search, X, Inbox, LayoutGrid, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnnouncementBanner } from '../components/AnnouncementBanner';

export const HomeScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      const [prods, cats] = await Promise.all([getProducts(), getCategories()]);
      setProducts(prods);
      setCategories(cats);
      setIsLoading(false);
    };
    fetchData();
  }, []);

  const filteredProducts = products.filter(product => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      product.name.toLowerCase().includes(query) ||
      (product.description || '').toLowerCase().includes(query) ||
      (product.category || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="flex flex-col w-full">
      {/* Header / Search */}
      <div className="bg-orange-500 pt-6 pb-4 px-4 sticky top-0 z-20 shadow-sm">
        <div className="flex flex-col space-y-3">
          <h1 className="text-white text-xl font-black tracking-tighter">DavidSTORE</h1>
          <div className="flex-1 bg-white rounded-full flex items-center px-4 py-1.5 shadow-sm relative">
            <Search className="w-5 h-5 text-gray-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher des produits..."
              className="w-full bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400 py-1.5 pr-8 focus:ring-0"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                title="Effacer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Auto-rotating Announcement Banner */}
      <AnnouncementBanner />

      <div className="p-4 space-y-6">
        {searchQuery.trim() === '' ? (
          <>
            {/* Hero Promotional Banner */}
            <div className="w-full rounded-2xl overflow-hidden shadow-md border border-gray-100 bg-white active:scale-[0.99] transition-transform animate-in fade-in duration-300">
              <img 
                src="https://i.postimg.cc/BvfxB5DY/20260515-162721241.png" 
                alt="Promotion DavidSTORE" 
                className="w-full h-auto object-cover max-h-52 md:max-h-60"
              />
            </div>

            {/* Recommended Products */}
            <div>
              <h3 className="font-extrabold text-gray-900 mb-4 text-sm uppercase tracking-wider text-gray-500">Recommandé pour vous</h3>
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
          </>
        ) : (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-gray-900 text-sm uppercase tracking-wider text-gray-500">
                Résultats de recherche ({filteredProducts.length})
              </h3>
              <button 
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-orange-500 bg-orange-50 px-2.5 py-1 rounded-lg hover:bg-orange-100 transition-colors"
              >
                Tout afficher
              </button>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 px-6 bg-white rounded-2xl border border-gray-100 shadow-sm mt-2">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Inbox className="w-6 h-6 text-gray-400" />
                </div>
                <h4 className="font-bold text-gray-800 text-sm">Aucun produit trouvé</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  Nous n'avons trouvé aucun article correspondant à &ldquo;{searchQuery}&rdquo;. Essayez d'autres mots-clés.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-4 py-2 bg-orange-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-orange-100 active:scale-95 transition-all"
                >
                  Réinitialiser la recherche
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map(product => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
