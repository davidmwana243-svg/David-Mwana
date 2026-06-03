import React from 'react';
import { ArrowLeft, MessageCircle, Bot } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const CategoriesScreen: React.FC = () => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10 border-b border-gray-100 flex items-center">
        <button onClick={handleBack} className="mr-3">
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1 text-center pr-8">Centre de Support</h1>
      </div>

      <div className="flex-1 p-2">
        <div className="px-4 py-4 text-xs font-semibold text-gray-400 uppercase tracking-widest">
          Besoin d'aide ?
        </div>
        
        <div 
          onClick={() => navigate('/chat')}
          className="m-2 p-4 bg-white border border-gray-100 rounded-2xl flex items-center gap-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-orange-200 text-white">
            <Bot className="w-7 h-7" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-gray-900 text-sm">Nicole (Assistant DavidSTORE)</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Réponses instantanées 24/7</p>
          </div>
          <div className="px-2.5 py-1 bg-orange-100 text-orange-600 text-[9px] font-black rounded-lg">
            IA
          </div>
        </div>

        <div 
          onClick={() => window.open('https://wa.me/243852849473', '_blank')}
          className="m-2 p-4 bg-white border border-gray-100 rounded-2xl flex items-center gap-4 cursor-pointer hover:shadow-md transition-all active:scale-[0.98]"
        >
          <div className="w-14 h-14 bg-green-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-green-100 text-white">
            <MessageCircle className="w-7 h-7 fill-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-gray-900 text-sm">WhatsApp DavidSTORE</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">Parlez à un conseiller humain</p>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
            <span className="text-[9px] font-bold text-green-600">EN LIGNE</span>
          </div>
        </div>

        <div className="mt-10 px-8 text-center">
          <div className="inline-block p-4 bg-gray-100 rounded-full mb-4">
             <MessageCircle className="w-8 h-8 text-gray-300" />
          </div>
          <h4 className="text-sm font-bold text-gray-800">Aucune notification</h4>
          <p className="text-xs text-gray-400 mt-2 px-4 leading-relaxed">
            Vos messages importants et vos mises à jour de commande apparaîtront ici.
          </p>
        </div>
      </div>
    </div>
  );
};
