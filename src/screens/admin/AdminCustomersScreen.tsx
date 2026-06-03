import React, { useState, useEffect } from 'react';
import { Search, MoreVertical, Mail, Phone, ShoppingCart, ShieldAlert, X, Copy, Check } from 'lucide-react';
import { Button } from '../../components/Button';
import { getCustomers } from '../../services/customerService';
import { UserProfile } from '../../models/types';
import { formatSafeDateShort } from '../../utils/dateUtils';
import { motion, AnimatePresence } from 'motion/react';

export const AdminCustomersScreen: React.FC = () => {
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const fetchCust = async () => {
      const fetched = await getCustomers();
      setCustomers(fetched);
      setIsLoading(false);
    };
    fetchCust();
  }, []);

  const filteredCustomers = customers.filter(c => 
    c.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone?.includes(searchQuery) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Clients</h2>
          <p className="text-gray-500 mt-1">Gérez vos clients et consultez leur historique.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Rechercher par nom, téléphone..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-6 py-4">Client</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Souhaits</th>
                <th className="px-6 py-4">Inscrit le</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500 font-black uppercase text-[10px] tracking-widest">Chargement...</td></tr>
              ) : filteredCustomers.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-500">Aucun client trouvé.</td></tr>
              ) : (
                filteredCustomers.map((customer, idx) => (
                  <tr key={customer.id || idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold overflow-hidden border border-blue-200 shadow-sm">
                          {customer.photoUrl ? (
                            <img 
                              src={customer.photoUrl} 
                              alt="Avatar" 
                              className="w-full h-full object-cover" 
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                const parent = target.parentElement;
                                target.style.display = 'none';
                                if (parent) {
                                  parent.innerHTML = `<span class="font-bold">${customer.displayName?.charAt(0).toUpperCase() || 'U'}</span>`;
                                }
                              }}
                            />
                          ) : (
                            customer.displayName?.charAt(0).toUpperCase() || 'U'
                          )}
                        </div>
                        <div>
                          <p className="font-black text-gray-900 leading-tight">
                            {customer.displayName && customer.displayName !== 'Utilisateur' 
                              ? customer.displayName 
                              : (customer.firstName ? `${customer.firstName} ${customer.lastName || ''}`.trim() : `Client ${customer.phone || customer.email?.split('@')[0] || 'Utilisateur'}`)}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">{customer.phone || 'Pas de numéro'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center text-gray-600 bg-gray-50 px-2 py-1 rounded-md border border-gray-100 w-fit">
                          <Mail className="w-3 h-3 mr-2 text-blue-500" />
                          <span className="text-[10px] font-bold">{customer.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-black">
                       <span className="text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                         {customer.wishlist?.length || 0} envies
                       </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-xs font-medium">{formatSafeDateShort(customer.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedUser(customer)}
                        className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-xl border border-blue-100 hover:bg-blue-100 transition-all uppercase tracking-widest"
                      >
                        Réinitialiser
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Helper Modal for Password Reset */}
      <AnimatePresence>
        {selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
            >
              <div className="bg-blue-600 p-6 text-white text-center relative">
                <button 
                  onClick={() => setSelectedUser(null)}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                   <ShieldAlert className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-black uppercase tracking-tight">Réinitialisation</h3>
                <p className="text-blue-100 text-xs mt-1">Gérer l'accès de {selectedUser.displayName}</p>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  <div className="p-4 bg-orange-50 border border-orange-100 rounded-2xl text-orange-800 text-xs font-bold flex gap-3">
                    <ShieldAlert className="w-5 h-5 shrink-0" />
                    <p>Pour des raisons de sécurité, le mot de passe doit être modifié via la Console DavidSTORE.</p>
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Identifiant Client (Email)</label>
                    <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between group">
                      <code className="text-xs font-black text-gray-800">{selectedUser.email}</code>
                      <button 
                        onClick={() => handleCopyEmail(selectedUser.email || '')}
                        className="text-blue-600 p-1.5 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-2">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Instructions pour l'admin :</h4>
                    <ol className="text-xs text-gray-600 space-y-2 font-medium list-decimal list-inside">
                      <li>Copiez l'identifiant ci-dessus.</li>
                      <li>Allez dans <b>Firebase Console &gt; Authentication</b>.</li>
                      <li>Cliquez sur l'utilisateur et choisissez <b>"Réinitialiser le mot de passe"</b>.</li>
                    </ol>
                  </div>
                </div>

                <div className="mt-8 space-y-3">
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                          const message = `Bonjour ${selectedUser.displayName}, votre demande de réinitialisation est en cours. Veuillez nous contacter sur WhatsApp pour valider votre nouveau code.`;
                          window.open(`https://wa.me/${selectedUser.phone?.replace('+', '')}?text=${encodeURIComponent(message)}`, '_blank');
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 h-12 rounded-2xl font-black uppercase tracking-[0.05em] text-[10px] flex items-center justify-center gap-2"
                    >
                      WhatsApp
                    </Button>
                    
                    <Button 
                      onClick={() => {
                          const tempCode = Math.floor(100000 + Math.random() * 900000);
                          const message = `DavidSTORE: Votre nouveau code temporaire est ${tempCode}. Connectez-vous et changez-le dans votre profil.`;
                          window.location.href = `sms:${selectedUser.phone}?body=${encodeURIComponent(message)}`;
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 h-12 rounded-2xl font-black uppercase tracking-[0.05em] text-[10px] flex items-center justify-center gap-2"
                    >
                      SMS Normal
                    </Button>
                  </div>
                  
                  <p className="text-[9px] text-gray-400 text-center font-bold uppercase italic">
                    * Le bouton SMS pré-remplit le message sur votre téléphone.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

