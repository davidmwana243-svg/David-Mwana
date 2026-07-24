import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const SplashScreen: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    console.log("SplashScreen: loading =", loading, "user =", user);
    if (loading) return;

    const timer = setTimeout(() => {
      console.log("SplashScreen: Navigating to /home");
      navigate('/home', { replace: true });
    }, 1500);
    return () => clearTimeout(timer);
  }, [user, loading, navigate]);

  return (
    <div className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center overflow-hidden max-w-md mx-auto">
      
      <div className="relative z-10 flex flex-col items-center w-full px-6">
        <div className="w-full max-w-[420px] sm:max-w-[480px] relative">
          <img 
            src="https://i.postimg.cc/1tvrPKYb/file-00000000a4fc7243b5ae1ecdf23ff4f5.png" 
            alt="DavidSTORE Logo" 
            className="w-full object-contain relative z-10"
          />
        </div>
      </div>

      {/* Circular loader near the bottom */}
      <div className="absolute bottom-24 flex items-center justify-center">
        <div className="w-9 h-9 border-[3px] border-gray-100 border-t-blue-600 rounded-full animate-spin" />
      </div>
    </div>
  );
};
