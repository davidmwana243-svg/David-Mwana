import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { Layout } from './components/Layout';
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
  return (
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
              <Route index element={<AdminDashboardScreen />} />
              <Route path="products" element={<AdminProductsScreen />} />
              <Route path="orders" element={<AdminOrdersScreen />} />
              <Route path="customers" element={<AdminCustomersScreen />} />
            </Route>

            {/* Public Routes with Mobile Layout */}
            <Route path="/*" element={
              <Layout>
                <Routes>
                  <Route path="/splash" element={<SplashScreen />} />
                  <Route path="/onboarding" element={<OnboardingScreen />} />
                  <Route path="/login" element={<LoginScreen />} />
                  <Route path="/" element={<HomeScreen />} />
                  <Route path="/categories" element={<CategoriesScreen />} />
                  <Route path="/product/:id" element={<ProductDetailScreen />} />
                  <Route path="/cart" element={<CartScreen />} />
                  <Route path="/checkout" element={<ProtectedRoute><CheckoutScreen /></ProtectedRoute>} />
                  <Route path="/wishlist" element={<ProtectedRoute><WishlistScreen /></ProtectedRoute>} />
                  <Route path="/orders" element={<ProtectedRoute><OrdersScreen /></ProtectedRoute>} />
                  <Route path="/profile" element={<ProfileScreen />} />
                  <Route path="*" element={<Navigate to="/splash" replace />} />
                </Routes>
              </Layout>
            } />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
  );
}

