import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { ChevronRight } from 'lucide-react';

const SLIDES = [
  {
    title: "Découvrez des produits uniques",
    description: "Parcourez des millions de produits de vendeurs vérifiés à l'échelle mondiale.",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"
  },
  {
    title: "Paiements sécurisés",
    description: "Vos transactions sont protégées par une sécurité de niveau entreprise.",
    image: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80"
  },
  {
    title: "Livraison rapide",
    description: "Faites-vous livrer vos articles rapidement à votre porte.",
    image: "https://images.unsplash.com/photo-1580674684081-77699a4435b6?w=800&q=80"
  }
];

export const OnboardingScreen: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      localStorage.setItem('hasOnboarded', 'true');
      navigate('/login');
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white relative">
      <div className="flex-1 relative overflow-hidden flex flex-col">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col h-full items-center text-center px-6 pt-12 pb-6"
          >
            <div className="flex-1 flex items-center justify-center w-full">
              <img 
                src={SLIDES[currentSlide].image} 
                alt="Illustration" 
                className="w-full h-64 object-cover rounded-3xl shadow-lg"
              />
            </div>
            
            <div className="mt-8 mb-4 h-32">
              <h2 className="text-2xl font-bold text-gray-900 mb-3">{SLIDES[currentSlide].title}</h2>
              <p className="text-gray-500 leading-relaxed">{SLIDES[currentSlide].description}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="px-6 pb-12 flex items-center justify-between">
        <div className="flex space-x-2">
          {SLIDES.map((_, i) => (
            <div 
              key={i} 
              className={`h-2 rounded-full transition-all duration-300 ${
                i === currentSlide ? 'w-6 bg-orange-500' : 'w-2 bg-gray-200'
              }`}
            />
          ))}
        </div>
        
        <Button onClick={handleNext} className="rounded-full w-14 h-14 p-0 flex items-center justify-center">
          <ChevronRight className="w-6 h-6" />
        </Button>
      </div>
    </div>
  );
};
