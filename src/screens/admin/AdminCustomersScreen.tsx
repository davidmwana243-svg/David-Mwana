import React, { useState, useEffect } from 'react';
import { Search, MoreVertical, Mail, Phone, ShoppingCart, ShieldAlert, X, Copy, Check, Trash2 } from 'lucide-react';
import { Button } from '../../components/Button';
import { collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { UserProfile } from '../../models/types';
import { formatSafeDateShort } from '../../utils/dateUtils';
import { motion, AnimatePresence } from 'motion/react';
import { useNotification } from '../../contexts/NotificationContext';

export const AdminCustomersScreen: React.FC = () => {
  const [customers, setCustomers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserForDelete, setSelectedUserForDelete] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showNotification } = useNotification();

  useEffect(() => {
    setIsLoading(true);
    
    // Real-time customers listener
    const q = collection(db, 'users');
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedData: UserProfile[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        
        // Use the same normalization logic as customerService.ts for consistency
        const realPhone = data.telephone || data.phone || data.phoneNumber || '';
        const realName = data.nom || data.displayName || (data.firstName ? `${data.firstName} ${data.lastName || ''}`.trim() : '');
        const defaultName = data.email ? `Client ${data.email.split('@')[0]}` : 'Utilisateur';
        const actualName = realName || defaultName;
        const creationDate = data.dateCreation || data.createdAt || Date.now();
        const actualPhoto = data.photoURL || data.photoUrl || '';

        fetchedData.push({
          id: docSnap.id,
          ...data,
          nom: actualName,
          displayName: actualName,
          phone: realPhone,
          telephone: realPhone,
          phoneNumber: realPhone,
          photoURL: actualPhoto,
          photoUrl: actualPhoto,
          createdAt: typeof creationDate === 'number' ? creationDate : Date.parse(creationDate) || Date.now(),
          dateCreation: typeof creationDate === 'number' ? creationDate : Date.parse(creationDate) || Date.now(),
        } as UserProfile);
      });

      // Filter out duplicate/fake admin accounts
      const filtered = fetchedData.filter((user) => {
        const email = user.email || '';
        const photo = user.photoURL || user.photoUrl || '';
        const condition1 = email === '0995289355@davidstore.com' || email === 'davidmwana243@gmail.com';
        const condition2 = email === 'davstore4@gmail.com' && photo.trim() === '';
        return !(condition1 || condition2);
      });

      // Sort in-memory by creation date descending
      filtered.sort((a, b) => b.createdAt - a.createdAt);
      
      setCustomers(filtered);
      setIsLoading(false);
    }, (error) => {
      console.error("Customers sync error:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteUser = async (customer: UserProfile) => {
    try {
      setIsDeleting(true);
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        throw new Error("Authentification de l'administrateur requise.");
      }
      
      if (!customer.id) {
        throw new Error("Impossible de supprimer cet utilisateur : identifiant introuvable.");
      }
      
      const res = await fetch(`/api/auth/remove-client/${encodeURIComponent(customer.id)}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const text = await res.text();
      console.log(`[AdminCustomersScreen] Response: ${text.substring(0, 200)}`);

      let data: any = {};
      try {
        if (text) data = JSON.parse(text);
      } catch (e) {
        console.error("JSON parse error:", text);
      }

      if (!res.ok) {
        // If we got HTML (starts with <), it's probably a proxy error
        if (text.trim().startsWith('<')) {
          throw new Error(`Le serveur a renvoyé une erreur de sécurité (403 Forbidden). Veuillez contacter le support.`);
        }
        throw new Error(data.message || `Erreur serveur (${res.status})`);
      }

      if (data.success === false) {
        throw new Error(data.message || "La suppression a échoué.");
      }
      
      showNotification('Succès', 'Client supprimé avec succès', 'success');
      setSelectedUserForDelete(null);
    } catch (err: any) {
      console.error("[AdminCustomersScreen] Erreur de suppression client:", err);
      showNotification('Échec de la suppression', err.message || "Une erreur est survenue.", 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.nom?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.telephone?.includes(searchQuery) ||
    c.phone?.includes(searchQuery) ||
    c.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Clients {customers.length > 0 && <span className="text-lg text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full ml-2">{customers.length}</span>}
          </h2>
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
                            {customer.nom || customer.displayName}
                          </p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                            {customer.telephone || customer.phone || 'Numéro non renseigné'}
                          </p>
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
                        type="button"
                        onClick={() => setSelectedUserForDelete(customer)}
                        className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all inline-flex items-center gap-1.5 border border-red-200 cursor-pointer shadow-xs hover:border-red-300"
                        title="Désinscrire ce client définitivement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {selectedUserForDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setSelectedUserForDelete(null)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />

            {/* Content */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl border border-gray-100 z-10 space-y-5"
            >
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto border border-red-200">
                <ShieldAlert className="w-7 h-7 text-red-600" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Supprimer définitivement ?</h3>
                <p className="text-sm text-gray-500 font-medium leading-relaxed">
                  Êtes-vous sûr de vouloir supprimer définitivement le compte de <strong className="text-gray-900 font-bold">{selectedUserForDelete.nom || selectedUserForDelete.displayName}</strong> ?
                </p>
                <div className="bg-red-50 text-red-950 p-3.5 rounded-xl border border-red-200 text-xs text-left space-y-1.5 font-medium leading-relaxed">
                  <span className="font-extrabold uppercase tracking-widest text-[10px] text-red-800 flex items-center gap-1">
                    ⚠️ Attention : décision irrévocable
                  </span>
                  <p>
                    Cette opération supprimera définitivement le compte dans Firebase Authentication et sa fiche profil client. Ses données historiques d&apos;achats n&apos;auront plus d&apos;identifiant de liaison.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setSelectedUserForDelete(null)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-black uppercase text-[10px] tracking-wider rounded-xl transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => handleDeleteUser(selectedUserForDelete)}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black uppercase text-[10px] tracking-wider rounded-xl transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5 shadow-md shadow-red-200"
                >
                  {isDeleting ? "Suppression..." : "Oui, Supprimer"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

