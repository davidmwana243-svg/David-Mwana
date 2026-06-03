import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Package, Heart, Settings, MapPin, ChevronRight, LogOut, User as UserIcon, Share2, MessageSquare, Bot, CreditCard } from 'lucide-react';
import { Button } from '../components/Button';
import { getUserOrders } from '../services/orderService';
import { Order } from '../models/types';

import { db } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

export const ProfileScreen: React.FC = () => {
  const { user, profile, logout, isAdmin, updateProfile, loading: authLoading } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isFetchingOrders, setIsFetchingOrders] = useState(false);
  const [paymentExpanded, setPaymentExpanded] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  useEffect(() => {
    if (profile) {
      setSelectedProvider(profile.preferredPaymentMethod || '');
      setPaymentNumber(profile.paymentPhone || profile.phone || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    setIsFetchingOrders(true);
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef, 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userOrders: Order[] = [];
      snapshot.forEach((doc) => {
        userOrders.push(doc.data() as Order);
      });
      setOrders(userOrders);
      setIsFetchingOrders(false);
    }, (error) => {
      console.error("Error listening to orders:", error);
      setIsFetchingOrders(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 bg-white">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm font-medium">Chargement du profil...</p>
      </div>
    );
  }

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

  const processingCount = orders.filter(o => o.status === 'processing' || o.status === 'payment_pending').length;
  const transitCount = orders.filter(o => o.status === 'shipped').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;

  const handleSavePayment = async () => {
    if (!user) return;
    setIsSavingPayment(true);
    try {
      await updateProfile({
        preferredPaymentMethod: selectedProvider,
        paymentPhone: paymentNumber
      });
      showNotification('Profil', 'Informations de paiement mises à jour.', 'success');
      navigate('/home');
    } catch (err) {
      console.error('Error saving payment:', err);
      showNotification('Profil', 'Erreur lors de la sauvegarde.', 'error');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const pendingOrdersCount = orders.filter(o => o.status === 'payment_pending').length;

  const MENU_ITEMS = [
    { icon: Package, label: 'Mes commandes', path: '/orders', badge: pendingOrdersCount > 0 ? `${pendingOrdersCount}` : undefined },
    { icon: Heart, label: 'Liste de souhaits', path: '/wishlist', badge: profile?.wishlist?.length ? `${profile.wishlist.length}` : undefined },
    { icon: MapPin, label: 'Adresses de livraison', path: '/addresses' },
    { icon: CreditCard, label: 'Moyens de paiement', action: 'togglePayment' },
    { icon: MessageSquare, label: 'Support WhatsApp', action: 'whatsapp' },
    { icon: Bot, label: 'Nicole (Assistant DavidSTORE)', action: 'ai' },
    { icon: Share2, label: 'Partagez DavidSTORE', action: 'share' },
  ];

  const handleAction = async (item: any) => {
    if (item.action === 'togglePayment') {
      setPaymentExpanded(!paymentExpanded);
      return;
    }
    if (item.action === 'whatsapp') {
      window.open('https://wa.me/243852849473', '_blank');
      return;
    }
    if (item.action === 'ai') {
      navigate('/chat');
      return;
    }
    if (item.action === 'share') {
      const targetUrl = 'https://ais-pre-htongq6rmqzf7q2pg4r7vz-437132868753.europe-west2.run.app';
      const shareData = {
        title: 'DavidSTORE',
        text: 'Découvrez DavidSTORE, ma boutique en ligne préférée !',
        url: targetUrl
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(targetUrl);
          showNotification('Partage', 'Lien de l\'application copié dans le presse-papier !', 'info');
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
          // Fallback to clipboard if share fails for non-abort reason
          try {
            await navigator.clipboard.writeText(targetUrl);
            showNotification('Partage', 'Lien copié dans le presse-papier !', 'info');
          } catch (clipErr) {
            console.error('Clipboard fallback failed:', clipErr);
          }
        }
      }
      return;
    }
    
    if (item.path) {
      navigate(item.path);
    }
  };

  const getDisplayName = () => {
    if (profile?.displayName && profile.displayName !== 'Utilisateur') return profile.displayName;
    if (profile?.firstName) return `${profile.firstName} ${profile.lastName || ''}`.trim();
    if (profile?.email?.endsWith('@davidstore.com')) {
      const phone = profile.email.split('@')[0];
      return `Client ${phone}`;
    }
    if (user?.email?.endsWith('@davidstore.com')) {
      const phone = user.email.split('@')[0];
      return `Client ${phone}`;
    }
    return profile?.displayName || 'Utilisateur';
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-orange-500 pt-10 pb-6 px-6 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-white/20 overflow-hidden border-2 border-white/50">
            {profile?.photoUrl ? (
              <img 
                src={profile.photoUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const parent = target.parentElement;
                  target.style.display = 'none';
                  if (parent) {
                    parent.classList.add('bg-orange-500');
                    parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-white"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>';
                  }
                }}
              />
            ) : (
              <UserIcon className="w-full h-full p-3 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {getDisplayName()}
            </h2>
            <p className="text-orange-100 text-sm">{profile?.email || user?.email}</p>
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
            <React.Fragment key={idx}>
              <button 
                onClick={() => handleAction(item)}
                className="w-full flex items-center px-4 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
              >
                <item.icon className="w-5 h-5 text-gray-400 mr-3" />
                <span className="flex-1 text-left text-sm font-medium text-gray-800">{item.label}</span>
                {item.badge && <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full mr-2">{item.badge}</span>}
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>

              {/* Payment Methods Section - Displayed when expanded */}
              {item.action === 'togglePayment' && paymentExpanded && (
                <div className="px-4 py-6 bg-gray-50 border-b border-gray-100 animate-in slide-in-from-top duration-300">
                  <div className="mb-5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Choisir votre mode préféré</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'mpesa', name: 'M-Pesa', logo: 'https://i.postimg.cc/26Phc4LK/1779419706497.jpg' },
                        { id: 'airtel', name: 'Airtel Money', logo: 'https://i.postimg.cc/hvWMzFsc/1779419565561.jpg' },
                        { id: 'orange', name: 'Orange Money', logo: 'https://i.postimg.cc/BQfwtF7T/1779419792771.jpg' }
                      ].map(pay => (
                        <div 
                          key={pay.id} 
                          onClick={() => setSelectedProvider(pay.id)}
                          className={`flex items-center justify-center aspect-square rounded-xl border-2 overflow-hidden transition-all cursor-pointer ${
                            selectedProvider === pay.id 
                            ? 'border-orange-500 bg-orange-50 shadow-sm' 
                            : 'border-white bg-white hover:border-gray-200'
                          }`}
                        >
                          <img 
                            src={pay.logo} 
                            alt={pay.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${pay.name.charAt(0)}&background=f3f4f6&color=9ca3af&size=64`;
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Numéro de téléphone</label>
                      <input 
                        type="tel"
                        value={paymentNumber}
                        onChange={(e) => setPaymentNumber(e.target.value)}
                        placeholder="Ex: 0812345678"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    
                    <Button 
                      onClick={handleSavePayment}
                      disabled={isSavingPayment || !selectedProvider || !paymentNumber}
                      className="w-full text-sm font-bold h-12"
                    >
                      {isSavingPayment ? 'Enregistrement...' : 'Mettre à jour les infos'}
                    </Button>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <button 
          onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
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
