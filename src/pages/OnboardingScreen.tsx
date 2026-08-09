import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Truck, ShoppingBag, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export const OnboardingScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#020714] text-white flex flex-col justify-between p-6">
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="w-20 h-20 bg-blue-600/20 border border-blue-500/30 rounded-3xl flex items-center justify-center text-blue-400"
        >
          <Truck className="w-10 h-10" />
        </motion.div>

        <h2 className="text-2xl font-black">Livraison Rapide & Sécurisée</h2>
        <p className="text-gray-400 text-sm max-w-xs leading-relaxed">
          Commandez vos articles préférés et recevez-les rapidement à Lubumbashi, Kolwezi, Likasi et partout en RDC.
        </p>
      </div>

      <button
        onClick={() => navigate('/home')}
        className="w-full bg-[#0057FF] hover:bg-blue-600 text-white font-extrabold py-4 px-6 rounded-2xl flex items-center justify-center gap-2 shadow-lg active:scale-98 transition-all cursor-pointer"
      >
        <span>Commencer maintenant</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default OnboardingScreen;
