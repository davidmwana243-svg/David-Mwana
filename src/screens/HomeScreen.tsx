import React, { useEffect, useState } from 'react';
import { Product } from '../models/types';
import { getProducts } from '../services/productService';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { 
  Menu, 
  ShoppingCart, 
  Search, 
  X, 
  ChevronRight, 
  Check, 
  Sparkles, 
  Smartphone, 
  Laptop, 
  Laptop2, 
  Volume2, 
  Box, 
  Home as HomeIcon, 
  ChevronRight as MoreIcon,
  HelpCircle,
  ShoppingBag,
  Bell
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart, totalItems } = useCart();
  const { user, isAdmin } = useAuth();

  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom interactive states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [addedPopupText, setAddedPopupText] = useState<string | null>(null);

  useEffect(() => {
    // Real-time products listener
    const q = collection(db, 'products');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const prods: Product[] = [];
      snapshot.forEach((docSnap) => {
        prods.push(docSnap.data() as Product);
      });
      
      if (prods.length === 0) {
        setDbProducts([]);
      } else {
        const seen = new Set<string>();
        const uniqueProds: Product[] = [];
        prods.forEach(p => {
          if (p && p.id && !seen.has(p.id)) {
            seen.add(p.id);
            uniqueProds.push(p);
          }
        });
        setDbProducts(uniqueProds.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)));
      }
      setIsLoading(false);
    }, (error) => {
      console.error("Real-time product listener failed, falling back to static fetch", error);
      getProducts().then(prods => {
        setDbProducts(prods);
        setIsLoading(false);
      });
    });

    return () => unsubscribe();
  }, []);

  const categoriesData = [
    { title: 'Ordinateurs', emoji: '💻', search: 'ordinateur' },
    { title: 'Téléphones', emoji: '📱', search: 'phone' },
    { title: 'Mode', emoji: '👕', search: 'mode' },
    { title: 'Électronique', emoji: '📦', search: 'électronique' },
    { title: 'Maison', emoji: '🏠', search: 'maison' },
    { title: 'Plus', emoji: '⋯', search: '' }
  ];

  // Use items directly from Firestore
  const livePopularProducts = dbProducts.slice(0, 4);
  const distinctProductsList = dbProducts;

  const filteredProducts = distinctProductsList.filter(product => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    
    // Explicit category exact matches based on the category titles
    if (query === 'électronique' || query === 'elec' || query === 'electronique') {
      return product.category === 'electronics';
    }
    
    if (query === 'ordinateurs' || query === 'ordinateur') {
      return (product.category === 'electronics') && 
        (product.name.toLowerCase().includes('pc') || product.name.toLowerCase().includes('ordinateur') || product.name.toLowerCase().includes('laptop') || product.name.toLowerCase().includes('macbook'));
    }

    if (query === 'téléphones' || query === 'phone') {
      return (product.category === 'electronics') && 
        (product.name.toLowerCase().includes('téléphone') || product.name.toLowerCase().includes('phone') || product.name.toLowerCase().includes('smartphone') || product.name.toLowerCase().includes('galaxy') || product.name.toLowerCase().includes('iphone'));
    }

    if (query === 'accessoires' || query === 'casque') {
      return (product.category === 'electronics') && 
        (product.name.toLowerCase().includes('casque') || product.name.toLowerCase().includes('ecouteurs') || product.name.toLowerCase().includes('écouteurs') || product.name.toLowerCase().includes('chargeur') || product.name.toLowerCase().includes('bluetooth'));
    }

    if (query === 'mode') {
      return ['men_clothing', 'women_clothing', 'kids_clothing', 'shoes'].includes(product.category || '');
    }

    if (query === 'maison') {
      return product.category === 'home' || product.name.toLowerCase().includes('maison');
    }

    const matchesQuery = (text: string) => {
      const lowerText = text.toLowerCase();
      if (lowerText.includes(query)) return true;
      
      // general plural fallback (remove trailing 's')
      if (query.endsWith('s') && query.length > 2) {
        const singular = query.slice(0, -1);
        if (lowerText.includes(singular)) return true;
      }
      
      return false;
    };

    return (
      matchesQuery(product.name) ||
      matchesQuery(product.description || '') ||
      matchesQuery(product.category || '')
    );
  });

  const handleAddToCartWithFeedback = (product: Product, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart(product, 1);
    
    // Trigger premium pop-up notification toast
    setAddedPopupText(`L'article "${product.name}" a été ajouté au panier !`);
    setTimeout(() => {
      setAddedPopupText(null);
    }, 2500);
  };

  const handleCategoryClick = (cat: typeof categoriesData[0]) => {
    if (!cat.search) {
      navigate('/catalog');
    } else {
      setSearchQuery(cat.title);
      // Wait a fraction of a second and scroll to top of search results
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-[#F8F9FA] pb-24 relative">
      
      {/* HEADER / EN-TÊTE PREMIUM */}
      <header className="bg-white border-b border-gray-100 px-4 py-3 sticky top-0 z-40 shadow-sm flex items-center justify-between">
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className="p-2 rounded-xl text-[#002B7F] hover:bg-gray-50 active:scale-90 transition-all cursor-pointer"
          title="Menu principal"
          id="hamburger-menu-btn"
        >
          <Menu className="w-6 h-6 stroke-[2.2]" />
        </button>
        
        {/* LOGO CENTRÉ */}
        <div 
          onClick={() => { setSearchQuery(''); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
          className="flex items-center space-x-0.5 cursor-pointer"
          id="app-logo-container"
        >
          <span className="text-xl font-black text-[#002B7F] tracking-tight">DAVID</span>
          <span className="text-xl font-black text-[#FFC107] tracking-tight">STORE</span>
        </div>

        {/* PANIER AVEC BADGE */}
        <button 
          onClick={() => navigate('/cart')}
          className="p-2 rounded-xl text-gray-700 hover:bg-gray-50 active:scale-90 transition-all cursor-pointer relative"
          id="cart-header-icon"
          title="Mon Panier"
        >
          <ShoppingCart className="w-6 h-6 text-gray-700 stroke-[2]" />
          {totalItems > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-[#FFC107] text-black text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full border-2 border-white shadow-sm animate-bounce shrink-0">
              {totalItems}
            </span>
          )}
        </button>
      </header>

      {/* REVERSIBLE DRAWER PANEL */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-black z-50 max-w-md mx-auto"
            />
            {/* Slider panel */}
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="fixed left-0 top-0 bottom-0 bg-white w-4/5 max-w-xs z-50 shadow-2xl p-6 flex flex-col justify-between max-w-md mx-auto"
            >
              <div>
                <div className="flex items-center justify-between pb-6 border-b border-gray-100">
                  <div className="flex items-center space-x-1">
                    <span className="text-lg font-black text-[#002B7F]">DAVID</span>
                    <span className="text-lg font-black text-[#FFC107]">STORE</span>
                  </div>
                  <button 
                    onClick={() => setIsDrawerOpen(false)}
                    className="p-1 rounded-lg bg-gray-50 text-gray-400 hover:text-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="py-6 space-y-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 tracking-wider uppercase mb-1">
                    Navigation
                  </div>
                  
                  <button
                    onClick={() => { setIsDrawerOpen(false); navigate('/home'); setSearchQuery(''); }}
                    className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-bold text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-lg">🏠</span>
                    <span>Accueil Principal</span>
                  </button>
                  
                  <button
                    onClick={() => { setIsDrawerOpen(false); navigate('/catalog'); }}
                    className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-bold text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-lg">📦</span>
                    <span>Catalogue Produits</span>
                  </button>

                  <button
                    onClick={() => { setIsDrawerOpen(false); navigate('/support'); }}
                    className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-bold text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-lg">💬</span>
                    <span>Support Client & SMS</span>
                  </button>

                  <button
                    onClick={() => { 
                      setIsDrawerOpen(false); 
                      window.open(`https://wa.me/243852849473?text=${encodeURIComponent("Bonjour DavidSTORE ! Je souhaite obtenir de l'assistance.")}`, '_blank');
                    }}
                    className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-bold text-gray-800 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-lg">🟢</span>
                    <span>WhatsApp Direct</span>
                  </button>

                  {isAdmin && (
                    <button
                      onClick={() => { setIsDrawerOpen(false); navigate('/admin'); }}
                      className="w-full flex items-center space-x-3 px-3 py-3 rounded-xl text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors mt-4"
                    >
                      <span className="text-lg">🛡️</span>
                      <span>Espace Admin</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 text-center">
                <p className="text-[11px] text-gray-400">© 2026 DavidSTORE. Tous droits réservés.</p>
                {user && (
                  <p className="text-[10px] text-gray-500 font-medium truncate mt-1">Connecté : {user.email}</p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="p-4 space-y-6">

        {/* BARRE DE RECHERCHE ARRONDIE */}
        <div className="relative" id="product-search-bar">
          <div className="flex items-center bg-[#F5F5F5] border border-gray-100 rounded-2xl px-4 py-3 shadow-md hover:shadow-lg transition-all">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full bg-transparent border-none outline-none text-sm text-gray-800 placeholder-gray-400 py-0.5 "
            />
            {searchQuery ? (
              <button 
                onClick={() => setSearchQuery('')}
                className="p-1 rounded-full bg-gray-200 text-gray-500 hover:text-gray-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Search className="w-5 h-5 text-gray-400 shrink-0 ml-1" />
            )}
          </div>
        </div>

        {searchQuery.trim() === '' ? (
          <>
            {/* BANNIÈRE PRINCIPALE (HERO SECTION) */}
            <motion.div 
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="bg-[#0B3D91] text-white rounded-[24px] overflow-hidden relative shadow-[0_12px_24px_-8px_rgba(11,61,145,0.4)] min-h-[190px] flex items-center"
              id="hero-advertisement-banner"
            >
              {/* Image d'arrière-plan visible sur la droite avec dégradé vers la gauche */}
              <div className="absolute right-0 top-0 bottom-0 w-[75%] sm:w-[60%] z-0">
                <div className="absolute inset-0 bg-gradient-to-r from-[#0B3D91] via-transparent to-transparent z-10" />
                <img
                  src="/images/premium_ecommerce_products_1781929587538.jpg"
                  alt="Premium Products Display"
                  className="w-full h-full object-cover object-left"
                  style={{
                    WebkitMaskImage: 'linear-gradient(to left, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)',
                    maskImage: 'linear-gradient(to left, rgba(0,0,0,1) 85%, rgba(0,0,0,0) 100%)'
                  }}
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Background circular premium shapes */}
              <div className="absolute -left-10 -bottom-10 w-44 h-44 bg-[#FFFFFF]/5 rounded-full blur-2xl z-0" />
              <div className="absolute top-4 left-1/3 w-20 h-20 bg-[#FFC107]/10 rounded-full blur-xl animate-pulse z-0" />

              <div className="p-6 flex items-center justify-between w-full relative z-20">
                {/* Left side text */}
                <div className="w-[70%] sm:w-[60%] text-left relative z-20">
                  <h2 className="font-extrabold text-[18px] sm:text-[22px] md:text-[26px] tracking-tight leading-tight uppercase font-sans drop-shadow-md break-words mb-2.5">
                    <span className="block text-[#FFFFFF]">Le shopping</span>
                    <span className="block text-[#FFC107]">Intelligent commence,</span>
                    <span className="block text-[#FFFFFF]">Ici.</span>
                  </h2>
                  <p className="text-[#FFFFFF]/95 text-[12px] sm:text-[13px] md:text-[15px] font-medium font-sans leading-snug max-w-[95%]">
                    Rejoignez DavidSTORE et accédez aux meilleures offres sur des milliers de produits.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* GRILLE DE 6 CATÉGORIES */}
            <section className="space-y-3" id="categories-section">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-[#002B7F] text-[15px] tracking-tight">Catégories</h3>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {categoriesData.map((cat, i) => (
                  <motion.div
                    key={i}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleCategoryClick(cat)}
                    className="bg-white p-3 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md transition-shadow"
                  >
                    {/* Circle Container */}
                    <div className="w-12 h-12 rounded-full bg-[#F5F5F5] shadow-inner flex items-center justify-center text-xl mb-2 transition-transform duration-200 hover:scale-105">
                      {cat.emoji}
                    </div>
                    {/* Category Title */}
                    <span className="text-[11px] font-bold text-gray-800 tracking-tight leading-none">
                      {cat.title}
                    </span>
                  </motion.div>
                ))}
              </div>
            </section>

            {/* SECTION PRODUITS POPULAIRES */}
            <section className="space-y-4" id="popular-products-section">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-[#002B7F] text-[16px] tracking-tight">Produits populaires</h3>
                <button 
                  onClick={() => navigate('/catalog')}
                  className="text-xs font-bold text-[#0057FF] hover:text-[#002B7F] flex items-center gap-0.5 active:translate-x-0.5 transition-transform"
                >
                  <span>Voir plus</span>
                  <ChevronRight className="w-4 h-4 text-[#0057FF]" />
                </button>
              </div>

              {/* CARD PRODUCTS - 3 POPULAR requested */}
              <div className="grid grid-cols-2 gap-3.5">
                {livePopularProducts.map((prod) => (
                  <motion.div
                    key={prod.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow p-3 flex flex-col justify-between"
                  >
                    {/* Top Image area */}
                    <div 
                      onClick={() => navigate(`/product/${prod.id}`)}
                      className="relative rounded-xl overflow-hidden bg-gray-50 aspect-square cursor-pointer mb-2.5 group"
                    >
                      <img
                        src={prod.imageUrl}
                        alt={prod.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = 'https://placehold.co/400x500/e2e8f0/64748b?text=DavidSTORE';
                        }}
                      />
                      <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#002B7F]/80 text-white text-[9px] font-bold rounded-full">
                        Populaire
                      </div>
                    </div>

                    {/* Meta info / title / description */}
                    <div className="space-y-1 pr-1 pl-0.5 flex-1 flex flex-col justify-between text-left">
                      <div className="cursor-pointer" onClick={() => navigate(`/product/${prod.id}`)}>
                        <h4 className="font-bold text-gray-800 text-[12px] leading-snug tracking-tight line-clamp-1 hover:text-[#0057FF] transition-colors">
                          {prod.name}
                        </h4>
                        <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5 font-medium leading-relaxed">
                          {prod.description}
                        </p>
                      </div>

                      {/* Pricing and Action row */}
                      <div className="pt-2 flex items-center justify-between gap-1 w-full mt-auto">
                        <span className="font-black text-[14px] text-[#002B7F] tracking-tight shrink-0">
                          {Number(prod.price).toLocaleString()} FC
                        </span>
                        
                        {/* Premium Yellow Plus/Cart Button */}
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => handleAddToCartWithFeedback(prod, e)}
                          className="bg-[#FFC107] hover:bg-[#FFB300] text-black font-black text-[9px] tracking-wide px-2.5 py-1.5 rounded-xl uppercase transition-all shadow-sm active:scale-95 flex items-center gap-1 cursor-pointer shrink-0"
                          title="Ajouter au Panier"
                        >
                          <span>PANIER</span>
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </>
        ) : (
          /* RESULTATS DE LA RECHERCHE AVEC FILTRAGE */
          <div className="space-y-4 animate-in fade-in duration-200" id="search-results-section">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-[#002B7F] text-sm tracking-tight uppercase">
                Résultats de recherche ({filteredProducts.length})
              </h3>
              <button 
                onClick={() => setSearchQuery('')}
                className="text-xs font-bold text-[#0057FF] bg-blue-50 px-2.5 py-1 rounded-lg hover:bg-blue-100 transition-colors"
              >
                Tout réinitialiser
              </button>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="text-center py-12 px-6 bg-white rounded-3xl border border-gray-100 shadow-sm mt-2">
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                  <X className="w-6 h-6 text-gray-400" />
                </div>
                <h4 className="font-bold text-gray-800 text-sm">Aucun produit trouvé</h4>
                <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto leading-relaxed">
                  Nous n'avons trouvé aucun article pour &ldquo;{searchQuery}&rdquo;. Veuillez modifier votre recherche.
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-4 px-4 py-2 bg-[#0057FF] text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-100 active:scale-95 transition-all"
                >
                  Effacer la recherche
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3.5">
                {filteredProducts.map(product => (
                  <motion.div
                    key={product.id}
                    layout
                    className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 flex flex-col justify-between"
                  >
                    <div 
                      onClick={() => navigate(`/product/${product.id}`)}
                      className="relative rounded-xl overflow-hidden bg-gray-100 aspect-square cursor-pointer mb-2.5"
                    >
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = 'https://placehold.co/400x500/e2e8f0/64748b?text=DavidSTORE';
                        }}
                      />
                    </div>
                    <div className="space-y-1 pr-1 text-left flex-1 flex flex-col justify-between">
                      <div className="cursor-pointer" onClick={() => navigate(`/product/${product.id}`)}>
                        <h4 className="font-bold text-gray-800 text-[12px] leading-snug line-clamp-1">
                          {product.name}
                        </h4>
                      </div>
                      <div className="pt-2 flex items-center justify-between gap-1 w-full mt-auto">
                        <span className="font-black text-[14px] text-[#002B7F] tracking-tight">
                          {Number(product.price).toLocaleString()} FC
                        </span>
                        <button
                          onClick={(e) => handleAddToCartWithFeedback(product, e)}
                          className="bg-[#FFC107] hover:bg-[#FFB300] text-black font-black text-[9px] tracking-wide px-2.5 py-1.5 rounded-xl uppercase shadow-sm active:scale-95 cursor-pointer"
                        >
                          PANIER
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SUCCESS INTERACTIVE FEEDBACK FOR CART ADDITIONS */}
      <AnimatePresence>
        {addedPopupText && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-20 left-4 right-4 z-50 bg-[#002B7F] text-white rounded-2xl p-4 shadow-xl flex items-center gap-3 border border-white/10 max-w-sm mx-auto"
          >
            <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center shrink-0">
              <Check className="w-4 h-4 text-white stroke-[3.5]" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-xs font-bold leading-relaxed">{addedPopupText}</p>
            </div>
            <button 
              onClick={() => navigate('/cart')}
              className="px-2.5 py-1.5 bg-[#FFC107] text-black text-[10px] font-black rounded-lg uppercase whitespace-nowrap active:scale-95 transition-transform"
            >
              Voir panier
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
