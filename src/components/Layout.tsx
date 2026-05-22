import React from 'react';
import { Home, Search, ShoppingCart, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { cn } from '../utils/cn';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { totalItems } = useCart();

  const navItems = [
    { path: '/', icon: Home, label: 'Accueil' },
    { path: '/categories', icon: Search, label: 'Catégories' },
    { path: '/cart', icon: ShoppingCart, label: 'Panier', badge: totalItems },
    { path: '/profile', icon: User, label: 'Profil' },
  ];

  // Hide nav on splash, onboarding, login, product, checkout
  const isHiddenNav = 
    ['/splash', '/onboarding', '/login', '/checkout'].includes(location.pathname) || 
    location.pathname.startsWith('/product/');

  if (isHiddenNav) {
    return (
      <div className="flex flex-col h-[100dvh] bg-gray-50 max-w-md mx-auto border-x border-gray-200 relative shadow-2xl overflow-hidden">
        <main className="flex-1 flex flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-gray-50 max-w-md mx-auto border-x border-gray-200 relative pb-16 shadow-2xl overflow-hidden">
      <main className="flex-1 flex flex-col overflow-y-auto w-full">
        {children}
      </main>

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
