import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { createOrder } from '../services/orderService';
import { Button } from '../components/Button';
import { ArrowLeft } from 'lucide-react';

export const CheckoutScreen: React.FC = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zip, setZip] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user || items.length === 0) {
    return (
      <div className="flex flex-col h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <h2 className="text-xl font-bold">Impossible de passer la commande</h2>
        <p className="text-gray-500 mb-4">Votre panier est vide ou vous n'êtes pas connecté.</p>
        <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const fullAddress = `${address}, ${city} ${zip}`;
      await createOrder(user.uid, items, totalPrice, fullAddress);
      clearCart();
      alert('Commande confirmée avec succès !');
      navigate('/profile');
    } catch (error) {
      console.error(error);
      alert('Une erreur est survenue lors de la commande.');
    }
    
    setIsSubmitting(false);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/cart');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 pb-8 relative">
      <div className="bg-white p-4 shadow-sm flex items-center sticky top-0 z-10">
        <button onClick={handleBack} className="mr-3">
          <ArrowLeft className="w-6 h-6 text-gray-800" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">Paiement</h1>
      </div>

      <div className="flex-1 p-4 overflow-y-auto w-full max-w-md mx-auto">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
          <h2 className="font-bold text-gray-800 mb-3">Détails de la commande</h2>
          {items.map(item => (
            <div key={item.product.id} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0">
              <span className="text-sm text-gray-600 line-clamp-1 flex-1 pr-4">
                {item.quantity}x {item.product.name}
              </span>
              <span className="text-sm font-medium">{(item.product.price * item.quantity).toFixed(2)} FC</span>
            </div>
          ))}
          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
            <span className="font-bold">Total</span>
            <span className="font-bold text-orange-500 text-lg">{totalPrice.toFixed(2)} FC</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 space-y-4">
          <h2 className="font-bold text-gray-800">Adresse de livraison</h2>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Adresse complète</label>
            <input required type="text" value={address} onChange={e=>setAddress(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ville</label>
              <input required type="text" value={city} onChange={e=>setCity(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Code Postal</label>
              <input required type="text" value={zip} onChange={e=>setZip(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-orange-500 focus:border-orange-500 outline-none" />
            </div>
          </div>
          
          <Button isLoading={isSubmitting} type="submit" className="w-full mt-6 py-4 text-lg font-bold rounded-xl shadow-lg shadow-orange-500/40">
            Confirmer et Payer {totalPrice.toFixed(2)} FC
          </Button>
        </form>
      </div>
    </div>
  );
};

