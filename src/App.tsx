import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { NotificationProvider } from './context/NotificationContext';
import { Layout } from './components/Layout';
import { seedDatabase } from './services/mockData';
import { SplashScreen } from './pages/SplashScreen';
import { OnboardingScreen } from './pages/OnboardingScreen';
import { LoginScreen } from './pages/LoginScreen';
import { HomeScreen } from './pages/HomeScreen';
import { CategoriesScreen } from './pages/CategoriesScreen';
import { ProductDetailScreen } from './pages/ProductDetailScreen';
import { CartScreen } from './pages/CartScreen';
import { ProfileScreen } from './pages/ProfileScreen';
import { CheckoutScreen } from './pages/CheckoutScreen';
import { WishlistScreen } from './pages/WishlistScreen';
import { OrdersScreen } from './pages/OrdersScreen';
import { ChatAssistantScreen } from './pages/ChatAssistantScreen';
import { WelcomeScreen } from './pages/WelcomeScreen';
import { AddressScreen } from './pages/AddressScreen';
import { CatalogScreen } from './pages/CatalogScreen';
import { MaintenanceScreen } from './pages/MaintenanceScreen';
import { TelegramMiniAppScreen } from './pages/TelegramMiniAppScreen';

const MaintenanceWrapper = ({ children }: { children: React.ReactNode }) => {
  const { maintenanceMode, isAdmin, loading, maintenanceLoaded } = useAuth();
  const location = useLocation();
  
  if (loading || !maintenanceLoaded) {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  
  // If maintenance mode is active, allow admins and login page
  if (maintenanceMode && !isAdmin) {
    // Exclude login, register and admin paths from maintenance screen
    const isPublicMaintenanceBypass = 
      location.pathname === '/login' || 
      location.pathname === '/register' || 
      location.pathname.startsWith('/admin');
      
    if (!isPublicMaintenanceBypass) {
      return <MaintenanceScreen />;
    }
  }
  
  return <>{children}</>;
};

// Admin Imports
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboardScreen } from './pages/admin/AdminDashboardScreen';
import { AdminProductsScreen } from './pages/admin/AdminProductsScreen';
import { AdminOrdersScreen } from './pages/admin/AdminOrdersScreen';
import { AdminCustomersScreen } from './pages/admin/AdminCustomersScreen';
import { AdminCategoriesScreen } from './pages/admin/AdminCategoriesScreen';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();
  if (loading) return null;
  if (!user || !isAdmin) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const TelegramGatekeeper = ({ children }: { children: React.ReactNode }) => {
  const { mustOpenInTelegram } = useAuth();
  const location = useLocation();

  if (mustOpenInTelegram && location.pathname === '/tma') {
    return (
      <div className="fixed inset-0 bg-[#020714] text-white flex flex-col items-center justify-center p-6 text-center z-50">
        <div className="w-24 h-24 bg-orange-500/10 rounded-full flex items-center justify-center mb-6 border border-orange-500/30 animate-pulse">
          <svg className="w-12 h-12 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-3 tracking-tight">Accès Limité</h1>
        <p className="text-gray-400 max-w-md mb-8 leading-relaxed">
          La Mini App officielle <strong className="text-orange-500">DAVIDSTORE</strong> doit impérativement être ouverte depuis notre bot Telegram afin de récupérer automatiquement vos informations de profil.
        </p>
        <a 
          href="https://t.me/DavidStoreBot" 
          target="_blank" 
          rel="noopener noreferrer"
          className="px-6 py-3 bg-orange-500 text-white font-medium rounded-xl shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-all duration-200 inline-flex items-center gap-2"
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15.75-.85 3.96-1.21 5.89-.15.82-.46 1.09-.75 1.12-.64.06-1.13-.42-1.75-.83-.97-.64-1.52-1.04-2.46-1.66-1.09-.72-.38-1.12.24-1.76.16-.17 2.97-2.72 3.02-2.95.01-.03.01-.14-.06-.2-.07-.06-.17-.04-.25-.02-.11.02-1.89 1.2-5.33 3.53-.5.35-.96.52-1.37.51-.46-.01-1.34-.26-2-.47-.8-.26-1.44-.4-1.39-.85.03-.24.3-.48.81-.73 3.19-1.39 5.32-2.31 6.38-2.76 3.04-1.27 3.67-1.49 4.08-1.5.09 0 .29.02.42.13.11.09.14.21.15.3-.01.06.01.21 0 .28z" />
          </svg>
          Ouvrir le Bot Telegram
        </a>
      </div>
    );
  }

  return <>{children}</>;
};

export default function App() {
  React.useEffect(() => {
    // Database seeding is now disabled to allow admin full control over product deletions.
    // seedDatabase();
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <NotificationProvider>
          <BrowserRouter>
            <MaintenanceWrapper>
              <TelegramGatekeeper>
                <Routes>
                  {/* Admin Routes */}
                  <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                    <Route index element={<AdminDashboardScreen />} />
                    <Route path="products" element={<AdminProductsScreen />} />
                    <Route path="categories" element={<AdminCategoriesScreen />} />
                    <Route path="orders" element={<AdminOrdersScreen />} />
                    <Route path="customers" element={<AdminCustomersScreen />} />
                  </Route>

                  {/* Public Routes - Wrapped in Layout individually for cleaner routing */}
                  <Route path="/" element={<Layout><SplashScreen /></Layout>} />
                  <Route path="/onboarding" element={<Layout><OnboardingScreen /></Layout>} />
                  <Route path="/welcome" element={<Layout><WelcomeScreen /></Layout>} />
                  <Route path="/login" element={<Layout><LoginScreen initialMode="login" /></Layout>} />
                  <Route path="/register" element={<Layout><LoginScreen initialMode="register" /></Layout>} />
                  <Route path="/home" element={<Layout><HomeScreen /></Layout>} />
                  <Route path="/categories" element={<Layout><CatalogScreen /></Layout>} />
                  <Route path="/catalog" element={<Layout><CatalogScreen /></Layout>} />
                  <Route path="/support" element={<Layout><CategoriesScreen /></Layout>} />
                  <Route path="/product/:id" element={<Layout><ProductDetailScreen /></Layout>} />
                  <Route path="/cart" element={<Layout><ProtectedRoute><CartScreen /></ProtectedRoute></Layout>} />
                  <Route path="/chat" element={<Layout><ProtectedRoute><ChatAssistantScreen /></ProtectedRoute></Layout>} />
                  <Route path="/checkout" element={<Layout><ProtectedRoute><CheckoutScreen /></ProtectedRoute></Layout>} />
                  <Route path="/wishlist" element={<Layout><ProtectedRoute><WishlistScreen /></ProtectedRoute></Layout>} />
                  <Route path="/orders" element={<Layout><ProtectedRoute><OrdersScreen /></ProtectedRoute></Layout>} />
                  <Route path="/tracking" element={<Layout><ProtectedRoute><OrdersScreen /></ProtectedRoute></Layout>} />
                  <Route path="/addresses" element={<Layout><ProtectedRoute><AddressScreen /></ProtectedRoute></Layout>} />
                  <Route path="/address" element={<Layout><ProtectedRoute><AddressScreen /></ProtectedRoute></Layout>} />
                  <Route path="/profile" element={<Layout><ProtectedRoute><ProfileScreen /></ProtectedRoute></Layout>} />
                  
                  <Route path="/tma" element={<TelegramMiniAppScreen />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </TelegramGatekeeper>
            </MaintenanceWrapper>
          </BrowserRouter>
        </NotificationProvider>
      </CartProvider>
    </AuthProvider>
  );
}

