import React from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';

export const WelcomeScreen: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[85] bg-[#0f1115] flex flex-col items-center overflow-hidden max-w-md mx-auto">
      {/* Background with subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/40 via-transparent to-orange-500/10" />
      
      {/* Visual Header */}
      <div className="relative w-full h-[50vh] flex items-center justify-center pt-10">
        <div className="relative">
          <div className="w-72 h-72 bg-blue-600/30 rounded-full blur-[90px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          <div className="w-64 h-64 relative z-10 bg-white/10 backdrop-blur-xl rounded-[48px] p-8 flex items-center justify-center border border-white/20 shadow-xl">
            <img 
              src="https://i.postimg.cc/wTq8Z6jv/file-000000004b5071fd846b49064bbc6c90.png" 
              alt="DavidSTORE Premium" 
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-white w-full rounded-t-[40px] relative z-20 flex flex-col p-10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)]">
        <div className="flex-1">
          <h2 className="text-4xl font-black text-gray-900 leading-[1.1] mb-4 tracking-tight">
            Le shopping intelligent <br />
            <span className="text-blue-600">commence ici.</span>
          </h2>
          <p className="text-gray-500 font-medium leading-relaxed">
            Rejoignez DavidSTORE et accédez aux meilleures offres sur des milliers de produits.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => {
              navigate('/login', { replace: true, state: { mode: 'login' } });
            }}
            className="w-full bg-[#1a1c21] text-white py-5 rounded-2xl font-bold text-lg flex items-center justify-between px-8 hover:bg-black transition-all active:scale-[0.98]"
          >
            Se connecter
            <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
              <ArrowRight className="w-4 h-4 text-white" />
            </div>
          </button>
          
          <button
            onClick={() => {
              navigate('/login', { replace: true, state: { mode: 'register' } });
            }}
            className="w-full bg-white border-2 border-gray-100 text-gray-900 py-5 rounded-2xl font-bold text-lg flex items-center justify-between px-8 hover:bg-gray-50 transition-all active:scale-[0.98]"
          >
            S'inscrire
            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-gray-900" />
            </div>
          </button>
          
          <button 
            onClick={() => navigate('/home', { replace: true })}
            className="text-center text-gray-400 font-bold text-sm mt-2 py-2"
          >
            Continuer en tant qu'invité
          </button>
        </div>
      </div>
    </div>
  );
};
