import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { Layout } from './components/Layout';
import { seedDatabase } from './services/mockData';
import { SplashScreen } from './screens/SplashScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { ProductDetailScreen } from './screens/ProductDetailScreen';
import { CartScreen } from './screens/CartScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { CheckoutScreen } from './screens/CheckoutScreen';
import { WishlistScreen } from './screens/WishlistScreen';
import { OrdersScreen } from './screens/OrdersScreen';
import { ChatAssistantScreen } from './screens/ChatAssistantScreen';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { AddressScreen } from './screens/AddressScreen';
import { CatalogScreen } from './screens/CatalogScreen';
import { MaintenanceScreen } from './screens/MaintenanceScreen';

const MaintenanceWrapper = ({ children }: { children: React.ReactNode }) => {
  const { maintenanceMode, isAdmin, loading } = useAuth();
  
  if (loading) return null;
  
  if (maintenanceMode && !isAdmin) {
    return <MaintenanceScreen />;
  }
  
  return <>{children}</>;
};

// Admin Imports
import { AdminLayout } from './components/admin/AdminLayout';
import { AdminDashboardScreen } from './screens/admin/AdminDashboardScreen';
import { AdminProductsScreen } from './screens/admin/AdminProductsScreen';
import { AdminOrdersScreen } from './screens/admin/AdminOrdersScreen';
import { AdminCustomersScreen } from './screens/admin/AdminCustomersScreen';

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

export default function App() {
  React.useEffect(() => {
    seedDatabase();
  }, []);

  return (
    <AuthProvider>
      <CartProvider>
        <NotificationProvider>
          <BrowserRouter>
            <MaintenanceWrapper>
              <Routes>
                {/* Admin Routes */}
                <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
                  <Route index element={<AdminDashboardScreen />} />
                  <Route path="products" element={<AdminProductsScreen />} />
                  <Route path="orders" element={<AdminOrdersScreen />} />
                  <Route path="customers" element={<AdminCustomersScreen />} />
                </Route>

                {/* Public Routes - Wrapped in Layout individually for cleaner routing */}
                <Route path="/" element={<Layout><SplashScreen /></Layout>} />
                <Route path="/onboarding" element={<Layout><OnboardingScreen /></Layout>} />
                <Route path="/welcome" element={<Layout><WelcomeScreen /></Layout>} />
                <Route path="/login" element={<Layout><LoginScreen /></Layout>} />
                <Route path="/home" element={<Layout><HomeScreen /></Layout>} />
                <Route path="/categories" element={<Layout><CategoriesScreen /></Layout>} />
                <Route path="/catalog" element={<Layout><CatalogScreen /></Layout>} />
                <Route path="/product/:id" element={<Layout><ProductDetailScreen /></Layout>} />
                <Route path="/cart" element={<Layout><CartScreen /></Layout>} />
                <Route path="/chat" element={<Layout><ChatAssistantScreen /></Layout>} />
                <Route path="/checkout" element={<Layout><ProtectedRoute><CheckoutScreen /></ProtectedRoute></Layout>} />
                <Route path="/wishlist" element={<Layout><ProtectedRoute><WishlistScreen /></ProtectedRoute></Layout>} />
                <Route path="/orders" element={<Layout><ProtectedRoute><OrdersScreen /></ProtectedRoute></Layout>} />
                <Route path="/addresses" element={<Layout><ProtectedRoute><AddressScreen /></ProtectedRoute></Layout>} />
                <Route path="/profile" element={<Layout><ProfileScreen /></Layout>} />
                
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </MaintenanceWrapper>
          </BrowserRouter>
        </NotificationProvider>
      </CartProvider>
    </AuthProvider>
  );
}

