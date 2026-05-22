import React, { useEffect, useState } from 'react';
import { 
  DollarSign, 
  ShoppingCart, 
  Users, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  User as UserIcon
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
import { getOrders } from '../../services/orderService';
import { getCustomers } from '../../services/customerService';
import { Order, UserProfile } from '../../models/types';

export const AdminDashboardScreen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchData();
  }, []);

  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const totalOrders = orders.length;
  const totalCustomers = customers.length;

  // Simple conversion rate mock (since we don't have visitors data)
  const conversionRate = totalCustomers > 0 ? ((totalOrders / totalCustomers) * 10).toFixed(2) : '0';

  const stats = [
    { title: 'Revenus totaux', value: `${totalRevenue.toLocaleString()} FC`, change: '0%', isUp: true, icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100' },
    { title: 'Commandes', value: totalOrders.toString(), change: '0%', isUp: true, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-100' },
    { title: 'Clients', value: totalCustomers.toString(), change: '0%', isUp: true, icon: Users, color: 'text-orange-600', bg: 'bg-orange-100' },
    { title: 'Engagement', value: `${conversionRate}%`, change: '0%', isUp: true, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100' },
  ];

  // Group orders by day of week for the chart
  const weekDays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const chartData = weekDays.map((day, index) => {
    const dayOrders = orders.filter(order => {
      const d = new Date(order.createdAt);
      return d.getDay() === index;
    });
    const sales = dayOrders.reduce((sum, o) => sum + o.total, 0);
    return { name: day, sales, orders: dayOrders.length };
  });

  // Reorder chart data to end with today
  const today = new Date().getDay();
  const sortedChartData = [...chartData.slice(today + 1), ...chartData.slice(0, today + 1)];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Tableau de bord</h2>
        <p className="text-gray-500 mt-1">Données réelles de votre boutique.</p>
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
                    <p className="text-xs text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900">{order.total.toLocaleString()} FC</p>
                  <p className={`text-xs font-medium ${order.status === 'completed' ? 'text-green-600' : 'text-orange-600'}`}>
                    {order.status}
                  </p>
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
