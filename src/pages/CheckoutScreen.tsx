import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder } from '../services/orderService';
import { checkCartStock } from '../services/productService';
import { Button } from '../components/Button';
import { ArrowLeft, Loader2, CheckCircle2, ShieldCheck, Smartphone, MapPin, X, Minus, Plus, Trash2, PackageCheck, AlertTriangle, Edit3, CornerUpLeft } from 'lucide-react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { useNotification } from '../context/NotificationContext';

export const sanitizeDRCPhoneNumber = (phoneStr: string): string => {
  let cleaned = phoneStr.replace(/\s+/g, '').replace(/[-\(\)]/g, '');
  if (cleaned.startsWith('+243')) {
    cleaned = cleaned.substring(4);
  } else if (cleaned.startsWith('243')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  return `+243${cleaned}`;
};

export const CheckoutScreen: React.FC = () => {
  const { items, totalPrice, totalItems, updateQuantity, clearCart } = useCart();
  const { user, profile } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const defaultAddr = profile?.addresses?.find(a => a.isDefault) || profile?.addresses?.[0];

  const [address, setAddress] = useState(defaultAddr?.addressLines || '');
  const [city, setCity] = useState(defaultAddr?.city || '');
  const [zip, setZip] = useState('');
  const [phone, setPhone] = useState(profile?.paymentPhone || profile?.telephone || profile?.phone || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentStep, setPaymentStep] = useState<'form' | 'waiting' | 'success' | 'error'>('form');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);

  // States for inline editing of delivery contact details
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [editAddressLines, setEditAddressLines] = useState(address);
  const [editCity, setEditCity] = useState(city);
  const [editPhone, setEditPhone] = useState(phone);
  const [selectedProvider, setSelectedProvider] = useState<'mpesa' | 'airtel' | 'orange'>('mpesa');

  // Synchronize state when async profile or addresses are loaded or updated in Firebase
  useEffect(() => {
    if (defaultAddr) {
      setAddress(defaultAddr.addressLines || '');
      setCity(defaultAddr.city || '');
      setEditAddressLines(defaultAddr.addressLines || '');
      setEditCity(defaultAddr.city || '');
    }
  }, [defaultAddr]);

  useEffect(() => {
    if (profile) {
      const dbPhone = profile.paymentPhone || profile.telephone || profile.phone || '';
      setPhone(dbPhone);
      setEditPhone(dbPhone);
    }
  }, [profile]);

  const handleSaveContact = async () => {
    if (!editAddressLines.trim() || !editCity.trim() || !editPhone.trim()) {
      showNotification("Erreur", "Veuillez remplir tous les champs obligatoires.", "error");
      return;
    }
    
    // Normalize phone formatting immediately
    const cleanPhone = sanitizeDRCPhoneNumber(editPhone);
    setAddress(editAddressLines);
    setCity(editCity);
    setPhone(cleanPhone);
    setIsEditingContact(false);

    if (user && profile) {
      try {
        const { doc, updateDoc } = await import('firebase/firestore');
        const userRef = doc(db, 'users', user.uid);

        const currentAddresses = profile.addresses || [];
        const updatedAddresses = [...currentAddresses];
        const defaultIdx = updatedAddresses.findIndex(a => a.isDefault);

        const newAddressObj = {
          id: defaultIdx >= 0 ? updatedAddresses[defaultIdx].id : 'addr_default',
          label: defaultIdx >= 0 ? updatedAddresses[defaultIdx].label : 'Adresse par défaut',
          fullName: profile.displayName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Client',
          phone: cleanPhone,
          addressLines: editAddressLines,
          city: editCity,
          country: 'RD Congo',
          isDefault: true
        };

        if (defaultIdx >= 0) {
          updatedAddresses[defaultIdx] = newAddressObj;
        } else {
          updatedAddresses.push(newAddressObj);
        }

        await updateDoc(userRef, {
          paymentPhone: cleanPhone,
          phone: cleanPhone,
          telephone: cleanPhone,
          addresses: updatedAddresses
        });
        showNotification('Profil mis à jour', 'Vos coordonnées de livraison ont été enregistrées avec succès.', 'success');
      } catch (err: any) {
        console.warn("Failed recording contact revisions to profile:", err?.message || err);
      }
    }
  };

  useEffect(() => {
    if (!currentOrderId || paymentStep !== 'waiting') return;

    // Listen for order status changes
    const unsub = onSnapshot(doc(db, 'orders', currentOrderId), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        // The order is only confirmed if the payment is successful (status is 'processing' or paymentStatus is 'paid')
        if ((data.status === 'processing' || data.paymentStatus === 'paid') && paymentStep !== 'success') {
          setPaymentStep('success');
          clearCart();
          showNotification(
            "Paiement Accepté", 
            `DavidSTORE: Votre commande de ${Number(totalPrice + (totalPrice < 50000 ? 3000 : 0) || 0).toLocaleString()} FC a été validée avec succès.`, 
            'success'
          );
          // Auto-redirect after success
          setTimeout(() => {
            navigate('/orders');
          }, 3000);
        } else if (data.status === 'failed' || data.status === 'cancelled') {
          setPaymentStep('error');
          const reason = data.failureReason || 'Le paiement a été refusé ou annulé.';
          setErrorMessage(reason);
          
          if (reason.toLowerCase().includes('solde') || reason.toLowerCase().includes('insuffisant')) {
            showNotification(
              "Échec de Dépôt", 
              `Échec de Dépôt sur le Solde Marchand de ${Number(totalPrice + (totalPrice < 50000 ? 3000 : 0) || 0).toLocaleString()} FC. Solde insuffisant.`, 
              'error'
            );
          } else {
            showNotification("Échec du Paiement", reason, 'error');
          }
        }
      }
    });

    return () => {
      unsub();
    };
  }, [currentOrderId, paymentStep, clearCart, navigate, totalPrice, showNotification]);

  if (!user || (items.length === 0 && paymentStep === 'form')) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <h2 className="text-xl font-bold">Impossible de passer la commande</h2>
        <p className="text-gray-500 mb-4">Votre panier est vide ou vous n'êtes pas connecté.</p>
        <Button onClick={() => navigate('/home')}>Retour à l'accueil</Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    
    try {
      // 0. Stock validation before payment submission
      const stockCheck = await checkCartStock(items);
      if (!stockCheck.valid && stockCheck.outOfStockProduct) {
        setIsSubmitting(false);
        const prod = stockCheck.outOfStockProduct;
        const msg = `Le produit "${prod.name}" n'est plus disponible dans cette quantité (Stock disponible : ${prod.available}).`;
        setErrorMessage(`⚠️ Impossible de continuer\n\n${msg}`);
        setPaymentStep('error');
        showNotification("Rupture de stock", msg, "error");
        return;
      }

      const shippingFee = totalPrice < 50000 ? 3000 : 0;
      const finalTotal = totalPrice + shippingFee;
      const fullAddress = `${address}, ${city} ${zip}`;
      
      // Sanitize phone number before passing to service layer and payment API
      const sanitizedPhone = sanitizeDRCPhoneNumber(phone);

      // 1. Create Order (status will be payment_pending)
      const customerName = profile?.displayName || profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : (user.displayName || 'Client DavidSTORE');
      const newOrder = await createOrder(user.uid, items, finalTotal, fullAddress, customerName, sanitizedPhone, defaultAddr);
      setCurrentOrderId(newOrder.id);
      
      // 2. Initiate Payment
      const token = await user.getIdToken();
      const paymentRes = await fetch('/api/payment', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          amount: finalTotal,
          clientPhoneNumber: sanitizedPhone,
          orderId: newOrder.id
        })
      });
      
      const contentType = paymentRes.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Erreur de connexion avec le serveur de paiement.");
      }
      
      const paymentData = await paymentRes.json();
      
      if (paymentRes.status !== 200) {
         throw new Error(paymentData.error || 'Paiement échoué');
      }
      
      // Move to waiting step
      setPaymentStep('waiting');
      setIsSubmitting(false);
    } catch (error: any) {
      console.error(error);
      const msg = error.message || 'Une erreur est survenue lors de la commande.';
      setErrorMessage(msg);
      setPaymentStep('error');
      setIsSubmitting(false);
      
      // Si l'erreur est liée au solde, on affiche la notification spéciale
      if (msg.toLowerCase().includes('solde') || msg.toLowerCase().includes('insuffisant') || msg.toLowerCase().includes('balance')) {
        showNotification(
          "Solde Insuffisant", 
          `DavidSTORE: Votre solde est insuffisant pour finaliser cet achat de ${Number(totalPrice + (totalPrice < 50000 ? 3000 : 0) || 0).toLocaleString()} FC.`, 
          'error'
        );
      }
    }
  };

  const handleBack = () => {
    if (paymentStep === 'waiting' || paymentStep === 'success') return;
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/cart');
    }
  };

  const handleReset = async () => {
    if (currentOrderId && paymentStep !== 'success') {
      try {
        await updateDoc(doc(db, 'orders', currentOrderId), {
          status: 'cancelled',
          updatedAt: Date.now()
        });
      } catch (err) {
        console.error("Error cancelling order on reset:", err);
      }
    }
    setPaymentStep('form');
    setIsSubmitting(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-8 relative min-h-screen">
      <div className="bg-white p-4 shadow-sm flex items-center sticky top-0 z-30">
        <button onClick={handleBack} className="mr-3 p-1">
          <ArrowLeft className="w-6 h-6 text-gray-800" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">Paiement</h1>
      </div>

      <div className="flex-1 p-4 overflow-y-auto w-full max-w-md mx-auto">
        {/* Order Items & Quantities Specification */}
        <div id="order-summary-section" className="bg-white p-4.5 rounded-2xl shadow-sm border border-gray-100 mb-4">
          <div className="flex items-center justify-between mb-3.5 border-b border-gray-100 pb-3">
            <div>
              <h2 className="font-extrabold text-[#0B3D91] text-base flex items-center gap-2">
                <span>🛒 RÉCAPITULATIF DE VOTRE COMMANDE</span>
              </h2>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                Vérifiez les articles, variantes et quantités avant de valider
              </p>
            </div>
            <span className="text-xs font-black text-[#0B3D91] bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              {totalItems} article{totalItems > 1 ? 's' : ''}
            </span>
          </div>

          <div className="space-y-3 mb-4">
            {items.map((item, index) => (
              <div 
                key={item.product.id + (item.selectedSize || '') + (item.selectedColor || '')} 
                className="bg-gray-50/90 p-3 rounded-xl border border-gray-200/70 flex flex-col gap-2 relative"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="w-12 h-12 rounded-lg bg-white overflow-hidden flex-shrink-0 border border-gray-200 p-0.5">
                    <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-contain" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-gray-900 truncate">📦 Produit {index + 1} : {item.product.name}</p>
                    
                    {/* Display variants if present */}
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap text-[10px] text-gray-600 font-medium">
                      {item.selectedColor && (
                        <span className="bg-gray-200/80 text-gray-800 font-semibold px-1.5 py-0.5 rounded">
                          Couleur : {item.selectedColor}
                        </span>
                      )}
                      {item.selectedSize && (
                        <span className="bg-[#FFC107]/20 text-[#0B3D91] font-bold px-1.5 py-0.5 rounded">
                          Taille : {item.selectedSize}
                        </span>
                      )}
                      {item.product.category && (
                        <span className="bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.5 rounded">
                          {item.product.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center bg-white rounded-lg border border-gray-200 shadow-sm p-1">
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.selectedSize, item.selectedColor)}
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-50 text-gray-700 hover:bg-gray-200 active:scale-90 font-bold transition-all cursor-pointer"
                      title="Diminuer la quantité"
                    >
                      {item.quantity === 1 ? <Trash2 className="w-3 h-3 text-red-500" /> : <Minus className="w-3 h-3" />}
                    </button>
                    <span className="w-8 text-center font-black text-gray-900 text-xs">
                      {item.quantity} pc{item.quantity > 1 ? 's' : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.selectedSize, item.selectedColor)}
                      className="w-6 h-6 flex items-center justify-center rounded-md bg-gray-50 text-gray-700 hover:bg-gray-200 active:scale-90 font-bold transition-all cursor-pointer"
                      title="Augmenter la quantité"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-200/60 text-gray-600 font-medium">
                  <span>Prix unitaire : <strong className="text-gray-900">{Number(item.product.price).toLocaleString()} FC</strong></span>
                  <span>Sous-total : <strong className="text-[#0B3D91] font-extrabold">{Number(item.product.price * item.quantity).toLocaleString()} FC</strong></span>
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#0B3D91]/5 p-3.5 rounded-xl border border-[#0B3D91]/10 space-y-2">
            <h3 className="font-extrabold text-[#0B3D91] text-xs uppercase tracking-wider mb-1">
              💰 RÉSUMÉ DU PAIEMENT
            </h3>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600 font-medium">Produits ({totalItems}) :</span>
              <span className="font-bold text-gray-900">{Number(totalPrice).toLocaleString()} FC</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-gray-600 font-medium">Livraison :</span>
              <span className={`font-bold ${totalPrice < 50000 ? 'text-gray-900' : 'text-emerald-600 font-black'}`}>
                {totalPrice < 50000 ? '3 000 FC' : 'Gratuite (LIVRAISON EXPRESS)'}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2.5 mt-2 border-t border-[#0B3D91]/20">
              <span className="font-black text-sm text-[#0B3D91]">TOTAL À PAYER :</span>
              <span className="font-black text-[#0B3D91] text-xl bg-[#FFC107] px-3 py-0.5 rounded-lg border border-amber-400 shadow-sm">
                {Number(totalPrice + (totalPrice < 50000 ? 3000 : 0)).toLocaleString()} FC
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-4">
          <h2 className="font-bold text-gray-800 mb-4 text-sm flex items-center justify-between">
            <span>Moyen de paiement</span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </h2>
          
          <div className="mb-2">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Mobile Money</p>
            <div className="grid grid-cols-3 gap-3">
              {[
                { 
                  id: 'orange', 
                  name: 'Orange Money', 
                  icon: (
                    <div className="bg-black relative rounded-xl w-full h-full flex flex-col items-center justify-center p-2 shadow-md hover:shadow-lg transition-all border border-gray-800">
                      <div className="w-8 h-8 flex items-center justify-center mb-1">
                        <svg viewBox="0 0 24 24" className="w-7 h-7">
                           <path d="M6,16 L6,6 L16,6 L16,10 L10,10 L10,16 Z" fill="white" />
                           <path d="M18,8 L18,18 L8,18 L8,14 L14,14 L14,8 Z" fill="#FF7900" />
                        </svg>
                      </div>
                      <div className="text-white text-[9px] font-sans font-bold leading-tight tracking-tight text-center">
                        Orange<br/><span className="text-gray-300 font-medium">Money</span>
                      </div>
                    </div>
                  )
                },
                { 
                  id: 'airtel', 
                  name: 'Airtel Money', 
                  icon: (
                    <div className="bg-[#E40000] relative rounded-xl w-full h-full flex flex-col items-center justify-center p-2 shadow-md hover:shadow-lg transition-all border border-red-500">
                      <div className="w-8 h-8 flex items-center justify-center mb-1">
                        <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 14.5 4 16.5 6 18C8 19.5 11 18 11 15C11 12 9 10 7 12" />
                        </svg>
                      </div>
                      <div className="flex flex-col items-center leading-[1]">
                        <span className="text-white text-[11px] font-sans font-extrabold lowercase tracking-wide">airtel</span>
                        <span className="text-[#FFCC00] text-[7px] font-semibold tracking-widest mt-0.5">Money</span>
                      </div>
                    </div>
                  )
                },
                { 
                  id: 'mpesa', 
                  name: 'Vodacom M-Pesa', 
                  icon: (
                    <div className="bg-[#43B02A] relative rounded-xl w-full h-full flex flex-col items-center justify-center p-2 shadow-md hover:shadow-lg transition-all border border-green-600">
                      <div className="w-8 h-8 flex items-center justify-center mb-1">
                        <svg viewBox="0 0 24 24" className="w-7 h-7">
                           <rect x="5" y="3" width="14" height="18" rx="3" fill="white" />
                           <path d="M5 8 L19 8 L19 6 C19 4.34315 17.6569 3 16 3 L8 3 C6.34315 3 5 4.34315 5 6 L5 8 Z" fill="#E4002B" />
                           <rect x="10" y="16" width="4" height="2" rx="1" fill="#43B02A" />
                        </svg>
                      </div>
                      <div className="text-white text-[10px] font-sans font-black tracking-tight mt-0.5">
                        M-Pesa
                      </div>
                    </div>
                  )
                }
              ].map(pay => (
                <div 
                  key={pay.id} 
                  onClick={() => setSelectedProvider(pay.id as 'mpesa' | 'airtel' | 'orange')}
                  className={`flex items-center justify-center rounded-2xl border-2 transition-all cursor-pointer aspect-[1.1] relative overflow-hidden bg-white shadow-sm ${
                    selectedProvider === pay.id 
                    ? 'border-[#0057FF] scale-105 ring-4 ring-[#0057FF]/20 z-10' 
                    : 'border-transparent hover:scale-[1.02]'
                  }`}
                >
                  {pay.icon}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">Livraison & Contact</h2>
              <button 
                type="button"
                onClick={() => {
                  setEditAddressLines(address);
                  setEditCity(city);
                  setEditPhone(phone);
                  setIsEditingContact(!isEditingContact);
                }}
                className="text-xs font-bold text-orange-500 hover:text-orange-600 transition-colors"
                id="edit-delivery-toggle"
              >
                {isEditingContact ? "Annuler" : "Modifier"}
              </button>
            </div>
            
            {isEditingContact ? (
              <div className="space-y-4 border-t border-gray-100 pt-4 animate-in fade-in duration-200">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Adresse de livraison (N°, Avenue, Quartier, Commune)</label>
                  <input
                    type="text"
                    value={editAddressLines}
                    onChange={(e) => setEditAddressLines(e.target.value)}
                    placeholder="Ex: 14 Av. Laurent Désiré Kabila, Q/Golf, C/Lubumbashi"
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-800 font-medium"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Ville</label>
                    <input
                      type="text"
                      value={editCity}
                      onChange={(e) => setEditCity(e.target.value)}
                      placeholder="Ex: Lubumbashi"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-800 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Numéro de paiement</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="Ex: 0821234567"
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all text-gray-800 font-medium"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSaveContact}
                  disabled={!editAddressLines.trim() || !editCity.trim() || !editPhone.trim()}
                  className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
                  id="save-delivery-details"
                >
                  Enregistrer les coordonnées
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center mr-3 shrink-0">
                    <MapPin className="w-4 h-4 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Adresse de livraison</p>
                    <p className="text-sm font-medium text-gray-900 leading-tight">
                      {address ? `${address}, ${city}` : "Non renseignée dans le profil"}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center mr-3 shrink-0">
                    <Smartphone className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Numéro de paiement</p>
                    <p className="text-sm font-medium text-gray-900">
                      {phone ? (phone.startsWith('+243') ? phone : `+243 ${phone}`) : "Non renseigné"}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            <Button 
              disabled={isSubmitting || !address || !phone} 
              type="submit" 
              className="w-full py-4 text-base font-extrabold rounded-2xl shadow-xl bg-[#0B3D91] hover:bg-[#082d6c] text-white relative overflow-hidden group border border-[#FFC107]/30 transition-all cursor-pointer"
            >
              <div className="flex items-center justify-center space-x-2">
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#FFC107]" />
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-[#FFC107]" />
                    <span>✅ Confirmer la commande & Payer</span>
                  </>
                )}
              </div>
            </Button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const el = document.getElementById('order-summary-section');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                <span>✏️ Modifier quantités</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditAddressLines(address);
                  setEditCity(city);
                  setEditPhone(phone);
                  setIsEditingContact(true);
                  const el = document.getElementById('edit-delivery-toggle');
                  if (el) el.scrollIntoView({ behavior: 'smooth' });
                }}
                className="py-2.5 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
              >
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                <span>📍 Modifier l'adresse</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleBack}
              className="w-full py-2 text-xs font-bold text-gray-500 hover:text-red-600 flex items-center justify-center gap-1 transition-colors mt-2"
            >
              <X className="w-3.5 h-3.5" />
              <span>❌ Annuler et retourner au panier</span>
            </button>

            {(!address || !phone) && (
              <p className="text-[10px] text-center text-red-500 font-bold mt-2">
                ⚠️ Veuillez compléter votre adresse et numéro de téléphone pour pouvoir confirmer.
              </p>
            )}
          </form>
        </div>
      </div>

      {/* Payment Modal Overlay */}
      <AnimatePresence>
        {paymentStep !== 'form' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-0"
              onClick={() => paymentStep === 'error' && handleReset()}
              id="payment-modal-backdrop"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-[340px] bg-white rounded-[32px] shadow-2xl p-8 flex flex-col items-center z-10"
              id="payment-modal-content"
            >
              <button 
                onClick={handleReset}
                className="absolute top-6 right-6 p-1 text-gray-300 hover:text-gray-500 transition-colors"
                id="payment-modal-close-button"
              >
                <X className="w-6 h-6" />
              </button>

              <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-8 transition-colors duration-300 ${
                paymentStep === 'success' ? 'bg-emerald-50' : 'bg-blue-50/50'
              }`}>
                {paymentStep === 'success' ? (
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 animate-bounce" />
                ) : (
                  <Smartphone className="w-10 h-10 text-blue-500/80 stroke-[1.5]" />
                )}
              </div>

              <h3 className={`text-xl font-bold mb-3 text-center tracking-tight transition-colors duration-300 ${
                paymentStep === 'success' ? 'text-emerald-600' : 'text-gray-900'
              }`}>
                {paymentStep === 'waiting' && 'Validation Requise'}
                {paymentStep === 'success' && 'Paiement Réussi !'}
                {paymentStep === 'error' && 'Oups !'}
              </h3>
              
              <p className="text-gray-500 text-center text-[14px] leading-relaxed mb-8 px-2 font-medium">
                {paymentStep === 'waiting' && `Veuillez consulter votre téléphone. Entrez votre code PIN pour valider la transaction de ${Number(totalPrice + (totalPrice < 50000 ? 3000 : 0)).toLocaleString()} FC.`}
                {paymentStep === 'success' && "Votre transaction a été approuvée ! Vous allez être redirigé vers vos commandes automatiquement."}
                {paymentStep === 'error' && errorMessage}
              </p>

              {paymentStep === 'waiting' && (
                <div className="w-full bg-blue-50/50 border border-blue-100 rounded-2xl p-4 flex items-center justify-center space-x-3 mb-6">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-blue-600 font-bold text-[13px]">En attente de confirmation...</span>
                </div>
              )}

              {paymentStep === 'success' && (
                <div className="w-full bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-center space-x-2 mb-6">
                  <span className="text-emerald-600 font-black text-[13px] animate-pulse">Redirection automatique...</span>
                </div>
              )}

              {paymentStep === 'success' ? (
                <Button onClick={() => navigate('/orders')} className="w-full py-4 font-bold text-md rounded-2xl">
                  Voir mes commandes
                </Button>
              ) : (
                <div className="w-full space-y-3">
                  <button 
                    onClick={handleReset}
                    className="w-full py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[14px] rounded-2xl transition-all active:scale-[0.98]"
                    id="cancel-payment-button"
                  >
                    Annuler et réessayer
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};


