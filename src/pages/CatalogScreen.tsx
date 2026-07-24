import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  X, 
  ShoppingCart, 
  Check, 
  Heart,
  ChevronRight,
  Sparkles,
  ArrowUpDown,
  Compass,
  Zap,
  Star
} from 'lucide-react';
import { getProducts, getCategories } from '../services/productService';
import { db } from '../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { Product, Category } from '../types';
import { useCart } from '../context/CartContext';
import { motion, AnimatePresence } from 'motion/react';

const FILTER_OPTIONS = [
  { id: 'recom', label: 'Recommandé' },
  { id: 'nouveau', label: 'Nouveautés' },
  { id: 'promo', label: 'Promotions' },
  { id: 'populaire', label: 'Populaires' },
  { id: 'prix_bas', label: 'Prix bas' },
  { id: 'prix_haut', label: 'Prix élevés' }
];

export const CatalogScreen: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart, items: cartItems } = useCart();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<string>('recom');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [categoriesLoaded, setCategoriesLoaded] = useState<boolean>(false);
  const [productsLoaded, setProductsLoaded] = useState<boolean>(false);
  
  // Custom interactive animations states
  const [addedProductId, setAddedProductId] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);

    // Load categories
    getCategories().then(cats => {
      const seen = new Set<string>();
      const uniqueCats: Category[] = [];
      cats.forEach(c => {
        if (c && c.id && !seen.has(c.id)) {
          seen.add(c.id);
          uniqueCats.push(c);
        }
      });
      setCategories(uniqueCats);
      setCategoriesLoaded(true);
    }).catch(console.error);

    // Real-time products listener
    const q = collection(db, 'products');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach(docSnap => {
        prods.push({ ...docSnap.data(), id: docSnap.id } as Product);
      });
      
      const uniqueProds: Product[] = [];
      const seen = new Set<string>();
      prods.forEach(p => {
        if (p && p.id && !seen.has(p.id)) {
          seen.add(p.id);
          uniqueProds.push(p);
        }
      });
      
      const sortedProds = uniqueProds.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      
      setProducts(sortedProds);
      setProductsLoaded(true);
    }, (error) => {
      console.error("Real-time products listing failed, falling back to static fetch", error);
      getProducts().then(prods => {
        setProducts(prods);
        setProductsLoaded(true);
      });
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (categoriesLoaded && productsLoaded) {
      setIsLoading(false);
    }
  }, [categoriesLoaded, productsLoaded]);

  const handleAddToCart = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    setAddedProductId(product.id);
    
    // Smooth reset for success alert
    setTimeout(() => {
      setAddedProductId(null);
    }, 2000);
  };

    // Helper function to translate category into human labels dynamically
    const getProductCategoryLabelByRef = (product: Product): string => {
      // Check if the product's category matches one of the dynamic categories
      const categoryInfo = categories.find(c => c.id === product.category);
      if (categoryInfo && categoryInfo.name) {
        return categoryInfo.name;
      }
  
      const nameLower = product.name?.toLowerCase() || '';
      
      // Explicit checks matching requested examples and common items
      if (nameLower.includes('phone') || nameLower.includes('téléphone') || nameLower.includes('galaxy') || nameLower.includes('smartphone')) {
        return 'Téléphones';
      }
      if (nameLower.includes('pc') || nameLower.includes('ordinateur') || nameLower.includes('laptop') || nameLower.includes('macbook') || nameLower.includes('elitebook') || nameLower.includes('casque') || nameLower.includes('écouteur') || nameLower.includes('ecouteur')) {
        return 'Électronique';
      }
      if (product.category === 'electronics') {
        return 'Électronique';
      }
      if (product.category === 'men_clothing') {
        return 'Mode Homme';
      }
      if (product.category === 'women_clothing') {
        return 'Femme';
      }
      if (product.category === 'kids_clothing') {
        return 'Enfants';
      }
      if (product.category === 'shoes') {
        return 'Chaussures';
      }
      if (product.category === 'home') {
        return 'Maison';
      }
      
      return product.category && product.category !== 'all' && product.category !== 'c1' 
        ? product.category.charAt(0).toUpperCase() + product.category.slice(1) 
        : 'Divers';
    };

  // 1. Category Filter Logic
  const categorizedProducts = products.filter(prod => {
    if (selectedCategoryId === 'all') return true;
    return prod.category === selectedCategoryId;
  });

  // 2. Search Filter Logic 
  const searchedProducts = categorizedProducts.filter(prod => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      prod.name.toLowerCase().includes(query) ||
      (prod.description || '').toLowerCase().includes(query) ||
      (prod.category || '').toLowerCase().includes(query)
    );
  });

  // 3. Selection Filter & Sort Logic 
  // Options: Recommandé, Nouveautés, Promotions, Populaires, Prix bas, Prix élevés
  const processedProducts = [...searchedProducts].sort((a, b) => {
    if (selectedFilter === 'prix_bas') {
      return a.price - b.price;
    }
    if (selectedFilter === 'prix_haut') {
      return b.price - a.price;
    }
    if (selectedFilter === 'nouveau') {
      return b.createdAt - a.createdAt;
    }
    if (selectedFilter === 'populaire') {
      return (b.salesCount || b.rating || 0) - (a.salesCount || a.rating || 0);
    }
    if (selectedFilter === 'promo') {
      // Prioritize items with configured originalPrice higher than price, or greater percentage discount
      const discountA = a.originalPrice ? (a.originalPrice - a.price) : 0;
      const discountB = b.originalPrice ? (b.originalPrice - b.price) : 0;
      return discountB - discountA;
    }
    // 'recom' - Default
    return 0;
  });

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#F8F9FA] pb-24 relative font-sans text-gray-800">
      
      {/* HEADER PREMIUM DÉGRADÉ BLEU FONCÉ À BLEU ROYAL */}
      <header className="bg-gradient-to-r from-[#002B7F] to-[#0057FF] text-white px-4 py-5 rounded-b-[24px] shadow-lg sticky top-0 z-40">
        <div className="flex items-center justify-between pb-4">
          <button 
            onClick={() => navigate('/home')} 
            className="p-2 rounded-xl bg-white/10 hover:bg-white/25 active:scale-95 transition-all text-white shrink-0"
            title="Retour à l'accueil"
            id="back-to-home-btn"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          
          <div className="text-center flex-1 px-3">
            <h1 className="text-lg font-black tracking-tight uppercase flex items-center justify-center gap-1 font-sans">
              <Sparkles className="w-4.5 h-4.5 text-[#FFC107] animate-pulse shrink-0" />
              <span>GRAND CATALOGUE</span>
            </h1>
            <p className="text-[9px] text-blue-100 font-extrabold tracking-widest uppercase mt-0.5">
              DAVIDSTORE • ACHETEZ PLUS, PAYEZ MOINS
            </p>
          </div>

          <button 
            onClick={() => navigate('/cart')}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/25 active:scale-95 transition-all text-white relative shrink-0"
            title="Panier d'achat"
          >
            <ShoppingCart className="w-5 h-5 stroke-[2]" />
            {cartItems.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-[#FFC107] text-[#002B7F] font-black text-[9px] w-5 h-5 rounded-full flex items-center justify-center border border-[#002B7F] shadow-md animate-bounce">
                {cartItems.reduce((acc, curr) => acc + curr.quantity, 0)}
              </span>
            )}
          </button>
        </div>

        {/* BARRE DE RECHERCHE LARGEUR 100% BLANCHE ARRONDIE 20PX */}
        <div className="relative w-full shadow-md rounded-[20px] bg-white text-gray-900 group border border-blue-200/50">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un produit..."
            className="w-full bg-white border-0 outline-none text-sm text-gray-800 placeholder-gray-400 pl-11 pr-10 py-3.5 rounded-[20px] focus:ring-2 focus:ring-[#FFC107] focus:outline-none transition-all font-medium"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0057FF] stroke-[2.2]" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-700 rounded-full active:bg-gray-100 transition-colors"
              title="Effacer la recherche"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* FILTER & OPTION CAROUSEL AREA */}
      <section className="px-4 mt-5 space-y-4">
        
        {/* CATEGORY SELECTOR CAROUSEL TO ENRICH THE USER CLICKS */}
        <div className="flex gap-2.5 overflow-x-auto scrollbar-none pb-1 font-sans select-none">
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 ${
              selectedCategoryId === 'all'
                ? 'bg-[#002B7F] text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-100 hover:text-gray-900'
            }`}
          >
            🌟 Tout voir
          </button>
          {categories
            .filter(cat => products.some(p => p.category === cat.id))
            .map((cat) => {
            const emojis: Record<string, string> = {
              'electronics': '💻 Électronique',
              'men_clothing': '👕 Hommes',
              'women_clothing': '👗 Femmes',
              'kids_clothing': '👶 Enfants',
              'shoes': '👟 Chaussures',
            };
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-4 py-2 rounded-full text-xs font-bold shrink-0 transition-all active:scale-95 ${
                  selectedCategoryId === cat.id
                    ? 'bg-[#002B7F] text-white shadow-sm'
                    : 'bg-white text-gray-600 border border-gray-100 hover:text-gray-900'
                }`}
              >
                {emojis[cat.id] || `🔥 ${cat.name}`}
              </button>
            );
          })}
        </div>
      </section>

      {/* PRODUCTS DISPLAY GRID (2 Columns grid) */}
      <main className="px-4 mt-5 flex-1">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={`skeleton-${i}`} className="bg-white rounded-[20px] aspect-[1/1.45] border border-gray-100 p-3 space-y-3 animate-pulse">
                <div className="w-full h-[65%] bg-gray-100 rounded-[15px]" />
                <div className="h-4 bg-gray-100 rounded w-4/5" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
                <div className="h-8 bg-gray-100 rounded-[12px] w-full" />
              </div>
            ))}
          </div>
        ) : processedProducts.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[24px] border border-gray-100 shadow-sm mt-2 px-6">
            <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Compass className="w-7 h-7 text-[#0057FF]" />
            </div>
            <h3 className="font-extrabold text-gray-800 text-sm">Pas de produits correspondants</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
              Nous n'avons trouvé aucun article correspondant à &ldquo;{searchQuery || selectedFilter}&rdquo; dans cette catégorie.
            </p>
            <button 
              onClick={() => { setSelectedCategoryId('all'); setSelectedFilter('recom'); setSearchQuery(''); }}
              className="mt-5 px-5 py-2.5 bg-[#0057FF] hover:bg-[#002B7F] text-white font-extrabold text-xs rounded-xl shadow-lg shadow-blue-100 active:scale-95 transition-all"
            >
              Voir tout le catalogue
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4" id="catalogue-vertical-grid">
            {processedProducts.map((prod) => {
              const inCart = cartItems.find(item => item.product.id === prod.id);
              const hasDiscount = prod.originalPrice && prod.originalPrice > prod.price;
              const discountPercent = hasDiscount && prod.originalPrice 
                ? Math.round(((prod.originalPrice - prod.price) / prod.originalPrice) * 100) 
                : 0;

              return (
                <div 
                  key={prod.id}
                  onClick={() => navigate(`/product/${prod.id}`)}
                  className="bg-white rounded-[20px] overflow-hidden border border-gray-100/80 shadow-sm hover:shadow-md transition-all flex flex-col active:scale-[0.98] cursor-pointer h-96 group relative"
                  title="Voir le produit"
                >
                  
                  {/* PRODUCT IMAGE: Occupies 65% of the card height */}
                  <div className="relative h-[65%] w-full bg-[#F5F5F5] overflow-hidden rounded-t-[20px]">
                    <img
                      src={prod.imageUrl}
                      alt={prod.name}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = 'https://placehold.co/400x500/e2e8f0/64748b?text=DavidSTORE';
                      }}
                    />

                    {/* BADGE CATÉGORIE PREMIUM: Fond bleu foncé #002B7F, texte blanc */}
                    <div className="absolute top-2.5 left-2.5 bg-[#002B7F] text-white text-[9.5px] font-extrabold uppercase px-2.5 py-1 rounded-full shadow-sm z-10 tracking-wider">
                      {getProductCategoryLabelByRef(prod)}
                    </div>

                    {/* RATING DISPLAY IN OVERLAY */}
                    <div className="absolute bottom-2 left-2.5 bg-black/50 backdrop-blur-xs text-white text-[9px] font-black px-1.5 py-0.5 rounded flex items-center gap-0.5">
                      <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                      <span>{(prod.rating ?? 0).toFixed(1)}</span>
                    </div>
                  </div>

                  {/* PRODUCT METADATA BLOCK: Occupies 35% of the card height */}
                  <div className="h-[35%] p-3 text-left flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs text-gray-800 font-extrabold line-clamp-1 leading-tight tracking-tight hover:text-[#0057FF] transition-colors">
                        {prod.name}
                      </h3>
                      <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5 leading-tight">
                        {prod.description || 'Produit premium sélectionné disponible en stock'}
                      </p>
                    </div>

                    <div className="space-y-1.5 mt-auto">
                      {/* Price Render: Blue foncé #002B7F */}
                      <div className="flex items-baseline gap-1">
                        <span className="font-extrabold text-[15px] text-[#002B7F] tracking-tight">
                          {Number(prod.price).toLocaleString()} FC
                        </span>
                      </div>

                      {/* Yellow Golden add to cart action button (#FFC107) */}
                      <button
                        onClick={(e) => handleAddToCart(prod, e)}
                        className={`w-full py-2 px-1.5 rounded-xl text-[9.5px] font-black tracking-wider transition-all shadow-xs flex items-center justify-center gap-1 active:scale-95 duration-200 cursor-pointer text-black ${
                          inCart 
                            ? 'bg-green-50 text-green-700 border border-green-200'
                            : 'bg-[#FFC107] hover:bg-[#FFB300] active:scale-95 text-black font-black uppercase'
                        }`}
                      >
                        <span>{inCart ? `AJOUTÉ (${inCart.quantity})` : 'AJOUTER AU PANIER'}</span>
                        {inCart && <Check className="w-3 h-3 text-green-600 stroke-[3.5]" />}
                      </button>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* FLOATING SUCCESS FEEDBACK TOAST */}
      <AnimatePresence>
        {addedProductId && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[calc(100%-2rem)] max-w-sm">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.9 }}
              className="bg-[#002B7F] text-white p-3.5 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-white/10"
            >
              <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center shrink-0">
                <Check className="w-3.5 h-3.5 text-white stroke-[4]" />
              </div>
              <span className="text-xs font-black tracking-tight text-left">Produit ajouté au panier de DavidSTORE !</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
