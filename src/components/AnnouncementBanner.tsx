import React, { useEffect, useState } from 'react';
import { ShieldCheck, Truck, Award, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const ANNOUNCEMENTS = [
  {
    text: "Paiement rapide et sécurisé",
    icon: ShieldCheck,
    color: "text-orange-500"
  },
  {
    text: "Profitez de la livraison gratuite à partir de 50000fc.",
    icon: Truck,
    color: "text-emerald-500"
  },
  {
    text: "Articles de bonne qualité et durables",
    icon: Award,
    color: "text-blue-500"
  },
  {
    text: "Commandez et réservez vos colis rapidement",
    icon: Zap,
    color: "text-amber-500"
  }
];

export const AnnouncementBanner: React.FC = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % ANNOUNCEMENTS.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const current = ANNOUNCEMENTS[index];
  const Icon = current.icon;

  return (
    <div className="w-full bg-white border-b border-gray-100 py-3 px-4 relative z-10 overflow-hidden select-none">
      <div className="max-w-md mx-auto flex items-center justify-center relative min-h-[20px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ type: "spring", stiffness: 140, damping: 18 }}
            className="flex items-center justify-center gap-2 text-center text-xs font-semibold leading-normal tracking-wide"
          >
            <Icon className={`w-4 h-4 ${current.color} flex-shrink-0 animate-pulse`} strokeWidth={2.5} />
            <span className="text-gray-800 font-bold">{current.text}</span>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
