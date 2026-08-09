import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, CheckCircle, AlertCircle } from 'lucide-react';

interface NotificationOverlayProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'error' | 'success' | 'info';
}

export const NotificationOverlay: React.FC<NotificationOverlayProps> = ({
  isVisible,
  onClose,
  title,
  message,
  type = 'error'
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-8 h-8 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-500" />;
      default:
        return <ShoppingBag className="w-8 h-8 text-blue-500" />;
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed inset-x-4 top-10 z-[9999] flex justify-center pointer-events-none">
          <motion.div
            initial={{ opacity: 0, y: -100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="w-full max-w-[400px] bg-white/90 backdrop-blur-3xl rounded-[32px] p-4 flex items-start gap-4 shadow-[0_25px_60px_rgba(0,0,0,0.2)] border border-white/50 pointer-events-auto ring-1 ring-black/5"
            onClick={onClose}
          >
            {/* DavidSTORE Identification */}
            <div className="shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg border border-white/20">
              <div className="w-8 h-8 flex items-center justify-center bg-white rounded-xl shadow-inner">
                 {getIcon()}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] font-black text-blue-600 tracking-widest uppercase">
                   DavidSTORE <span className="mx-1 text-gray-300 font-medium normal-case">• Maintenant</span>
                </span>
                <button 
                  onClick={(e) => { e.stopPropagation(); onClose(); }}
                  className="text-gray-400 p-1 hover:bg-gray-100 rounded-full transition-all"
                >
                   <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
                </button>
              </div>
              
              <h4 className="text-[15px] font-black text-gray-900 leading-tight mb-1">
                {title}
              </h4>
              
              <p className="text-[13px] text-gray-600 leading-[1.4] font-bold tracking-tight">
                {message}
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
