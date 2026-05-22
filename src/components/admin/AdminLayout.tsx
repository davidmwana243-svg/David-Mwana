import React, { useState } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  LogOut,
  Bell,
  Search,
  Menu
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const AdminLayout: React.FC = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { profile, logout } = useAuth();
  
  const MENU_ITEMS = [
    { path: '/admin', icon: LayoutDashboard, label: 'Tableau de bord' },
    { path: '/admin/products', icon: Package, label: 'Produits' },
    { path: '/admin/orders', icon: ShoppingCart, label: 'Commandes' },
    { path: '/admin/customers', icon: Users, label: 'Clients' },
  ];

  const clientPath = '/';

  return (
    <div className="min-h-screen bg-gray-100 flex font-sans text-gray-900">
      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-gray-800 bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed inset-y-0 left-0 bg-white w-64 shadow-xl z-30 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-center h-20 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-orange-500">DavidSTORE</h1>
        </div>
        <nav className="p-4 space-y-1">
          {MENU_ITEMS.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-orange-50 text-orange-600 font-medium' 
                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-orange-500' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
          
          <div className="pt-4 mt-4 border-t border-gray-100">
            <Link
              to="/"
              className="flex items-center space-x-3 px-4 py-3 text-gray-500 hover:bg-gray-50 hover:text-orange-600 rounded-lg transition-colors"
              onClick={() => setSidebarOpen(false)}
            >
              <Settings className="w-5 h-5" />
              <span>Retour à la Boutique</span>
            </Link>
          </div>
        </nav>
        <div className="absolute bottom-0 w-full p-4 border-t border-gray-100">
          <button 
            onClick={logout}
            className="flex items-center space-x-3 px-4 py-3 w-full text-gray-500 hover:bg-gray-50 hover:text-red-600 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-gray-100 flex items-center justify-between px-6 lg:px-10 z-10">
          <div className="flex items-center">
            <button 
              className="lg:hidden text-gray-500 hover:text-gray-700 focus:outline-none mr-4"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative hidden md:block">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                <Search className="w-5 h-5 text-gray-400" />
              </span>
              <input 
                type="text" 
                placeholder="Rechercher..." 
                className="w-full sm:w-64 pl-10 pr-4 py-2 bg-gray-50 border-transparent rounded-lg focus:bg-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors text-sm"
              />
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <button className="relative p-2 text-gray-400 hover:text-gray-500 transition-colors">
              <Bell className="w-6 h-6" />
              <span className="absolute top-1 right-1 block w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center space-x-3 border-l border-gray-200 pl-4">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold overflow-hidden border border-orange-200">
                {profile?.photoUrl ? (
                  <img src={profile.photoUrl} alt="Admin" className="w-full h-full object-cover" />
                ) : (
                  profile?.displayName?.charAt(0).toUpperCase() || 'A'
                )}
              </div>
              <div className="hidden md:block">
                <span className="block text-sm font-medium text-gray-700">{profile?.displayName || 'Administrateur'}</span>
                <span className="block text-xs text-gray-500">Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6 lg:p-10">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
