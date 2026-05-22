import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Package, Heart, Settings, MapPin, CreditCard, ChevronRight, LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '../components/Button';
import { getUserOrders } from '../services/orderService';
import { Order } from '../models/types';

export const ProfileScreen: React.FC = () => {
  const { user, profile, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isFetchingOrders, setIsFetchingOrders] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchOrders = async () => {
        setIsFetchingOrders(true);
        const userOrders = await getUserOrders(user.uid);
        setOrders(userOrders);
        setIsFetchingOrders(false);
      };
      fetchOrders();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center bg-gray-50">
        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <UserIcon className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Bienvenue sur DavidSTORE</h2>
        <p className="text-gray-500 mb-8">Connectez-vous pour gérer votre compte et voir vos commandes.</p>
        <Button onClick={() => navigate('/login')} className="w-full">Se connecter</Button>
      </div>
    );
  }

  const processingCount = orders.filter(o => o.status === 'processing').length;
  const transitCount = orders.filter(o => o.status === 'shipped').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;

  const MENU_ITEMS = [
    { icon: Package, label: 'Mes commandes', path: '/orders', badge: orders.length > 0 ? `${orders.length}` : undefined },
    { icon: Heart, label: 'Liste de souhaits', path: '/wishlist', badge: profile?.wishlist?.length ? `${profile.wishlist.length}` : undefined },
    { icon: MapPin, label: 'Adresses de livraison', path: '/profile' },
    { icon: CreditCard, label: 'Moyens de paiement', path: '/profile' },
    { icon: Settings, label: 'Paramètres', path: '/profile' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-orange-500 pt-10 pb-6 px-6 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-white/20 overflow-hidden border-2 border-white/50">
            {profile?.photoUrl ? (
              <img src={profile.photoUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-full h-full p-3 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">{profile?.displayName || 'User'}</h2>
            <p className="text-orange-100 text-sm">{profile?.email}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-4">
        {/* Quick Stats */}
        <div 
          onClick={() => navigate('/orders')}
          className="bg-white rounded-xl shadow-sm p-4 grid grid-cols-3 gap-2 text-center relative z-10 cursor-pointer"
        >
          {[
            { label: 'À traiter', val: processingCount },
            { label: 'Expédié', val: transitCount },
            { label: 'Livré', val: deliveredCount }
          ].map(stat => (
            <div key={stat.label} className="flex flex-col items-center">
              <span className="text-lg font-bold text-gray-900">{stat.val}</span>
              <span className="text-[10px] text-gray-500 mt-1">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Dashboard Link for admin only */}
        {isAdmin && (
          <button 
            onClick={() => navigate('/admin')}
            className="w-full flex items-center px-4 py-4 border border-orange-200 bg-orange-50 rounded-xl shadow-sm hover:bg-orange-100 transition-colors"
          >
            <Settings className="w-5 h-5 text-orange-500 mr-3" />
            <span className="flex-1 text-left text-sm font-medium text-orange-800">Accéder au Panneau d'Administration</span>
            <ChevronRight className="w-4 h-4 text-orange-300" />
          </button>
        )}

        {/* Menu list */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {MENU_ITEMS.map((item, idx) => (
            <button 
              key={idx} 
              onClick={() => navigate(item.path)}
              className="w-full flex items-center px-4 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
            >
              <item.icon className="w-5 h-5 text-gray-400 mr-3" />
              <span className="flex-1 text-left text-sm font-medium text-gray-800">{item.label}</span>
              {item.badge && <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full mr-2">{item.badge}</span>}
              <ChevronRight className="w-4 h-4 text-gray-300" />
            </button>
          ))}
        </div>

        <button 
          onClick={async () => {
            await logout();
            navigate('/');
          }}
          className="w-full flex items-center justify-center space-x-2 bg-white rounded-xl shadow-sm p-4 text-red-500 font-medium hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Se déconnecter</span>
        </button>
      </div>
    </div>
  );
};
