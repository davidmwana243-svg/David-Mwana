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
    color: "bg-orange-600",
    image: "/images/onboarding_quality_1780680571061.png"
  },
  {
    title: "Livraison Flash",
    description: "Nous traitons vos commandes en un temps record pour une livraison rapide à votre domicile.",
    icon: Zap,
    color: "bg-green-600",
    image: "/images/onboarding_delivery_1780680586643.png"
  },
  {
    title: "Paiement Sécurisé",
    description: "Vos transactions sont protégées par les protocoles de sécurité les plus avancés du marché.",
    icon: ShieldCheck,
    color: "bg-purple-600",
    image: "/images/onboarding_secure_new_1780681554589.png"
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
      <div className="flex-1 flex flex-col">
          {/* Image Section */}
          <div className="h-[55%] relative overflow-hidden">
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
            
            <div className="absolute bottom-8 left-8 right-8 flex items-center gap-4">
              <div className={`p-4 ${current.color} rounded-2xl shadow-xl`}>
                <current.icon className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tight">{current.title}</h2>
            </div>
          </div>

          {/* Content Section */}
          <div className="flex-1 p-10 flex flex-col justify-between">
            <div>
              <p className="text-gray-500 text-lg leading-relaxed font-medium">
                {current.description}
              </p>
            </div>

            <div className="flex flex-col gap-6">
              {/* Step Indicators */}
              <div className="flex gap-2">
                {STEPS.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      idx === currentStep ? `w-8 ${current.color}` : "w-2 bg-gray-200"
                    }`}
                  />
                ))}
              </div>

              {/* Action Button */}
              <button
                onClick={handleNext}
                className={`w-full ${current.color} text-white py-5 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-100 active:scale-95 transition-all`}
              >
                {currentStep === STEPS.length - 1 ? "Commencer" : "Suivant"}
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
      </div>
    </div>
  );
};
