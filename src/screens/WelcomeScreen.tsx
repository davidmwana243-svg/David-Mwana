import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';

export const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[85] bg-white flex flex-col items-center overflow-hidden max-w-md mx-auto">
      {/* Background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white via-white to-blue-50/20" />
      
      {/* Visual Header */}
      <div className="relative w-full h-[55vh] flex items-center justify-center pt-8">
        <div className="relative">
          <div className="w-[320px] h-[320px] bg-white rounded-[56px] p-6 flex items-center justify-center border border-gray-100 shadow-xl relative z-10 overflow-hidden">
            {/* Soft inner glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-blue-50/30 to-transparent rounded-[56px] pointer-events-none" />
            <img 
              src="https://i.postimg.cc/1tvrPKYb/file-00000000a4fc7243b5ae1ecdf23ff4f5.png" 
              alt="DavidSTORE Premium" 
              className="w-full h-full object-contain scale-[1.1]"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white w-full rounded-t-[40px] relative z-20 flex flex-col px-8 py-10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] justify-between">
        <div className="flex-1">
          <h2 className="text-[40px] font-black text-[#0B1527] leading-[1.1] mb-5 tracking-tight font-sans">
            Le shopping<br />
            intelligent<br />
            <span className="text-[#2563EB]">commence ici.</span>
          </h2>
          <p className="text-gray-500 font-medium leading-[1.6] text-[15px] pr-4">
            Rejoignez DavidSTORE et recevez aux meilleures offres sur des milliers de produits.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 mt-8">
          <button
            onClick={() => {
              navigate('/login', { replace: true, state: { mode: 'login' } });
            }}
            className="w-full bg-[#1A1A1D] text-white py-4 rounded-[20px] font-bold text-[17px] flex items-center justify-between px-6 hover:bg-black transition-all active:scale-[0.98]"
          >
            Se connecter
            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center">
              <ArrowRight className="w-5 h-5 text-white" />
            </div>
          </button>
          
          <button
            onClick={() => {
              navigate('/login', { replace: true, state: { mode: 'register' } });
            }}
            className="w-full bg-white border border-gray-200 text-[#0B1527] py-4 rounded-[20px] font-bold text-[17px] flex items-center justify-between px-6 hover:bg-gray-50 transition-all active:scale-[0.98]"
          >
            S'inscrire
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-5 h-5 text-[#0B1527]" />
            </div>
          </button>
          
          <button 
            onClick={() => navigate('/home', { replace: true })}
            className="text-center text-[#8B95A5] font-bold text-[15px] mt-4 py-2 hover:text-gray-600 transition-colors"
          >
            Continuer en tant qu'invité
          </button>
        </div>
      </div>
    </div>
  );
};
