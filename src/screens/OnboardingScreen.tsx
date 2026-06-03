import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ChevronRight, ShieldCheck, Zap, Star } from 'lucide-react';

const STEPS = [
  {
    title: "Qualité Premium",
    description: "Découvrez une large gamme de produits sélectionnés avec le plus grand soin pour votre satisfaction.",
    icon: Star,
    color: "bg-blue-600",
    image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Livraison Flash",
    description: "Nous traitons vos commandes en un temps record pour une livraison rapide à votre domicile.",
    icon: Zap,
    color: "bg-orange-600",
    image: "https://images.unsplash.com/photo-1566576721346-d4a3b4eaad5b?q=80&w=800&auto=format&fit=crop"
  },
  {
    title: "Paiement Sécurisé",
    description: "Vos transactions sont protégées par les protocoles de sécurité les plus avancés du marché.",
    icon: ShieldCheck,
    color: "bg-green-600",
    image: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?q=80&w=800&auto=format&fit=crop"
  }
];

export const OnboardingScreen: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

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
            <img 
              src={current.image} 
              className="w-full h-full object-cover"
              alt={current.title}
            />
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
