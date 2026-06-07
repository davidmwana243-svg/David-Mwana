import React from 'react';
import { motion } from 'motion/react';
import { Wrench, Cpu, CheckCircle2, Sparkles, Code2, Hammer, Activity } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const MaintenanceScreen: React.FC = () => {
  const { maintenanceMessage, maintenanceChangelog } = useAuth();

  return (
    <div className="fixed inset-0 z-[100] bg-[#020714] text-white flex flex-col items-center justify-between overflow-y-auto px-6 py-8 max-w-md mx-auto">
      {/* Glow behind the layout */}
      <div className="absolute w-[280px] h-[280px] bg-orange-500/10 rounded-full blur-[90px] top-[15%] left-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="absolute w-[240px] h-[240px] bg-blue-500/10 rounded-full blur-[90px] bottom-[25%] left-1/2 -translate-x-1/2 pointer-events-none" />

      {/* Header with DavidSTORE logo */}
      <div className="w-full flex flex-col items-center pt-4 z-10 shrink-0">
        <div className="max-w-[150px] relative">
          <img 
            src="https://i.postimg.cc/wTq8Z6jv/file-000000004b5071fd846b49064bbc6c90.png" 
            alt="DavidSTORE Logo" 
            className="w-full object-contain"
          />
        </div>
        <div className="mt-1 flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/20 px-2.5 py-0.5 rounded-full">
          <Activity className="w-3 h-3 text-orange-400 animate-pulse" />
          <span className="text-[9px] font-black uppercase tracking-widest text-orange-400 font-mono">Mise à jour en direct</span>
        </div>
      </div>

      {/* Center content */}
      <div className="w-full flex-1 flex flex-col items-center justify-center py-6 z-10">
        {/* Glowing Animated Icon Container */}
        <motion.div 
          animate={{ 
            scale: [1, 1.05, 1],
            rotate: [0, 5, -5, 0]
          }}
          transition={{ 
            repeat: Infinity,
            duration: 6,
            ease: "easeInOut"
          }}
          className="relative w-20 h-20 rounded-3xl bg-gradient-to-tr from-orange-500/25 to-blue-500/25 border border-orange-500/30 flex items-center justify-center shadow-xl mb-6 group overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-orange-500/10 to-transparent animate-pulse" />
          <Wrench className="w-9 h-9 text-orange-400 drop-shadow-[0_2px_10px_rgba(249,115,22,0.4)]" />
        </motion.div>

        {/* Informative Header */}
        <h2 className="text-xl font-black text-center tracking-tight leading-snug max-w-[280px] uppercase font-sans">
          Application en cours de <span className="text-orange-400">mise à jour</span>
        </h2>
        
        {/* Dynamic description message */}
        <p className="text-xs text-center text-gray-400 font-semibold leading-relaxed mt-3 max-w-[310px]">
          {maintenanceMessage || "Nous apportons de nouvelles améliorations à l'application DavidSTORE régulièrement pour optimiser votre expérience de shopping !"}
        </p>

        {/* ChangeLog Box - Extremely nice visual list of recent modifications */}
        <div className="w-full bg-slate-900/50 backdrop-blur border border-white/5 rounded-[24px] p-5 mt-7 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
          
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-4 h-4 text-orange-400" />
            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 font-mono">
              Journal des modifications (Code de l'App)
            </span>
          </div>

          <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
            {maintenanceChangelog && maintenanceChangelog.length > 0 ? (
              maintenanceChangelog.map((change, index) => (
                <div key={index} className="flex items-start gap-3 text-left">
                  <div className="mt-0.5 shrink-0">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <p className="text-xs text-gray-300 font-medium leading-relaxed">
                    {change}
                  </p>
                </div>
              ))
            ) : (
              <div className="flex items-start gap-3 text-left">
                <div className="mt-0.5 shrink-0">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <p className="text-xs text-gray-300 font-mono leading-relaxed">
                  Optimisations globales du code serveur & base de données.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer support credits */}
      <div className="w-full flex flex-col items-center pt-4 border-t border-white/5 z-10 shrink-0">
        <div className="flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-orange-400" />
          <span className="text-[10px] font-bold text-gray-500 font-mono">DavidSTORE Dev Engine</span>
        </div>
        <p className="text-[9px] text-gray-600 mt-0.5 font-medium">
          Dès que les modifications de l'application seront prêtes, l'accès sera automatiquement rétabli.
        </p>
      </div>
    </div>
  );
};
