import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020714] text-white flex flex-col justify-between p-6">
      <div className="flex-1 flex flex-col items-center justify-center text-center">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-24 h-24 bg-gradient-to-tr from-[#002B7F] to-[#0057FF] rounded-3xl flex items-center justify-center mb-6 shadow-2xl border border-white/10"
        >
          <ShoppingBag className="w-12 h-12 text-white" />
        </motion.div>
        
        <h1 className="text-3xl font-black tracking-tight mb-2">Bienvenue sur DavidSTORE</h1>
        <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
          Votre boutique de confiance en République Démocratique du Congo.
        </p>
      </div>

      <button
        onClick={() => navigate('/home')}
        className="w-full bg-[#CE1126] hover:bg-red-700 text-white font-extrabold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer"
      >
        <span>Découvrir les produits</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default WelcomeScreen;
