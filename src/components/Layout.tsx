import React, { useState, useEffect } from 'react';
import { Home, Compass, MessageSquare, ShoppingCart, User, Download, X } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { cn } from '../utils/cn';
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
    { path: '/catalog', icon: Compass, label: 'Catalogue' },
    { path: '/categories', icon: MessageSquare, label: 'Messages' },
    { path: '/cart', icon: ShoppingCart, label: 'Panier', badge: totalItems },
    { path: '/profile', icon: User, label: 'Profil' },
  ];

  // Hide nav on splash, onboarding, login, product, checkout, welcome, addresses
  const isHiddenNav = 
    ['/', '/splash', '/onboarding', '/welcome', '/login', '/checkout', '/addresses'].includes(location.pathname) || 
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
              "fixed z-50 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-[24px] p-4 shadow-2xl border border-orange-400/20 text-left",
              isHiddenNav ? "bottom-4" : "bottom-20"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                <img src="/icon.png" alt="DavidSTORE" className="w-10 h-10 object-contain rounded-xl" />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-xs tracking-tight uppercase font-mono text-orange-200">Installation</h4>
                <h3 className="font-black text-sm tracking-tight mt-0.5">Installer l'application</h3>
                <p className="text-[11px] text-orange-50 font-semibold leading-relaxed mt-1">
                  Ajoutez DavidSTORE sur votre écran d'accueil pour y accéder en un clic et profiter de chargements ultra-rapides !
                </p>
                <div className="flex items-center gap-2 mt-3.5">
                  <button
                    type="button"
                    onClick={handleInstallClick}
                    className="bg-white text-orange-600 hover:bg-orange-50 font-black text-[10px] tracking-wide px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer uppercase"
                  >
                    <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>INSTALLER</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="bg-orange-600/30 hover:bg-orange-600/50 text-white font-bold text-[10px] px-3.5 py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Plus tard
                  </button>
                </div>
              </div>
              <button 
                type="button"
                onClick={handleDismiss}
                className="p-1 rounded-full hover:bg-white/10 text-orange-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  };

  if (isHiddenNav) {
    return (
      <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto border-x border-gray-200 relative shadow-2xl overflow-hidden">
        <main className="flex-1 flex flex-col overflow-y-auto">
          {children}
        </main>
        {renderPwaBanner()}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto border-x border-gray-200 relative pb-16 shadow-2xl overflow-hidden">
      <main className="flex-1 flex flex-col overflow-y-auto w-full">
        {children}
      </main>
      {renderPwaBanner()}

      <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-200 z-50 left-1/2 -translate-x-1/2">
        <div className="flex justify-around items-center h-16">
          {navItems.map(({ path, icon: Icon, label, badge }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full space-y-1 text-xs",
                  isActive ? "text-orange-500" : "text-gray-500 hover:text-gray-900"
                )}
              >
                <div className="relative">
                  <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
                  {badge !== undefined && badge > 0 && (
                    <span className="absolute -top-1 -right-2 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full">
                      {badge > 9 ? '9+' : badge}
                    </span>
                  )}
                </div>
                <span className="font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
