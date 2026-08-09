import React, { useState, useEffect } from 'react';
import { Home, LayoutGrid, Heart, ClipboardList, User, Download, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { cn } from '../../utils/cn';
import { motion, AnimatePresence } from 'motion/react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { totalItems } = useCart();

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const isDismissed = localStorage.getItem('davidstore-install-dismissed') === 'true';
      if (!isDismissed) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User responded to PWA install: ${outcome}`);
    setDeferredPrompt(null);
    setShowInstallBanner(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('davidstore-install-dismissed', 'true');
    setShowInstallBanner(false);
  };

  const navItems = [
    { path: '/home', icon: Home, label: 'Accueil' },
    { path: '/categories', icon: LayoutGrid, label: 'Catégories' },
    { path: '/wishlist', icon: Heart, label: 'Favoris' },
    { path: '/orders', icon: ClipboardList, label: 'Commandes' },
    { path: '/profile', icon: User, label: 'Compte' },
  ];

  // Hide nav on splash, onboarding, login, register, product, checkout, welcome, addresses
  const isHiddenNav = 
    ['/', '/splash', '/onboarding', '/welcome', '/login', '/register', '/checkout', '/addresses'].some(p => location.pathname === p || location.pathname === p + '/') || 
    location.pathname.startsWith('/product/');

  const renderPwaBanner = () => {
    if (isStandalone || !showInstallBanner || !deferredPrompt) return null;

    return (
      <AnimatePresence>
        {showInstallBanner && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className={cn(
              "fixed z-50 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-gradient-to-r from-[#002B7F] to-[#0057FF] text-white rounded-[24px] p-4 shadow-2xl border border-white/10 text-left",
              isHiddenNav ? "bottom-4" : "bottom-20"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-[#020714] rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                <img src="/icon.png" alt="DavidSTORE" className="w-10 h-10 object-contain rounded-xl" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-xs tracking-tight uppercase font-mono text-yellow-300">Installation</h4>
                <h3 className="font-black text-sm tracking-tight mt-0.5">Installer l'application</h3>
                <p className="text-[11px] text-blue-50 font-semibold leading-relaxed mt-1">
                  Ajoutez DavidSTORE sur votre écran d'accueil pour y accéder en un clic et profiter de chargements ultra-rapides !
                </p>
                <div className="flex items-center gap-2 mt-3.5">
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="bg-white text-[#002B7F] hover:bg-blue-50 font-black text-[10px] tracking-wide px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer uppercase"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>INSTALLER</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="bg-white/20 hover:bg-white/30 text-white font-bold text-[10px] px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Plus tard
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={handleDismiss}
                className="text-white/70 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 text-gray-900 flex justify-center selection:bg-[#CE1126] selection:text-white">
      <div className="w-full max-w-[480px] min-h-screen bg-[#F8F9FA] flex flex-col relative shadow-xl overflow-x-hidden border-x border-gray-200/60">
        <main className="flex-1 pb-24">
          {children}
        </main>

        {renderPwaBanner()}

        {!isHiddenNav && (
          <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] bg-white/95 backdrop-blur-xl border-t border-gray-100 px-4 py-2 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-around">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || (item.path === '/home' && location.pathname === '/');
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={cn(
                      "flex flex-col items-center justify-center gap-1 py-1 px-3 rounded-2xl transition-all duration-300 relative",
                      isActive ? "text-[#CE1126]" : "text-gray-400 hover:text-gray-600"
                    )}
                  >
                    <div className="relative">
                      <Icon className={cn("w-5 h-5 transition-transform duration-300", isActive && "scale-110 stroke-[2.5]")} />
                      {item.path === '/orders' && totalItems > 0 && (
                        <span className="absolute -top-1.5 -right-2 bg-[#CE1126] text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-pulse">
                          {totalItems}
                        </span>
                      )}
                    </div>
                    <span className={cn("text-[10px] font-bold tracking-tight", isActive ? "text-[#CE1126]" : "text-gray-500")}>
                      {item.label}
                    </span>
                    {isActive && (
                      <motion.div
                        layoutId="activeTab"
                        className="absolute -bottom-1.5 w-5 h-1 bg-[#CE1126] rounded-full shadow-[0_2px_6px_rgba(206,17,38,0.4)]"
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
};
