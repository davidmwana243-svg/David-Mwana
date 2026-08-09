import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, ShoppingCart, Heart, User, Home, ArrowLeft, Star, 
  Trash2, Plus, Minus, Check, MapPin, Phone, CreditCard, Info, CheckCircle, Clock, ChevronRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useNotification } from '../context/NotificationContext';
import { getProducts, getCategories, getProductsByCategory, checkCartStock } from '../services/productService';
import { createOrder, getUserOrders } from '../services/orderService';
import { Product, Category, Order, UserAddress } from '../types';
import { db, auth } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

type ActiveTab = 'home' | 'catalog' | 'cart' | 'profile';

export function TelegramMiniAppScreen() {
  const { profile, user, toggleWishlist } = useAuth();
  const { items, addToCart, removeFromCart, updateQuantity, clearCart, totalPrice, totalItems } = useCart();
  const { showNotification } = useNotification();

  // Navigation states
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Data states
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Product details states
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  
  // Checkout states
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [shippingName, setShippingName] = useState(profile?.displayName || profile?.nom || '');
  const [shippingPhone, setShippingPhone] = useState(profile?.phone || profile?.telephone || '');
  const [shippingCity, setShippingCity] = useState('Lubumbashi');
  const [shippingCommune, setShippingCommune] = useState('');
  const [shippingQuartier, setShippingQuartier] = useState('');
  const [shippingAvenue, setShippingAvenue] = useState('');
  const [shippingReference, setShippingReference] = useState('');
  const [shwaryPhone, setShwaryPhone] = useState(profile?.phone || profile?.telephone || '');
  
  // Order & Payment states
  const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'waiting_ussd' | 'success' | 'failed'>('idle');
  const [countdown, setCountdown] = useState(60);
  const [orderHistory, setOrderHistory] = useState<Order[]>([]);

  // Sync profile fields on load
  useEffect(() => {
    if (profile) {
      if (!shippingName) setShippingName(profile.displayName || profile.nom || '');
      if (!shippingPhone) setShippingPhone(profile.phone || profile.telephone || '');
      if (!shwaryPhone) setShwaryPhone(profile.phone || profile.telephone || '');
    }
  }, [profile]);

  // Fetch products and categories from Firebase
  useEffect(() => {
    async function loadData() {
      setLoadingProducts(true);
      try {
        const [allProds, allCats] = await Promise.all([
          getProducts(),
          getCategories()
        ]);
        setProducts(allProds);
        setCategories(allCats);
      } catch (err) {
        console.error("Error loading products/categories:", err);
      } finally {
        setLoadingProducts(false);
      }
    }
    loadData();
  }, []);

  // Fetch active order history when profile is available
  useEffect(() => {
    if (user?.uid) {
      getUserOrders(user.uid).then(orders => {
        setOrderHistory(orders);
      });
    }
  }, [user, activeTab, paymentStatus]);

  // Handle countdown timer for USSD simulation/awaiting payment
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (paymentStatus === 'waiting_ussd' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (countdown === 0 && paymentStatus === 'waiting_ussd') {
      setPaymentStatus('failed');
    }
    return () => clearInterval(timer);
  }, [paymentStatus, countdown]);

  // Real-time Firestore document updates listener for Shwary webhook callback
  useEffect(() => {
    if (!activeOrder?.id) return;

    const unsub = onSnapshot(doc(db, 'orders', activeOrder.id), (snapshot) => {
      if (snapshot.exists()) {
        const updatedOrder = snapshot.data() as Order;
        console.log('[TMA] Order updated in real-time:', updatedOrder.status);
        if (updatedOrder.status === 'processing' || updatedOrder.status === 'pending') {
          setPaymentStatus('success');
          clearCart();
        } else if (updatedOrder.status === 'cancelled') {
          setPaymentStatus('failed');
        }
      }
    }, (error) => {
      console.warn("Realtime order stream failed:", error);
    });

    return () => unsub();
  }, [activeOrder]);

  // Filtered products logic
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const popularProducts = products.slice(0, 4);
  const promoProducts = products.filter(p => p.originalPrice && p.originalPrice > p.price).slice(0, 4);
  const newProducts = products.slice().sort((a,b) => b.createdAt - a.createdAt).slice(0, 4);

  // Helper size configuration
  const getProductVariants = (prod: Product) => {
    const isShoe = prod.category?.toLowerCase().includes('shoes') || prod.name.toLowerCase().includes('chaussure');
    const isClothes = prod.category?.toLowerCase().includes('clothing') || prod.category?.toLowerCase().includes('vetement');
    const isElec = prod.category?.toLowerCase().includes('electronics') || prod.name.toLowerCase().includes('téléphone');

    return {
      sizes: prod.sizes && prod.sizes.length > 0 ? prod.sizes : (isShoe ? ['39', '40', '41', '42', '43'] : isClothes ? ['S', 'M', 'L', 'XL'] : null),
      colors: isShoe ? ['Noir', 'Blanc', 'Bleu Marine'] : isClothes ? ['Noir', 'Bleu', 'Blanc'] : isElec ? ['Gris Sidéral', 'Or', 'Bleu Cobalt'] : null,
      models: isElec ? ['128GB', '256GB'] : null
    };
  };

  const currentVariants = selectedProduct ? getProductVariants(selectedProduct) : null;

  const handleAddToCart = () => {
    if (!selectedProduct) return;

    // Validate size selection if available
    if (currentVariants?.sizes && !selectedSize) {
      showNotification("Option requise", "Veuillez choisir une taille / pointure avant d'ajouter au panier.", "error");
      return;
    }

    // Build unique choice string
    let variantString = '';
    if (selectedSize) variantString += `Taille: ${selectedSize}`;
    if (selectedColor) variantString += `${variantString ? ', ' : ''}Couleur: ${selectedColor}`;
    if (selectedModel) variantString += `${variantString ? ', ' : ''}Modèle: ${selectedModel}`;

    addToCart(selectedProduct, 1, variantString || undefined);
    showNotification("Panier", `${selectedProduct.name} ajouté au panier !`, "success");
    setSelectedProduct(null); // return back
    // Reset temporary states
    setSelectedSize('');
    setSelectedColor('');
    setSelectedModel('');
  };

  // Submit checkout order and initiate Shwary payment
  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) {
      showNotification("Erreur", "Authentification requise pour commander.", "error");
      return;
    }

    if (!shippingName || !shippingPhone || !shippingCommune || !shippingQuartier || !shippingAvenue) {
      showNotification("Champs requis", "Veuillez remplir toutes les informations de livraison.", "error");
      return;
    }

    if (!shwaryPhone) {
      showNotification("Paiement", "Veuillez renseigner un numéro de téléphone Mobile Money pour Shwary.", "error");
      return;
    }

    // 0. Stock validation before order creation & payment
    const stockCheck = await checkCartStock(items);
    if (!stockCheck.valid && stockCheck.outOfStockProduct) {
      const prod = stockCheck.outOfStockProduct;
      showNotification(
        "Rupture de stock", 
        `Le produit "${prod.name}" n'est plus disponible dans cette quantité (Stock disponible: ${prod.available}).`, 
        "error"
      );
      return;
    }

    setIsSubmittingOrder(true);
    setPaymentStatus('waiting_ussd');
    setCountdown(60);

    const fullAddressLines = `C/ ${shippingCommune}, Q/ ${shippingQuartier}, Av/ ${shippingAvenue}${shippingReference ? `, Réf: ${shippingReference}` : ''}, ${shippingCity}, RD Congo`;

    try {
      // 1. Create the order in Firebase
      const newOrder = await createOrder(
        user.uid,
        items,
        totalPrice,
        fullAddressLines,
        shippingName,
        shippingPhone,
        {
          id: 'temp_addr',
          label: 'Adresse Mini App',
          fullName: shippingName,
          phone: shippingPhone,
          addressLines: fullAddressLines,
          city: shippingCity,
          country: 'RD Congo',
          commune: shippingCommune,
          quartier: shippingQuartier,
          avenue: shippingAvenue,
          reference: shippingReference
        }
      );

      setActiveOrder(newOrder);

      // 2. Obtain Firebase ID Token to execute secure checkout API call
      const idToken = await auth.currentUser?.getIdToken();
      if (!idToken) {
        throw new Error("Could not acquire auth token.");
      }

      // 3. Fire payment request to our Express payment endpoint
      const response = await fetch('/api/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          amount: totalPrice,
          clientPhoneNumber: shwaryPhone,
          orderId: newOrder.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Échec de l'initiation du paiement USSD.");
      }

      showNotification("USSD Shwary", "L'alerte interactive USSD a été envoyée sur votre téléphone.", "success");

    } catch (err: any) {
      console.error("[TMA CHECKOUT] Error launching Shwary:", err);
      showNotification("Erreur de paiement", err?.message || "Une erreur technique s'est produite lors du paiement.", "error");
      setPaymentStatus('failed');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleQuickAdd = (p: Product, e: React.MouseEvent) => {
    e.stopPropagation();
    const vars = getProductVariants(p);
    
    // If the product has options/variants, we MUST prompt the detail page to let them choose
    if (vars.sizes || vars.colors || vars.models) {
      setSelectedProduct(p);
      showNotification("Options requises", `Veuillez choisir les variantes pour ${p.name}`, "info");
    } else {
      addToCart(p, 1);
      showNotification("Panier", `${p.name} ajouté au panier !`, "success");
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F5F5] flex flex-col font-sans text-[#333333] select-none pb-24 max-w-md mx-auto shadow-2xl relative overflow-x-hidden">
      
      {/* 1. TOP HEADER BRANDING */}
      <header className="bg-[#002B7F] text-white px-5 pt-4 pb-5 rounded-b-[2rem] shadow-lg sticky top-0 z-40">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center border border-[#FFC107]/40">
              <span className="text-[#FFC107] font-black text-xl">D</span>
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight flex items-center space-x-1">
                <span>DAVIDSTORE</span>
                <span className="text-xs bg-[#FFC107] text-[#002B7F] px-1.5 py-0.5 rounded font-black uppercase tracking-wider scale-90">Mini App</span>
              </h1>
              <p className="text-xs text-white/70">La boutique officielle Telegram</p>
            </div>
          </div>
          {profile?.photoURL && (
            <img 
              src={profile.photoURL} 
              alt="Profile" 
              className="w-10 h-10 rounded-full object-cover border-2 border-[#0057FF]"
              referrerPolicy="no-referrer"
            />
          )}
        </div>

        {/* Dynamic Search Input Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 text-white/60 w-4 h-4" />
          <input 
            type="text" 
            placeholder="Rechercher des produits..." 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (activeTab !== 'catalog') setActiveTab('catalog');
            }}
            className="w-full bg-white/10 text-white placeholder-white/50 text-sm pl-10 pr-4 py-3 rounded-2xl outline-none focus:bg-white focus:text-[#333333] transition-all duration-300 border border-white/10 focus:border-[#FFC107]"
          />
        </div>
      </header>

      {/* 2. BODY CONTENT ROUTER (FADE IN EFFECTS) */}
      <main className="flex-1 px-4 py-4 overflow-y-auto">
        <AnimatePresence mode="wait">
          
          {/* PRODUCT DETAIL VIEW (OVERLAY DETAILED PAGE) */}
          {selectedProduct ? (
            <motion.div 
              key="detail"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100"
            >
              <button 
                onClick={() => setSelectedProduct(null)}
                className="flex items-center space-x-2 text-[#002B7F] font-bold text-sm mb-4 active:scale-95 transition-all"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Retour</span>
              </button>

              <div className="relative rounded-2xl overflow-hidden mb-4 bg-gray-50 border border-gray-100">
                <img 
                  src={selectedProduct.imageUrl} 
                  alt={selectedProduct.name} 
                  className="w-full h-64 object-contain mx-auto"
                />
                {selectedProduct.originalPrice && selectedProduct.originalPrice > selectedProduct.price && (
                  <span className="absolute top-3 left-3 bg-red-500 text-white text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider">
                    PROMO
                  </span>
                )}
              </div>

              <h2 className="text-xl font-extrabold text-[#002B7F] mb-1 leading-tight">{selectedProduct.name}</h2>
              <div className="flex items-center space-x-2 mb-3">
                <div className="flex text-[#FFC107]">
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-xs text-gray-500 font-bold ml-1">4.8 (24 avis)</span>
                </div>
                <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full font-black">
                  En stock ({selectedProduct.stock})
                </span>
              </div>

              <div className="flex items-baseline space-x-2 mb-4">
                <span className="text-2xl font-black text-[#0057FF]">{selectedProduct.price.toLocaleString('fr-FR')} CDF</span>
                {selectedProduct.originalPrice && (
                  <span className="text-sm text-gray-400 line-through">
                    {selectedProduct.originalPrice.toLocaleString('fr-FR')} CDF
                  </span>
                )}
              </div>

              <p className="text-gray-600 text-sm leading-relaxed mb-5 bg-gray-50 p-3.5 rounded-2xl border border-gray-100">
                {selectedProduct.description}
              </p>

              {/* VARIANTS SELECTION MODULE */}
              {currentVariants && (
                <div className="space-y-4 mb-6 border-t border-gray-100 pt-4">
                  
                  {/* Sizes Selection */}
                  {currentVariants.sizes && (
                    <div>
                      <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">
                        {selectedProduct.category?.includes('shoes') ? 'Pointures disponibles' : 'Tailles disponibles'} *
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {currentVariants.sizes.map(size => (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`px-4 py-2.5 rounded-xl text-sm font-black transition-all duration-200 border ${
                              selectedSize === size
                                ? 'bg-[#0057FF] border-[#0057FF] text-white shadow-md shadow-[#0057FF]/20 scale-105'
                                : 'bg-white border-gray-200 text-[#333333] hover:border-gray-300'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Colors Selection */}
                  {currentVariants.colors && (
                    <div>
                      <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Couleur</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentVariants.colors.map(color => (
                          <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                              selectedColor === color
                                ? 'bg-[#002B7F] border-[#002B7F] text-white'
                                : 'bg-white border-gray-200 text-[#333333]'
                            }`}
                          >
                            {color}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Models / Capacities Selection */}
                  {currentVariants.models && (
                    <div>
                      <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider mb-2">Capacité / Version</h4>
                      <div className="flex flex-wrap gap-2">
                        {currentVariants.models.map(model => (
                          <button
                            key={model}
                            onClick={() => setSelectedModel(model)}
                            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                              selectedModel === model
                                ? 'bg-[#002B7F] border-[#002B7F] text-white'
                                : 'bg-white border-gray-200 text-[#333333]'
                            }`}
                          >
                            {model}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              )}

              <button
                onClick={handleAddToCart}
                className="w-full bg-[#0057FF] text-white font-black py-4 rounded-2xl shadow-lg shadow-[#0057FF]/30 active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <ShoppingCart className="w-5 h-5" />
                <span>Ajouter au panier</span>
              </button>
            </motion.div>
          ) : activeTab === 'home' ? (
            
            /* ==================== HOME SCREEN ==================== */
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Promo Banner */}
              <div className="bg-gradient-to-r from-[#002B7F] to-[#0057FF] rounded-3xl p-5 text-white shadow-md relative overflow-hidden">
                <div className="absolute -right-5 -bottom-5 w-32 h-32 bg-[#FFC107]/20 rounded-full blur-xl" />
                <h3 className="text-[#FFC107] text-xs font-black uppercase tracking-widest mb-1">PROMOTION EXCLUSIVE</h3>
                <h4 className="text-lg font-black leading-tight mb-2">Paiement Mobile Money instantané avec Shwary !</h4>
                <p className="text-xs text-white/80 max-w-[80%] leading-relaxed">Passez vos commandes directement dans Telegram et bénéficiez de 5% de réduction immédiate.</p>
              </div>

              {/* Horizontal Scroll Categories */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-extrabold text-[#002B7F] text-base">Nos Catégories</h3>
                  <button 
                    onClick={() => { setSelectedCategory('all'); setActiveTab('catalog'); }}
                    className="text-xs font-bold text-[#0057FF]"
                  >
                    Tout voir
                  </button>
                </div>
                <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-none">
                  <button
                    onClick={() => { setSelectedCategory('all'); setActiveTab('catalog'); }}
                    className={`flex-shrink-0 px-4 py-3 rounded-2xl text-xs font-black transition-all border ${
                      selectedCategory === 'all'
                        ? 'bg-[#002B7F] border-[#002B7F] text-white shadow-md shadow-[#002B7F]/20'
                        : 'bg-white border-gray-100 text-gray-600 shadow-sm'
                    }`}
                  >
                    🛍️ Tous les produits
                  </button>
                  {categories.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => { setSelectedCategory(cat.id); setActiveTab('catalog'); }}
                      className={`flex-shrink-0 px-4 py-3 rounded-2xl text-xs font-black transition-all border ${
                        selectedCategory === cat.id
                          ? 'bg-[#002B7F] border-[#002B7F] text-white shadow-md shadow-[#002B7F]/20'
                          : 'bg-white border-gray-100 text-gray-600 shadow-sm'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Popular Products Horizontal Scroll */}
              <div>
                <h3 className="font-extrabold text-[#002B7F] text-base mb-3">🔥 Les plus populaires</h3>
                {loadingProducts ? (
                  <div className="h-40 bg-white rounded-3xl animate-pulse flex items-center justify-center text-xs text-gray-400">Chargement...</div>
                ) : (
                  <div className="flex space-x-4 overflow-x-auto pb-3 scrollbar-none">
                    {popularProducts.map(prod => (
                      <div 
                        key={prod.id}
                        onClick={() => setSelectedProduct(prod)}
                        className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 w-36 flex-shrink-0 active:scale-95 transition-all cursor-pointer"
                      >
                        <div className="h-28 rounded-xl bg-gray-50 flex items-center justify-center p-2 mb-2">
                          <img src={prod.imageUrl} alt={prod.name} className="max-h-full max-w-full object-contain" />
                        </div>
                        <h4 className="text-xs font-extrabold text-[#333333] truncate mb-1">{prod.name}</h4>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs font-black text-[#0057FF]">{prod.price.toLocaleString('fr-FR')} CDF</span>
                          <button 
                            onClick={(e) => handleQuickAdd(prod, e)}
                            className="bg-[#FFC107] text-[#002B7F] p-1.5 rounded-lg active:scale-90 transition-all shadow-sm shadow-[#FFC107]/20"
                          >
                            <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Promotional Products */}
              {promoProducts.length > 0 && (
                <div>
                  <h3 className="font-extrabold text-[#002B7F] text-base mb-3">🏷️ Offres Spéciales</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {promoProducts.map(prod => (
                      <div 
                        key={prod.id}
                        onClick={() => setSelectedProduct(prod)}
                        className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 active:scale-95 transition-all cursor-pointer relative"
                      >
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">
                          PROMO
                        </span>
                        <div className="h-28 rounded-xl bg-gray-50 flex items-center justify-center p-2 mb-2">
                          <img src={prod.imageUrl} alt={prod.name} className="max-h-full max-w-full object-contain" />
                        </div>
                        <h4 className="text-xs font-extrabold text-[#333333] truncate mb-1">{prod.name}</h4>
                        <div className="flex items-baseline space-x-1.5 mb-1">
                          <span className="text-xs font-black text-red-500">{prod.price.toLocaleString('fr-FR')} CDF</span>
                          <span className="text-[10px] text-gray-400 line-through">
                            {prod.originalPrice?.toLocaleString('fr-FR')}
                          </span>
                        </div>
                        <button
                          onClick={(e) => handleQuickAdd(prod, e)}
                          className="w-full bg-[#0057FF] text-white py-1.5 rounded-xl text-xs font-black mt-1 hover:bg-[#002B7F] transition-all flex items-center justify-center space-x-1"
                        >
                          <ShoppingCart className="w-3 h-3" />
                          <span>Prendre</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Arrivals Section */}
              <div>
                <h3 className="font-extrabold text-[#002B7F] text-base mb-3">✨ Nouveautés</h3>
                <div className="space-y-3">
                  {newProducts.map(prod => (
                    <div 
                      key={prod.id}
                      onClick={() => setSelectedProduct(prod)}
                      className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex items-center space-x-3 cursor-pointer active:scale-98 transition-all"
                    >
                      <div className="w-16 h-16 rounded-xl bg-gray-50 flex-shrink-0 p-1 flex items-center justify-center">
                        <img src={prod.imageUrl} alt={prod.name} className="max-h-full max-w-full object-contain" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-extrabold text-gray-800 truncate mb-0.5">{prod.name}</h4>
                        <p className="text-[10px] text-gray-400 truncate mb-1">{prod.description}</p>
                        <span className="text-xs font-black text-[#0057FF]">{prod.price.toLocaleString('fr-FR')} CDF</span>
                      </div>
                      <button 
                        onClick={(e) => handleQuickAdd(prod, e)}
                        className="bg-[#002B7F] text-white p-2 rounded-xl flex-shrink-0 active:scale-90 transition-all shadow-sm"
                      >
                        <Plus className="w-4 h-4 stroke-[2]" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          ) : activeTab === 'catalog' ? (
            
            /* ==================== CATALOG SCREEN ==================== */
            <motion.div 
              key="catalog"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Category Filter Pills */}
              <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-black transition-all border ${
                    selectedCategory === 'all'
                      ? 'bg-[#0057FF] border-[#0057FF] text-white shadow-sm'
                      : 'bg-white border-gray-100 text-gray-600'
                  }`}
                >
                  Tous ({products.length})
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex-shrink-0 px-3.5 py-2 rounded-xl text-xs font-black transition-all border ${
                      selectedCategory === cat.id
                        ? 'bg-[#0057FF] border-[#0057FF] text-white shadow-sm'
                        : 'bg-white border-gray-100 text-gray-600'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Grid Products list */}
              {loadingProducts ? (
                <div className="text-center py-20 text-gray-400 text-sm">Chargement des produits...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl p-5 border border-gray-100">
                  <span className="text-3xl mb-2 block">🔍</span>
                  <p className="text-sm font-black text-gray-500">Aucun produit trouvé</p>
                  <p className="text-xs text-gray-400 mt-1">Essayez une autre recherche ou catégorie.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3.5">
                  {filteredProducts.map(prod => (
                    <div 
                      key={prod.id}
                      onClick={() => setSelectedProduct(prod)}
                      className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex flex-col justify-between active:scale-95 transition-all cursor-pointer"
                    >
                      <div>
                        <div className="h-28 rounded-xl bg-gray-50 flex items-center justify-center p-2 mb-2">
                          <img src={prod.imageUrl} alt={prod.name} className="max-h-full max-w-full object-contain" />
                        </div>
                        <h4 className="text-xs font-extrabold text-[#333333] line-clamp-2 mb-1 h-8">{prod.name}</h4>
                        <span className="text-[10px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full font-bold">
                          {categories.find(c => c.id === prod.category)?.name || 'Article'}
                        </span>
                      </div>
                      <div className="mt-3">
                        <div className="flex items-baseline space-x-1.5 mb-2">
                          <span className="text-sm font-black text-[#0057FF]">{prod.price.toLocaleString('fr-FR')} CDF</span>
                          {prod.originalPrice && (
                            <span className="text-[10px] text-gray-400 line-through">
                              {prod.originalPrice.toLocaleString('fr-FR')}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={(e) => handleQuickAdd(prod, e)}
                          className="w-full bg-[#002B7F] text-white py-2 rounded-xl text-xs font-black transition-all hover:bg-[#0057FF] flex items-center justify-center space-x-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Ajouter</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : activeTab === 'cart' ? (
            
            /* ==================== CART / CHECKOUT SCREEN ==================== */
            <motion.div 
              key="cart"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* CHECKOUT FLOW ACTIVE OR VIEW LIST */}
              {isCheckingOut ? (
                <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100">
                  <button 
                    onClick={() => setIsCheckingOut(false)}
                    className="flex items-center space-x-2 text-[#002B7F] font-bold text-xs mb-4 active:scale-95 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Retour au panier</span>
                  </button>

                  <h3 className="font-extrabold text-[#002B7F] text-lg mb-4">Informations de livraison</h3>

                  <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase block mb-1">Nom Complet du Destinataire *</label>
                      <input 
                        type="text"
                        value={shippingName}
                        onChange={(e) => setShippingName(e.target.value)}
                        placeholder="Ex: David Mwana"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-sm focus:border-[#0057FF] bg-gray-50/50"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase block mb-1">Numéro de Téléphone de Contact *</label>
                      <input 
                        type="tel"
                        value={shippingPhone}
                        onChange={(e) => setShippingPhone(e.target.value)}
                        placeholder="Ex: 0995289355"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-sm focus:border-[#0057FF] bg-gray-50/50"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-black text-gray-500 uppercase block mb-1">Ville de Livraison *</label>
                        <select 
                          value={shippingCity}
                          onChange={(e) => setShippingCity(e.target.value)}
                          className="w-full px-3 py-3 rounded-xl border border-gray-200 outline-none text-sm focus:border-[#0057FF] bg-gray-50/50 font-bold"
                        >
                          <option value="Lubumbashi">Lubumbashi</option>
                          <option value="Likasi">Likasi</option>
                          <option value="Kasumbalesa">Kasumbalesa</option>
                          <option value="Kipushi">Kipushi</option>
                          <option value="Sakania">Sakania</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-black text-gray-500 uppercase block mb-1">Commune *</label>
                        <input 
                          type="text"
                          value={shippingCommune}
                          onChange={(e) => setShippingCommune(e.target.value)}
                          placeholder="Ex: Lubumbashi"
                          className="w-full px-3 py-3 rounded-xl border border-gray-200 outline-none text-sm focus:border-[#0057FF] bg-gray-50/50"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-black text-gray-500 uppercase block mb-1">Quartier *</label>
                        <input 
                          type="text"
                          value={shippingQuartier}
                          onChange={(e) => setShippingQuartier(e.target.value)}
                          placeholder="Ex: Golf"
                          className="w-full px-3 py-3 rounded-xl border border-gray-200 outline-none text-sm focus:border-[#0057FF] bg-gray-50/50"
                          required
                        />
                      </div>

                      <div>
                        <label className="text-xs font-black text-gray-500 uppercase block mb-1">Avenue *</label>
                        <input 
                          type="text"
                          value={shippingAvenue}
                          onChange={(e) => setShippingAvenue(e.target.value)}
                          placeholder="Ex: Des Plaines"
                          className="w-full px-3 py-3 rounded-xl border border-gray-200 outline-none text-sm focus:border-[#0057FF] bg-gray-50/50"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black text-gray-500 uppercase block mb-1">Point de Repère / Référence</label>
                      <input 
                        type="text"
                        value={shippingReference}
                        onChange={(e) => setShippingReference(e.target.value)}
                        placeholder="Ex: En face de l'école Belge"
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none text-sm focus:border-[#0057FF] bg-gray-50/50"
                      />
                    </div>

                    <div className="bg-[#002B7F]/5 rounded-2xl p-4 border border-[#002B7F]/10 space-y-3">
                      <div className="flex items-center space-x-2 text-[#002B7F] font-extrabold text-sm mb-1">
                        <CreditCard className="w-4 h-4 text-[#FFC107]" />
                        <span>Paiement Mobile Money (Shwary)</span>
                      </div>
                      <p className="text-[11px] text-gray-500 leading-relaxed">
                        Un message USSD de validation automatique sera poussé sur ce numéro. Validez avec votre code PIN secret Mobile Money.
                      </p>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-1">Numéro Mobile Money du payeur *</label>
                        <input 
                          type="text"
                          value={shwaryPhone}
                          onChange={(e) => setShwaryPhone(e.target.value)}
                          placeholder="Ex: 0820000000"
                          className="w-full px-4 py-2.5 rounded-xl border border-gray-200 outline-none text-xs focus:border-[#0057FF] bg-white font-bold"
                          required
                        />
                      </div>
                    </div>

                    {/* Order summary block & Number of pieces specification */}
                    <div className="border-t border-gray-100 pt-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-gray-700 uppercase">
                          📦 Récapitulatif ({totalItems} pièces)
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold">
                          Précisez les pièces ci-dessous
                        </span>
                      </div>

                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {items.map((item, idx) => (
                          <div 
                            key={`chk_${item.product.id}_${idx}`}
                            className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center justify-between gap-2 text-xs"
                          >
                            <div className="w-10 h-10 rounded-lg bg-white p-0.5 border border-gray-200/60 flex-shrink-0">
                              <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-contain" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-extrabold text-gray-800 truncate">{item.product.name}</p>
                              <p className="text-[10px] text-gray-400 font-bold">
                                {(item.product.price).toLocaleString('fr-FR')} CDF / pc
                              </p>
                            </div>

                            {/* Quantity buttons */}
                            <div className="flex items-center space-x-1.5 bg-white px-1.5 py-1 rounded-lg border border-gray-200">
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedSize)}
                                className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-gray-700 active:scale-90 font-bold"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-black text-gray-900 min-w-[14px] text-center">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedSize)}
                                className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-gray-700 active:scale-90 font-bold"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>

                            <div className="text-right min-w-[60px]">
                              <span className="font-black text-[#0057FF] block text-xs">
                                {(item.product.price * item.quantity).toLocaleString('fr-FR')} CDF
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-gray-100 space-y-1.5 text-xs text-gray-500">
                        <div className="flex justify-between">
                          <span>Sous-total articles:</span>
                          <span className="font-bold text-gray-800">{totalPrice.toLocaleString('fr-FR')} CDF</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Frais de livraison:</span>
                          <span className="text-emerald-600 font-extrabold">Gratuit / Express</span>
                        </div>
                        <div className="flex justify-between text-sm font-black text-[#002B7F] pt-1 border-t border-dashed border-gray-200">
                          <span>Montant total:</span>
                          <span className="text-[#0057FF]">{totalPrice.toLocaleString('fr-FR')} CDF</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmittingOrder}
                      className="w-full bg-[#0057FF] text-white font-black py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-2 mt-2"
                    >
                      {isSubmittingOrder ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <CheckCircle className="w-5 h-5 text-[#FFC107]" />
                          <span>Confirmer &amp; Payer ({totalPrice.toLocaleString('fr-FR')} CDF)</span>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              ) : items.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm">
                  <span className="text-4xl mb-3 block">🛒</span>
                  <p className="text-sm font-black text-gray-500">Votre panier est vide</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto mb-6">
                    Parcourez notre catalogue et dénichez les meilleures offres de Lubumbashi !
                  </p>
                  <button
                    onClick={() => setActiveTab('catalog')}
                    className="px-6 py-3 bg-[#0057FF] text-white font-black rounded-xl text-xs active:scale-95 transition-all shadow-md shadow-[#0057FF]/20"
                  >
                    Faire du shopping
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-100">
                    <span className="text-xs font-black text-gray-500 uppercase">Mon Panier ({totalItems} articles)</span>
                    <button 
                      onClick={clearCart}
                      className="text-xs font-bold text-red-500 flex items-center space-x-1 active:scale-95"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Vider</span>
                    </button>
                  </div>

                  {/* Cart items list */}
                  <div className="space-y-3">
                    {items.map((item, idx) => (
                      <div 
                        key={`${item.product.id}_${idx}`}
                        className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex items-center space-x-3"
                      >
                        <div className="w-16 h-16 rounded-xl bg-gray-50 flex-shrink-0 p-1 flex items-center justify-center">
                          <img src={item.product.imageUrl} alt={item.product.name} className="max-h-full max-w-full object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-extrabold text-gray-800 truncate mb-0.5">{item.product.name}</h4>
                          {item.selectedSize && (
                            <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase block w-max mb-1">
                              {item.selectedSize}
                            </span>
                          )}
                          <span className="text-xs font-black text-[#0057FF] block">
                            {(item.product.price * item.quantity).toLocaleString('fr-FR')} CDF
                          </span>
                        </div>

                        {/* Quantity editor */}
                        <div className="flex items-center space-x-2.5 bg-gray-50 px-2 py-1.5 rounded-xl border border-gray-100">
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedSize)}
                            className="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-600 active:scale-90"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black text-gray-800 min-w-[12px] text-center">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedSize)}
                            className="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center text-gray-600 active:scale-90"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total pricing block */}
                  <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-4">
                    <div className="space-y-2 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Sous-total:</span>
                        <span className="font-bold text-gray-700">{totalPrice.toLocaleString('fr-FR')} CDF</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Livraison:</span>
                        <span className="text-emerald-600 font-extrabold">Gratuite (Express)</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-[#002B7F] pt-2 border-t border-dashed border-gray-200">
                        <span>Total à payer:</span>
                        <span className="text-lg text-[#0057FF]">{totalPrice.toLocaleString('fr-FR')} CDF</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setIsCheckingOut(true)}
                      className="w-full bg-[#0057FF] text-white font-black py-4 rounded-2xl shadow-lg shadow-[#0057FF]/30 active:scale-95 transition-all flex items-center justify-center space-x-2"
                    >
                      <CreditCard className="w-5 h-5 text-[#FFC107]" />
                      <span>Passer la commande</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            
            /* ==================== PROFILE SCREEN ==================== */
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              {/* Profile card metadata info */}
              <div className="bg-[#002B7F] text-white rounded-3xl p-5 shadow-sm relative overflow-hidden">
                <div className="absolute right-0 top-0 w-24 h-24 bg-[#0057FF]/30 rounded-bl-[4rem]" />
                <div className="flex items-center space-x-4 relative">
                  {profile?.photoURL ? (
                    <img 
                      src={profile.photoURL} 
                      alt="Profile Avatar" 
                      className="w-16 h-16 rounded-full object-cover border-2 border-[#FFC107] shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-full bg-[#0057FF] flex items-center justify-center border-2 border-[#FFC107] text-white text-2xl font-black">
                      {profile?.displayName?.charAt(0) || 'U'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="font-extrabold text-lg truncate">{profile?.displayName || profile?.nom || 'Client DavidSTORE'}</h3>
                    <p className="text-xs text-white/75 truncate">{profile?.email || 'Pas d\'email'}</p>
                    <p className="text-[10px] text-[#FFC107] bg-white/10 px-2 py-0.5 rounded-full font-black w-max mt-1">
                      ID Telegram: {profile?.telegramId || 'Exclusif Telegram'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-white/10 text-center">
                  <div>
                    <span className="block text-xl font-black text-[#FFC107]">{orderHistory.length}</span>
                    <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Commandes</span>
                  </div>
                  <div>
                    <span className="block text-xl font-black text-[#FFC107]">
                      {orderHistory.filter(o => o.status === 'delivered').length}
                    </span>
                    <span className="text-[10px] text-white/60 font-bold uppercase tracking-wider">Livraisons</span>
                  </div>
                </div>
              </div>

              {/* Personal details fields */}
              <div className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 space-y-3.5">
                <h3 className="font-extrabold text-[#002B7F] text-sm uppercase tracking-wider mb-2 border-b border-gray-50 pb-2">Mes coordonnées</h3>
                
                <div className="flex items-center space-x-3 text-xs text-gray-600">
                  <Phone className="w-4 h-4 text-[#0057FF] flex-shrink-0" />
                  <div>
                    <span className="block text-gray-400 font-bold text-[10px] uppercase">Téléphone</span>
                    <span className="font-black text-gray-800">{profile?.telephone || profile?.phone || 'Non configuré'}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 text-xs text-gray-600">
                  <MapPin className="w-4 h-4 text-[#0057FF] flex-shrink-0" />
                  <div>
                    <span className="block text-gray-400 font-bold text-[10px] uppercase">Adresse de livraison par défaut</span>
                    <span className="font-bold text-gray-800 line-clamp-2">
                      {profile?.addresses && profile.addresses.length > 0 
                        ? profile.addresses[0].addressLines 
                        : (profile?.address || 'Aucune adresse renseignée. Remplie automatiquement lors de l\'achat.')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Order history list timeline */}
              <div className="space-y-3">
                <h3 className="font-extrabold text-[#002B7F] text-base px-1">📦 Historique de mes achats</h3>
                
                {orderHistory.length === 0 ? (
                  <div className="bg-white rounded-3xl p-6 text-center text-xs text-gray-400 border border-gray-100 shadow-sm">
                    Aucune commande passée pour le moment.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {orderHistory.map(order => (
                      <div 
                        key={order.id}
                        className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 space-y-3"
                      >
                        <div className="flex justify-between items-center border-b border-gray-50 pb-2.5">
                          <div>
                            <span className="block font-black text-[#002B7F] text-xs">Commande #{order.id.slice(-8).toUpperCase()}</span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(order.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                          
                          {/* Order Status badge colors */}
                          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider ${
                            order.status === 'processing' || order.status === 'pending'
                              ? 'bg-amber-50 text-amber-600'
                              : order.status === 'delivered'
                              ? 'bg-emerald-50 text-emerald-600'
                              : order.status === 'cancelled'
                              ? 'bg-red-50 text-red-600'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {order.status === 'payment_pending' ? 'Attente Paiement' :
                             order.status === 'pending' ? 'Confirmée' :
                             order.status === 'processing' ? 'En préparation' :
                             order.status === 'shipped' ? 'Expédiée' :
                             order.status === 'delivered' ? 'Livrée' : 'Annulée'}
                          </span>
                        </div>

                        {/* Order items lists preview */}
                        <div className="space-y-1.5">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-xs text-gray-600">
                              <span className="truncate max-w-[70%]">
                                <span className="font-black text-gray-400">{item.quantity}x</span> {item.product.name}
                              </span>
                              <span className="font-bold text-gray-800">
                                {(item.product.price * item.quantity).toLocaleString('fr-FR')} CDF
                              </span>
                            </div>
                          ))}
                        </div>

                        <div className="flex justify-between items-center pt-2.5 border-t border-gray-50 text-xs">
                          <span className="text-gray-400 font-bold">Montant Total</span>
                          <span className="font-black text-[#0057FF] text-sm">
                            {order.total.toLocaleString('fr-FR')} CDF
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* 3. MODAL DE PAIEMENT USSD SHWARY */}
      <AnimatePresence>
        {paymentStatus === 'waiting_ussd' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 left-1/2 -translate-x-1/2 max-w-md w-full"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] p-6 shadow-2xl border border-gray-100 w-full text-center space-y-5"
            >
              <div className="w-16 h-16 rounded-full bg-[#0057FF]/10 flex items-center justify-center mx-auto border border-[#0057FF]/30 animate-pulse">
                <Clock className="w-8 h-8 text-[#0057FF]" />
              </div>

              <div>
                <h3 className="font-black text-xl text-[#002B7F] mb-1">Paiement en cours...</h3>
                <p className="text-xs text-gray-400">Shwary Mobile Money DRC Gateway</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-center space-y-2">
                <p className="text-xs text-gray-500 leading-relaxed">
                  Un message popup USSD d'autorisation de transaction vient d'être envoyé sur votre numéro :
                </p>
                <p className="font-black text-[#0057FF] text-sm tracking-wider">{shwaryPhone}</p>
                <p className="text-[10px] text-amber-600 bg-amber-50 px-3 py-1 rounded-full font-extrabold w-max mx-auto">
                  Veuillez taper votre PIN secret pour finaliser.
                </p>
              </div>

              {/* Polling loading indicator */}
              <div className="flex flex-col items-center justify-center space-y-1.5">
                <div className="flex space-x-1.5">
                  <div className="w-2.5 h-2.5 bg-[#0057FF] rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-2.5 h-2.5 bg-[#0057FF] rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-2.5 h-2.5 bg-[#0057FF] rounded-full animate-bounce" />
                </div>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Attente de validation du réseau ({countdown}s)</span>
              </div>

              <button
                onClick={() => setPaymentStatus('failed')}
                className="text-xs text-gray-400 font-bold underline active:scale-95 transition-all"
              >
                Annuler la transaction
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paymentStatus === 'success' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 left-1/2 -translate-x-1/2 max-w-md w-full"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-[2rem] p-6 shadow-2xl border border-gray-100 w-full text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto border-2 border-emerald-500/20">
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              </div>

              <div>
                <h3 className="font-black text-xl text-emerald-600 mb-1">Félicitations !</h3>
                <p className="text-xs text-gray-500">Votre paiement Shwary a été validé avec succès !</p>
              </div>

              <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100 space-y-1">
                <p className="text-xs text-emerald-800 font-extrabold">Commande confirmée !</p>
                <p className="text-[10px] text-emerald-600">
                  Nos équipes à Lubumbashi commencent la préparation express de votre colis.
                </p>
              </div>

              <button
                onClick={() => {
                  setPaymentStatus('idle');
                  setIsCheckingOut(false);
                  setActiveTab('profile'); // go to profile history
                }}
                className="w-full bg-[#0057FF] text-white font-black py-3.5 rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                Suivre ma commande
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {paymentStatus === 'failed' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 z-50 left-1/2 -translate-x-1/2 max-w-md w-full"
          >
            <motion.div 
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-white rounded-[2rem] p-6 shadow-2xl border border-gray-100 w-full text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto border-2 border-red-500/20">
                <span className="text-3xl text-red-500 font-black">!</span>
              </div>

              <div>
                <h3 className="font-black text-xl text-red-600 mb-1">Échec du paiement</h3>
                <p className="text-xs text-gray-500">Le paiement a été refusé ou a expiré.</p>
              </div>

              <p className="text-xs text-gray-400 max-w-xs mx-auto">
                Assurez-vous de disposer du solde suffisant sur votre compte Mobile Money et d'avoir validé le code PIN promptement.
              </p>

              <button
                onClick={() => {
                  setPaymentStatus('idle');
                }}
                className="w-full bg-red-500 text-white font-black py-3.5 rounded-2xl shadow-lg active:scale-95 transition-all"
              >
                Réessayer
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 4. BOTTOM PERSISTENT NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 max-w-md w-full bg-white border-t border-gray-100 shadow-2xl rounded-t-[1.75rem] px-4 py-3 flex justify-around items-center z-40">
        
        <button 
          onClick={() => { setSelectedProduct(null); setActiveTab('home'); }}
          className={`flex flex-col items-center space-y-1 relative py-1 px-3.5 rounded-xl transition-all duration-300 ${
            activeTab === 'home' && !selectedProduct ? 'text-[#0057FF]' : 'text-gray-400'
          }`}
        >
          <Home className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[10px] font-black">Accueil</span>
          {activeTab === 'home' && !selectedProduct && (
            <motion.div layoutId="nav-dot" className="absolute -bottom-1 w-1 h-1 bg-[#0057FF] rounded-full" />
          )}
        </button>

        <button 
          onClick={() => { setSelectedProduct(null); setActiveTab('catalog'); }}
          className={`flex flex-col items-center space-y-1 relative py-1 px-3.5 rounded-xl transition-all duration-300 ${
            activeTab === 'catalog' && !selectedProduct ? 'text-[#0057FF]' : 'text-gray-400'
          }`}
        >
          <Search className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[10px] font-black">Catalogue</span>
          {activeTab === 'catalog' && !selectedProduct && (
            <motion.div layoutId="nav-dot" className="absolute -bottom-1 w-1 h-1 bg-[#0057FF] rounded-full" />
          )}
        </button>

        <button 
          onClick={() => { setSelectedProduct(null); setActiveTab('cart'); }}
          className={`flex flex-col items-center space-y-1 relative py-1 px-3.5 rounded-xl transition-all duration-300 ${
            activeTab === 'cart' && !selectedProduct ? 'text-[#0057FF]' : 'text-gray-400'
          }`}
        >
          <div className="relative">
            <ShoppingCart className="w-5 h-5 stroke-[2.5]" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-[#FFC107] text-[#002B7F] text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-white">
                {totalItems}
              </span>
            )}
          </div>
          <span className="text-[10px] font-black">Panier</span>
          {activeTab === 'cart' && !selectedProduct && (
            <motion.div layoutId="nav-dot" className="absolute -bottom-1 w-1 h-1 bg-[#0057FF] rounded-full" />
          )}
        </button>

        <button 
          onClick={() => { setSelectedProduct(null); setActiveTab('profile'); }}
          className={`flex flex-col items-center space-y-1 relative py-1 px-3.5 rounded-xl transition-all duration-300 ${
            activeTab === 'profile' && !selectedProduct ? 'text-[#0057FF]' : 'text-gray-400'
          }`}
        >
          <User className="w-5 h-5 stroke-[2.5]" />
          <span className="text-[10px] font-black">Compte</span>
          {activeTab === 'profile' && !selectedProduct && (
            <motion.div layoutId="nav-dot" className="absolute -bottom-1 w-1 h-1 bg-[#0057FF] rounded-full" />
          )}
        </button>

      </nav>

    </div>
  );
}
