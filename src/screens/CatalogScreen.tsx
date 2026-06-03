import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  X, 
  Smartphone, 
  Shirt, 
  ShoppingBag, 
  Smile, 
  Footprints, 
  ShoppingCart, 
  Check, 
  Sparkles, 
  SlidersHorizontal,
  Star,
  Zap,
  Flame,
  ChevronRight
} from 'lucide-react';
import { getProducts, getCategories } from '../services/productService';
import { Product, Category } from '../models/types';
import { useCart } from '../contexts/CartContext';
import { motion, AnimatePresence } from 'motion/react';

// Maps and icon styling configuration
const CATEGORY_ICONS_MAP: Record<string, React.ComponentType<any>> = {
  'electronics': Smartphone,
  'men_clothing': Shirt,
  'women_clothing': ShoppingBag,
  'kids_clothing': Smile,
  'shoes': Footprints,
};

const CATEGORIES_TRANSLATION: Record<string, string> = {
  'all': 'Tout Voir',
  'electronics': 'Électronique',
  'men_clothing': 'Mode Homme',
  'women_clothing': 'Mode Femme',
  'kids_clothing': 'Pour Enfants',
  'shoes': 'Chaussures',
};

export const CatalogScreen: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart, items } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Visual states
  const [addedProductId, setAddedProductId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'default' | 'priceLow' | 'priceHigh' | 'rating'>('default');

  useEffect(() => {
    const loadCatalogData = async () => {
      setIsLoading(true);
      try {
        const [loadedProds, loadedCats] = await Promise.all([
          getProducts(),
          getCategories()
        ]);
        setProducts(loadedProds);
        setCategories(loadedCats);
      } catch (error) {
        console.error("Error loading catalog:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadCatalogData();
  }, []);

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    setAddedProductId(product.id);
    // Auto reset added toast animation
    setTimeout(() => {
      setAddedProductId(null);
    }, 1800);
  };

  // Filter & Search Logic
  const filteredProducts = products.filter(prod => {
    const matchesCategory = selectedCategory === 'all' || prod.category === selectedCategory;
    const matchesSearch = 
      prod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Sorting logic
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'priceLow') return a.price - b.price;
    if (sortBy === 'priceHigh') return b.price - a.price;
    return 0; // default (createdAt / salesCount)
  });

  return (
    <div className="flex flex-col w-full min-h-screen bg-gray-50 text-gray-800 pb-12">
      {/* Search Header - DavidSTORE Blue Styled */}
      <div className="w-full bg-blue-600 text-white p-4 pb-5 rounded-b-[2rem] shadow-md relative z-10">
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-1.5 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white"
            title="Retour"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          
          <div className="text-center flex-1">
            <h1 className="text-lg font-black tracking-tight flex items-center justify-center gap-1">
              <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
              <span>GRAND CATALOGUE</span>
            </h1>
            <p className="text-[10px] text-blue-100 uppercase tracking-widest font-extrabold opacity-90">DavidStore • Qualité & Excellence</p>
          </div>

          <div className="relative">
            <button 
              onClick={() => navigate('/cart')}
              className="p-2 rounded-full hover:bg-white/10 active:scale-95 transition-all text-white relative"
              title="Panier"
            >
              <ShoppingCart className="w-5.5 h-5.5" />
              {items.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-400 text-blue-950 font-black text-[9px] w-4.5 h-4.5 rounded-full flex items-center justify-center border border-blue-600 animate-bounce">
                  {items.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Custom Search Box */}
        <div className="relative w-full shadow-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-blue-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher des articles de qualité..."
            className="w-full bg-white border-0 outline-none text-sm text-gray-800 placeholder-gray-400 pl-11 pr-10 py-3 rounded-full focus:ring-2 focus:ring-amber-400 focus:outline-none shadow-inner transition-all font-medium"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 rounded-full active:bg-gray-100 transition-colors"
              title="Effacer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Premium Category Tabs */}
      <div className="w-full mt-4 overflow-x-auto whitespace-nowrap scrollbar-none px-4 select-none">
        <div className="flex gap-2">
          {/* "All" Category Tab */}
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 border active:scale-95 ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100 font-extrabold'
                : 'bg-white text-gray-600 border-gray-100 hover:text-gray-800'
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${selectedCategory === 'all' ? 'text-amber-300' : 'text-orange-500'}`} />
            Tout voir
          </button>

          {/* Individual standard Category Tabs */}
          {categories.map((cat) => {
            const Icon = CATEGORY_ICONS_MAP[cat.id] || ShoppingBag;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-1.5 border active:scale-95 ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-100 font-extrabold'
                    : 'bg-white text-gray-600 border-gray-100 hover:text-gray-800'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-300' : 'text-blue-500'}`} />
                {cat.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Sorting Filter and Promo Bar */}
      <div className="px-4 mt-4 flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
          <span>Trier :</span>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value as any)}
            className="font-bold text-gray-700 bg-transparent border-none outline-none focus:ring-0 text-xs py-0 pl-1 cursor-pointer"
          >
            <option value="default">Recommandé</option>
            <option value="priceLow">Prix croissant</option>
            <option value="priceHigh">Prix décroissant</option>
          </select>
        </div>
        <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full flex items-center gap-1 animate-pulse">
          <Zap className="w-3 h-3 text-orange-500" />
          Offre dès 50k FC !
        </div>
      </div>

      {/* Product Grid Area with Smooth Scrolling */}
      <div className="px-4 mt-3 flex-1">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-2xl aspect-[3/4.2] border border-gray-100 p-3 space-y-3 animate-pulse">
                <div className="w-full aspect-square bg-gray-100 rounded-xl" />
                <div className="h-4 bg-gray-100 rounded w-5/6" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-9 bg-gray-100 rounded-lg w-full" />
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-inner mt-4">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShoppingBag className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="font-bold text-gray-800 text-sm">Aucun article disponible</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto px-4">
              Aucun produit ne correspond à vos critères de recherche dans cette sélection.
            </p>
            <button 
              onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
              className="mt-4 px-4 py-2 bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-100 active:scale-95 transition-all"
            >
              Réinitialiser les filtres
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {sortedProducts.map((prod) => {
              const inCart = items.find(item => item.product.id === prod.id);
              
              return (
                <div 
                  key={prod.id} 
                  onClick={() => navigate(`/product/${prod.id}`)}
                  className="bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-blue-200 hover:shadow-lg transition-all flex flex-col active:scale-[0.99] cursor-pointer relative shadow-sm"
                >
                  {/* Image Block */}
                  <div className="relative aspect-square bg-gray-50 overflow-hidden">
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      loading="lazy"
                      className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                    />


                    {/* Star rating display removed per user request */}
                  </div>

                  {/* Content Block */}
                  <div className="p-3 flex flex-col flex-1">
                    {/* Category tag */}
                    <span className="text-[9px] text-blue-600 font-extrabold tracking-wider uppercase mb-1">
                      {CATEGORIES_TRANSLATION[prod.category] || prod.category}
                    </span>

                    <h3 className="text-sm text-gray-800 font-bold line-clamp-2 leading-tight mb-2 min-h-[2.2rem]">
                      {prod.name}
                    </h3>

                    <div className="mt-auto space-y-2">
                      {/* Price rendering */}
                      <div>
                        <div className="text-blue-600 text-sm font-black flex items-center gap-0.5">
                          <span>{Number(prod.price || 0).toLocaleString()}</span>
                          <span className="text-[10px] font-extrabold">FC</span>
                        </div>
                      </div>

                      {/* Add to Cart Premium Action Button */}
                      <button
                        onClick={(e) => handleAddToCart(prod, e)}
                        className={`w-full py-2 px-1.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 active:scale-95 shadow-md ${
                          inCart 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-100 hover:shadow-lg'
                        }`}
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>{inCart ? `Ajouté (${inCart.quantity})` : 'Commander'}</span>
                        {inCart && <Check className="w-3 h-3 text-emerald-500 stroke-[3]" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Add Toast Feedback */}
      <AnimatePresence>
        {addedProductId && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 text-white px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold"
            >
              <div className="w-4.5 h-4.5 bg-emerald-500 rounded-full flex items-center justify-center">
                <Check className="w-3 h-3 text-white stroke-[3.5]" />
              </div>
              <span className="tracking-wide">Ajouté au panier avec succès !</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
