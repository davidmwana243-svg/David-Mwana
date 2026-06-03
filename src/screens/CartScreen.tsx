import React from 'react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { Minus, Plus, Trash2, ArrowLeft, ShoppingCart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';

export const CartScreen: React.FC = () => {
  const { items, updateQuantity, removeFromCart, totalPrice, totalItems } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  const handleCheckout = () => {
    if (!user) {
      navigate('/login');
    } else {
      navigate('/checkout'); // placeholder
    }
  };

  if (items.length === 0) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <ShoppingCart className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Votre panier est vide</h2>
        <p className="text-gray-500 mb-8">On dirait que vous n'avez encore rien ajouté.</p>
        <Button onClick={() => navigate('/home')} className="w-full">Commencer les achats</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white p-4 shadow-sm flex items-center sticky top-0 z-10">
        <button onClick={handleBack} className="mr-3">
          <ArrowLeft className="w-6 h-6 text-gray-800" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1 text-center pr-9">Panier ({totalItems})</h1>
      </div>

      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {items.map((item) => (
          <div key={item.product.id} className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 flex space-x-3">
            <div className="w-24 h-24 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
              <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-tight">
                  {item.product.name}
                </h3>
                <p className="text-xs text-gray-500 mt-1">{item.product.category}</p>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-orange-500 font-bold">{Number(item.product.price || 0).toLocaleString()} FC</span>
                <div className="flex items-center bg-gray-100 rounded-lg">
                  <button onClick={() => updateQuantity(item.product.id, item.quantity - 1)} className="p-1.5 text-gray-600">
                    {item.quantity === 1 ? <Trash2 className="w-4 h-4 text-red-500" /> : <Minus className="w-4 h-4" />}
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.product.id, item.quantity + 1)} className="p-1.5 text-gray-600">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white border-t border-gray-100 px-5 pt-5 pb-6 sticky bottom-0 z-20 shadow-[0_-8px_20px_rgba(0,0,0,0.06)] rounded-t-2xl">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-600 font-medium">Sélection totale</span>
          <div className="flex flex-col items-end">
            <span className="text-2xl font-bold text-orange-500">{Number(totalPrice || 0).toLocaleString()} FC</span>
            {totalPrice >= 50000 ? (
              <span className="text-xs text-green-600 font-medium mt-0.5">Livraison gratuite offerte</span>
            ) : (
              <span className="text-xs text-blue-600 font-medium mt-0.5">Livraison 3000 FC applicable</span>
            )}
          </div>
        </div>
        <Button onClick={handleCheckout} className="w-full py-4 text-lg font-bold rounded-xl shadow-lg shadow-orange-500/40">
          Passer la commande ({totalItems})
        </Button>
      </div>
    </div>
  );
};
