import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ChevronRight, ShieldCheck, Zap, Star } from 'lucide-react';

const STEPS = [
  {
    title: "Qualité Premium",
    description: "Découvrez une large gamme de produits sélectionnés avec le plus grand soin pour votre satisfaction.",
    icon: Star,
    color: "bg-[#0B3D91]",
    image: "/images/onboarding_premium_products_1781921157345.jpg",
    indicatorColor: "bg-[#FFC107]"
  },
  {
    title: "Livraison Flash",
    description: "Nous traitons vos commandes en un temps record pour une livraison rapide à votre domicile.",
    icon: Zap,
    color: "bg-[#0B3D91]",
    image: "/images/onboarding_delivery_rider_1781908158681.jpg",
    indicatorColor: "bg-[#FFC107]"
  },
  {
    title: "Paiement Sécurisé",
    description: "Vos transactions sont protégées par les protocoles de sécurité les plus avancés du marché.",
    icon: ShieldCheck,
    color: "bg-[#0B3D91]",
    image: "/images/onboarding_security_1781921321897.jpg",
    indicatorColor: "bg-[#0B3D91]"
  }
];

export const OnboardingScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    // Préchargement des images
    STEPS.forEach((step) => {
      const img = new Image();
      img.src = step.image;
    });
  }, []);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      localStorage.setItem('hasOnboarded', 'true');
      navigate('/welcome', { replace: true });
    }
  };

  const current = STEPS[currentStep];

  return (
    <div className="fixed inset-0 z-[90] bg-white flex flex-col overflow-hidden max-w-md mx-auto">
      <div className="flex-1 flex flex-col h-full">
          {/* Image Section */}
          <div className="h-[47%] relative overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.img 
                key={current.image}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                src={current.image} 
                className="w-full h-full object-cover"
                alt={current.title}
              />
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/60" />
            
            <div className="absolute bottom-6 left-6 right-6 flex items-center gap-4">
              <div className={`p-4 ${current.color} rounded-2xl shadow-xl border border-white/10`}>
                <current.icon className="w-8 h-8 text-[#FFC107]" />
              </div>
              <h2 className="text-2xl font-sans font-extrabold text-white tracking-tight">{current.title}</h2>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 p-6 md:p-8 flex flex-col justify-between">
            <div className="flex-1 flex items-center">
              <p className="text-[#0B3D91] text-lg leading-relaxed font-sans font-medium">
                {current.description}
              </p>
            </div>

            <div className="flex flex-col gap-6 mt-4">
              {/* Step Indicators */}
              <div className="flex gap-2">
                {STEPS.map((step, idx) => (
                  <div 
                    key={idx}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === currentStep ? `w-8 ${step.indicatorColor}` : "w-2 bg-gray-200"
                    }`}
                  />
                ))}
              </div>

              {/* Action Button */}
              <button
                onClick={handleNext}
                className="w-full bg-[#0B3D91] text-white py-4 rounded-2xl font-sans font-semibold flex items-center justify-center gap-2 shadow-xl shadow-blue-100 active:scale-95 transition-all"
              >
                {currentStep === STEPS.length - 1 ? "Commencer" : "Suivant"}
                <ChevronRight className="w-5 h-5 text-[#FFC107]" />
              </button>
            </div>
          </div>
      </div>
    </div>
  );
};
