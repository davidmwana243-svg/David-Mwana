import React, { useEffect, useState, useRef } from 'react';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  User as UserIcon,
  RotateCcw,
  Clock,
  Bell
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { collection, getDocs, writeBatch, onSnapshot, query, orderBy } from 'firebase/firestore';
import { formatSafeDateShort } from '../../utils/dateUtils';
import { auth, db } from '../../config/firebase';
import { getOrders } from '../../services/orderService';
import { getCustomers } from '../../services/customerService';
import { Order, UserProfile } from '../../models/types';
import { useNotification } from '../../contexts/NotificationContext';

export const AdminDashboardScreen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const lastOrderCountRef = useRef<number>(0);
  const [resetting, setResetting] = useState(false);
  const [origin, setOrigin] = useState<string>('');
  const { showNotification } = useNotification();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ordersData, customersData] = await Promise.all([
        getOrders(),
        getCustomers()
      ]);
      setOrders(ordersData);
      setCustomers(customersData);
    } catch (error) {
      console.error("Error fetching dashboard data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    
    // Real-time orders listener
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      const fetched: Order[] = [];
      snapshot.forEach(docSnap => fetched.push(docSnap.data() as Order));

      // Notification logic
      if (lastOrderCountRef.current !== 0 && fetched.length > lastOrderCountRef.current) {
        const newestOrder = fetched[0];
        if (newestOrder.status === 'payment_pending') {
          showNotification(
            "Nouvelle Commande !", 
            `Client: ${newestOrder.userName} - ${newestOrder.total} FC`, 
            'success'
          );
          playNotificationSound();
        }
      }
      lastOrderCountRef.current = fetched.length;

      setOrders(fetched);
      setLoading(false);
    }, (error) => {
      console.error("Orders sync error:", error);
      setLoading(false);
    });

    // Real-time customers listener
    const customersQuery = query(collection(db, 'users'));
    const unsubCustomers = onSnapshot(customersQuery, (snapshot) => {
      const fetched: UserProfile[] = [];
      snapshot.forEach(docSnap => fetched.push(docSnap.data() as UserProfile));
      setCustomers(fetched);
    });

    return () => {
      unsubOrders();
      unsubCustomers();
    };
  }, []);

  const handleResetDatabase = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir réinitialiser la boutique ? Toutes les commandes, avis et clients de test seront supprimés pour remettre tous les compteurs réels à zéro.")) {
      return;
    }
    
    setResetting(true);
    try {
      const batchDocs = writeBatch(db);
      
      // 1. Delete all orders
      const ordersSnap = await getDocs(collection(db, 'orders'));
      ordersSnap.docs.forEach(docSnap => {
        batchDocs.delete(docSnap.ref);
      });
      
      // 2. Delete all reviews
      const reviewsSnap = await getDocs(collection(db, 'reviews'));
      reviewsSnap.docs.forEach(docSnap => {
        batchDocs.delete(docSnap.ref);
      });
      
      // 3. Delete all customers EXCEPT current user or administrative accounts
      const currentUid = auth.currentUser?.uid;
      const customersSnap = await getDocs(collection(db, 'users'));
      customersSnap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const isCurrentAdmin = docSnap.id === currentUid || 
                             data.email === 'davidmwana243@gmail.com' || 
                             data.email === 'davstore4@gmail.com' ||
                             data.phone === '0995289355' ||
                             data.phone === '+243995289355';
        if (!isCurrentAdmin) {
          batchDocs.delete(docSnap.ref);
        }
      });
      
      // 4. Reset products count in Firestore (salesCount: 0, reviewsCount: 0, rating: 5.0)
      const productsSnap = await getDocs(collection(db, 'products'));
      productsSnap.docs.forEach(docSnap => {
        batchDocs.update(docSnap.ref, {
          salesCount: 0,
          reviewsCount: 0,
          rating: 0
        });
      });
      
      await batchDocs.commit();
      
      // Seed again categories or items if necessary? They are not deleted anyway, only updated
      
      // Refresh state
      await fetchData();
      
      showNotification("Boutique", "La boutique a été réinitialisée avec succès ! Tous les compteurs de test sont maintenant à 0.", "success");
    } catch (error) {
      console.error("Error resetting database:", error);
      showNotification("Erreur", "Une erreur est survenue lors de la réinitialisation.", "error");
    } finally {
      setResetting(false);
    }
  };

  const confirmedOrders = orders.filter(o => o.status !== 'payment_pending' && o.status !== 'cancelled');
  const pendingPaymentOrders = orders.filter(o => o.status === 'payment_pending');
  const totalRevenue = confirmedOrders.reduce((sum, order) => sum + (order.total || 0), 0);
  const totalOrders = confirmedOrders.length;
  const totalCustomers = customers.length;
  const toProcessCount = pendingPaymentOrders.length;

  // Simple conversion rate mock (since we don't have visitors data)
  const conversionRate = totalCustomers > 0 ? ((totalOrders / totalCustomers) * 10).toFixed(2) : '0';

  const stats = [
    { title: 'Revenus totaux', value: `${totalRevenue.toLocaleString()} FC`, change: '0%', isUp: true, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'Commandes validées', value: totalOrders.toString(), change: '0%', isUp: true, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'À traiter (PIN)', value: toProcessCount.toString(), change: '0%', isUp: true, icon: Clock, color: 'text-orange-600', bg: 'bg-orange-100' },
    { title: 'Clients', value: totalCustomers.toString(), change: '0%', isUp: true, icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  // Reorder chart data to end with today
  const sortedChartData = React.useMemo(() => {
    const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    const chartData = weekDays.map((day, index) => {
      const dayOrders = confirmedOrders.filter(order => {
        let d: Date;
        if (order.createdAt && (order.createdAt as any).seconds) {
          d = new Date((order.createdAt as any).seconds * 1000);
        } else {
          d = new Date(order.createdAt);
        }
        return d.getDay() === index;
      });
      const sales = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      return { name: day, sales, orders: dayOrders.length };
    });

    const todayDay = new Date().getDay();
    return [...chartData.slice(todayDay + 1), ...chartData.slice(0, todayDay + 1)];
  }, [confirmedOrders]);

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'payment_pending': return 'Attente PIN';
      case 'delivered': return 'Livré';
      case 'processing': return 'Traitement';
      case 'shipped': return 'Expédié';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'payment_pending': return 'text-orange-600 bg-orange-50';
      case 'delivered': return 'text-green-600 bg-green-50';
      case 'processing': return 'text-blue-600 bg-blue-50';
      case 'shipped': return 'text-amber-600 bg-amber-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); 
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5); 
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
      setTimeout(() => audioCtx.close(), 1000);
    } catch (e) {
      console.warn("Audio alert blocked by browser", e);
    }
  };

  const testNotification = () => {
    showNotification(
      "DavidSTORE : Test Alerte", 
      "Le système de notification est maintenant ACTIF ! ✅", 
      'info'
    );
    playNotificationSound();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
          <p className="text-gray-500 mt-1">Données réelles de votre boutique.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={testNotification}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-xl font-bold text-sm transition-all active:scale-95"
            title="Tester les notifications"
          >
            <Bell size={16} />
            <span>Tester Alerte</span>
          </button>
          <button
            onClick={handleResetDatabase}
            disabled={resetting}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            <RotateCcw size={16} className={resetting ? "animate-spin" : ""} />
            {resetting ? "Réinitialiser" : "Réinitialiser"}
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
              <p className="text-gray-500 text-sm mt-1">{stat.title}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Liens Utiles Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-bold text-gray-900 mb-4">Liens de l'application</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Lien de Partage (Public)</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 truncate flex-1">
                https://ais-pre-htongq6rmqzf7q2pg4r7vz-437132868753.europe-west2.run.app
              </code>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText('https://ais-pre-htongq6rmqzf7q2pg4r7vz-437132868753.europe-west2.run.app');
                  showNotification("Lien", "Lien public copié !", "info");
                }}
                className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 hover:bg-blue-100 transition-all"
              >
                Copier
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 italic">* Utilisez ce lien pour vos clients. Il ne demande pas d'accès AI Studio.</p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Lien de Développement</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 truncate flex-1">
                {origin}
              </code>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(origin);
                  showNotification("Lien", "Lien de dev copié !", "info");
                }}
                className="text-[10px] font-black text-gray-600 bg-gray-200 px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-300 transition-all"
              >
                Copier
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 italic">* Lien interne pour les modifications techniques.</p>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-gray-900">Ventes par jour (semaine)</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sortedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Dernières commandes</h3>
          <div className="space-y-6">
            {orders.slice(0, 5).map((order, i) => (
              <div key={order.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                    <UserIcon size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">#{order.id.slice(-6)}</p>
                    <p className="text-xs text-gray-500">{formatSafeDateShort(order.createdAt)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{(order.total || 0).toLocaleString()} FC</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </div>
              </div>
            ))}
            {orders.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-4">Aucune commande pour le moment.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
