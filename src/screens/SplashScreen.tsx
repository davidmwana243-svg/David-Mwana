import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export const SplashScreen: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      const hasOnboarded = localStorage.getItem('hasOnboarded');
      if (hasOnboarded) {
        navigate('/home', { replace: true });
      } else {
        navigate('/onboarding', { replace: true });
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="fixed inset-0 z-[100] bg-[#020714] flex flex-col items-center justify-center overflow-hidden max-w-md mx-auto">
      {/* Subtle blue/navy glow behind the centered logo exactly like the photo */}
      <div className="absolute w-[320px] h-[320px] bg-blue-600/15 rounded-full blur-[100px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      
      <div className="relative z-10 flex flex-col items-center w-full px-6">
        <div className="w-full max-w-[320px] sm:max-w-[380px] relative">
          <img 
            src="https://i.postimg.cc/wTq8Z6jv/file-000000004b5071fd846b49064bbc6c90.png" 
            alt="DavidSTORE Logo" 
            className="w-full object-contain relative z-10"
          />
        </div>
      </div>

      {/* Circular loader near the bottom as in the photo */}
      <div className="absolute bottom-24 flex items-center justify-center">
        <div className="w-9 h-9 border-[3px] border-blue-500/15 border-t-blue-400 rounded-full animate-spin" />
      </div>
    </div>
  );
};
