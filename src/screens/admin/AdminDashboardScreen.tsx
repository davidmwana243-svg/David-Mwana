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
  Bell,
  Wrench,
  Plus,
  Trash2,
  ShieldAlert
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
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

  const { maintenanceMode, maintenanceMessage, maintenanceChangelog, setMaintenance } = useAuth();
  const [mMode, setMMode] = useState(maintenanceMode);
  const [mMessage, setMMessage] = useState(maintenanceMessage);
  const [newChangeItem, setNewChangeItem] = useState('');
  const [mChangelog, setMChangelog] = useState<string[]>(maintenanceChangelog);
  const [savingMaintenance, setSavingMaintenance] = useState(false);

  useEffect(() => {
    setMMode(maintenanceMode);
    setMMessage(maintenanceMessage);
    setMChangelog(maintenanceChangelog);
  }, [maintenanceMode, maintenanceMessage, maintenanceChangelog]);

  const handleAddChangelogItem = () => {
    if (!newChangeItem.trim()) return;
    setMChangelog(prev => [...prev, newChangeItem.trim()]);
    setNewChangeItem('');
  };

  const handleRemoveChangelogItem = (index: number) => {
    setMChangelog(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveMaintenance = async () => {
    setSavingMaintenance(true);
    try {
      await setMaintenance(mMode, mMessage, mChangelog);
      showNotification("Mise à jour", "Configuration de la mise à jour enregistrée avec succès !", "success");
    } catch (err) {
      console.error("Error updating maintenance settings:", err);
      showNotification("Erreur", "Impossible d'enregistrer la configuration.", "error");
    } finally {
      setSavingMaintenance(false);
    }
  };

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

  const lastCustomerCountRef = useRef<number>(0);

  useEffect(() => {
    setLoading(true);
    
    // Real-time orders listener
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
      const fetched: Order[] = [];
      snapshot.forEach(docSnap => fetched.push(docSnap.data() as Order));

      // Notification logic for orders
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
      snapshot.forEach(docSnap => {
        const user = { id: docSnap.id, ...docSnap.data() } as UserProfile;
        const email = user.email || '';
        const photo = user.photoURL || user.photoUrl || '';
        const condition1 = email === '0995289355@davidstore.com' || email === 'davidmwana243@gmail.com';
        const condition2 = email === 'davstore4@gmail.com' && photo.trim() === '';
        if (!(condition1 || condition2)) {
          fetched.push(user);
        }
      });

      // Notification logic for new clients
      if (lastCustomerCountRef.current !== 0 && fetched.length > lastCustomerCountRef.current) {
        // Sort by creation date to find the newest
        const sorted = [...fetched].sort((a, b) => {
          const dateA = a.createdAt || a.dateCreation || 0;
          const dateB = b.createdAt || b.dateCreation || 0;
          return (dateB as number) - (dateA as number);
        });
        
        const newestClient = sorted[0];
        showNotification(
          "Nouveau Client !", 
          `${newestClient.nom || newestClient.displayName || 'Un nouveau client'} vient de rejoindre DavidSTORE !`, 
          'info'
        );
        playNotificationSound();
      }
      lastCustomerCountRef.current = fetched.length;

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
                             data.phone === '+243995289355' ||
                             data.telephone === '0995289355' ||
                             data.telephone === '+243995289355';
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

      {/* ⚙️ App Status & Maintenance Controls */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100 space-y-5">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-bold text-gray-900">Mise à jour & Maintenance</h3>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full ${maintenanceMode ? "bg-green-100 text-green-600 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                {maintenanceMode ? "Live: Écran actif" : "Live: Désactivé"}
              </span>
              <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full ${mMode ? "bg-orange-100 text-orange-600 animate-pulse border border-orange-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                {mMode ? "Drapeau d'update coché" : "Maintenance décochée"}
              </span>
            </div>
            {(mMode !== maintenanceMode || mMessage !== maintenanceMessage || JSON.stringify(mChangelog) !== JSON.stringify(maintenanceChangelog)) && (
              <span className="text-[9px] text-red-500 font-bold animate-bounce italic">Cliquez sur enregistrer pour appliquer !</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Toggles and Messages */}
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={mMode}
                  onChange={(e) => setMMode(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-500 cursor-pointer accent-orange-500 font-bold"
                />
                <div>
                  <span className="text-sm font-bold text-gray-950">Activer l'écran de mise à jour</span>
                  <p className="text-xs text-gray-500 leading-relaxed max-w-sm mt-0.5 font-normal">
                    Si coché, tous vos clients d'achat seront redirigés vers l'écran de mise à jour en temps réel. Seul votre compte administrateur aura accès complet à la boutique pour tester vos modifications.
                  </p>
                </div>
              </label>
            </div>

            <div className="space-y-1.5 flex flex-col">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Texte de l'Annonce</label>
              <textarea
                value={mMessage}
                onChange={(e) => setMMessage(e.target.value)}
                placeholder="Ex. Nous apportons de nouvelles améliorations sensationnelles..."
                rows={3}
                className="w-full text-sm border border-gray-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900"
              />
            </div>
          </div>

          {/* Changelog Items Editor */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-gray-600 uppercase tracking-wider block">Journal de modification (Ce qui a changé)</label>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={newChangeItem}
                onChange={(e) => setNewChangeItem(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddChangelogItem();
                  }
                }}
                placeholder="Ex. Ajout de la notification de paiement"
                className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-900 font-medium"
              />
              <button
                type="button"
                onClick={handleAddChangelogItem}
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 rounded-xl flex items-center justify-center transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="border border-gray-100 rounded-xl p-3 max-h-[140px] overflow-y-auto bg-gray-50/50 space-y-2">
              {mChangelog.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start gap-2 text-xs bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm">
                  <span className="text-gray-700 font-medium leading-relaxed">{item}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveChangelogItem(idx)}
                    className="text-red-500 hover:text-red-700 p-1 rounded-md transition-colors hover:bg-red-50 cursor-pointer shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {mChangelog.length === 0 && (
                <p className="text-center text-gray-400 font-medium py-3 text-xs italic">Aucun élément dans la liste.</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 flex justify-end">
          <button
            type="button"
            onClick={handleSaveMaintenance}
            disabled={savingMaintenance}
            className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-sm shadow-md shadow-orange-500/15 hover:shadow-orange-500/20 active:scale-95 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            {savingMaintenance ? "Enregistrement..." : "Enregistrer la Configuration"}
          </button>
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
                    <p className="text-sm font-bold text-gray-900">{order.userName || 'Client'}</p>
                    <p className="text-[10px] text-gray-400 font-medium">#{order.id.slice(-6)} • {formatSafeDateShort(order.createdAt)}</p>
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
