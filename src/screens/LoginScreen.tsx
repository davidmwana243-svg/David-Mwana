import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { ShoppingBag, ArrowLeft, Phone, Lock, User, Eye, EyeOff, Camera, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export const LoginScreen: React.FC = () => {
  const { user, signInWithPhone, signUpWithPhone } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  // Initial mode from navigation state if available
  const initialMode = (location.state as any)?.mode === 'register' ? 'register' : 'login';
  
  // Mode: 'login' | 'register'
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  
  // Form values
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleBack = () => {
    navigate('/home');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    // Robust normalization
    let cleanPhone = phone.trim().replace(/[\s()-]/g, '');
    
    // Remove + prefix if it exists to clean it further
    if (cleanPhone.startsWith('+')) {
      cleanPhone = cleanPhone.substring(1);
    }
    
    // If it starts with 243, it's already full international
    if (cleanPhone.startsWith('243')) {
      cleanPhone = '+' + cleanPhone;
    } else {
      // If it starts with 0, remove it and add +243
      if (cleanPhone.startsWith('0')) {
        cleanPhone = '+243' + cleanPhone.substring(1);
      } else {
        // Otherwise assume it's just the 9 digits and prepend +243
        cleanPhone = '+243' + cleanPhone;
      }
    }

    if (cleanPhone.length < 12) {
      setErrorMsg("Veuillez saisir un numéro de téléphone valide (9 chiffres).");
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'login') {
        await signInWithPhone(cleanPhone, password);
      } else {
        if (!firstName.trim() || !lastName.trim()) {
          throw new Error("Le nom et le prénom sont obligatoires pour l'inscription.");
        }

        if (!photoFile) {
           throw new Error("Une photo de profil est obligatoire pour créer un compte. Veuillez cliquer sur l'icône caméra.");
        }

        await signUpWithPhone(cleanPhone, password, firstName.trim(), lastName.trim(), photoFile);
      }
      navigate('/', { replace: true });
    } catch (err: any) {
      const isExpectedAuthError = err.code && err.code.startsWith('auth/');
      if (!isExpectedAuthError) {
        console.error("Auth error:", err);
      }
      let friendlyError = "Une erreur est survenue lors de l'authentification.";
      if (
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/invalid-login-credentials' ||
        err.code === 'auth/invalid-credential'
      ) {
        friendlyError = "Numéro de téléphone ou mot de passe incorrect.";
      } else if (err.code === 'auth/email-already-in-use') {
        friendlyError = "Ce numéro de téléphone est déjà utilisé. Veuillez vous connecter au lieu de vous inscrire.";
      } else if (err.code === 'auth/network-request-failed') {
        friendlyError = "Erreur de connexion internet. Vérifiez votre connexion et réessayez.";
      } else if (err.code === 'auth/invalid-email') {
        friendlyError = "Les informations fournies ne conviennent pas.";
      } else if (err.code === 'auth/weak-password') {
        friendlyError = "Le mot de passe doit contenir au moins 6 caractères.";
      } else if (err.message) {
        friendlyError = err.message;
      }
      setErrorMsg(friendlyError);
      // Use notification as well for better visibility
      showNotification("Authentification", friendlyError, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen max-w-md mx-auto bg-white relative pb-12">
      {/* Header with back button */}
      <div className="absolute top-0 left-0 w-full p-4 z-10 flex items-center justify-between">
        <button onClick={handleBack} className="w-10 h-10 flex items-center justify-center text-gray-800 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
      </div>

      <div className="flex-1 px-6 pt-16 flex flex-col justify-center">
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-20 h-20 bg-orange-50 rounded-2xl flex items-center justify-center mb-6"
          >
            <ShoppingBag className="w-10 h-10 text-orange-500" />
          </motion.div>
          
          <h1 className="text-2xl font-black text-gray-950 tracking-tight">
            {mode === 'login' ? 'Connexion' : 'Créer un compte'}
          </h1>
          <p className="text-gray-500 text-sm mt-1 mb-6">
            {mode === 'login' 
              ? 'Connectez-vous pour continuer sur DavidSTORE' 
              : 'Rejoignez-nous pour commander et suivre vos articles'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-xl mb-6">
          <button 
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(null); }}
            className={`py-2 text-sm font-bold text-center rounded-lg transition-all ${mode === 'login' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
          >
            Se connecter
          </button>
          <button 
            type="button"
            onClick={() => { setMode('register'); setErrorMsg(null); }}
            className={`py-2 text-sm font-bold text-center rounded-lg transition-all ${mode === 'register' ? 'bg-white text-gray-950 shadow-xs' : 'text-gray-500 hover:text-gray-900'}`}
          >
            S'inscrire
          </button>
        </div>

        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 bg-red-50 text-red-700 rounded-xl text-xs font-semibold mb-6 border border-red-100"
          >
            {errorMsg}
          </motion.div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <AnimatePresence mode="popLayout">
            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center mb-4"
              >
                <div className="relative group">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-24 h-24 rounded-full border-4 border-white shadow-md overflow-hidden bg-gray-100 flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 ${photoPreview ? '' : 'border-dashed border-gray-300'}`}
                  >
                    {photoPreview ? (
                      <img src={photoPreview} alt="Profile preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-gray-400">
                        <Camera className="w-8 h-8 mb-1" />
                        <span className="text-[10px] font-bold uppercase">Ajouter</span>
                      </div>
                    )}
                  </div>
                  
                  {photoPreview && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPhotoFile(null);
                        setPhotoPreview(null);
                      }}
                      className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPhotoFile(file);
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setPhotoPreview(reader.result as string);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-2 tracking-widest">Photo de profil requise</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="popLayout">
            {mode === 'register' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-900 uppercase tracking-wider">Nom</label>
                    <div className="relative">
                      <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        required={mode === 'register'}
                        placeholder="Ex: Mwana"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 rounded-xl text-sm transition-all text-gray-900 outline-hidden font-medium"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-gray-900 uppercase tracking-wider">Prénom</label>
                    <div className="relative">
                      <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        required={mode === 'register'}
                        placeholder="Ex: David"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 rounded-xl text-sm transition-all text-gray-900 outline-hidden font-medium"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-900 uppercase tracking-wider">Numéro de téléphone</label>
            <div className="relative flex items-stretch">
              <div className="flex items-center px-3.5 bg-gray-100 border border-r-0 border-gray-100 rounded-l-xl text-sm font-bold text-gray-500">
                +243
              </div>
              <input
                type="tel"
                required
                placeholder="995289355"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full pr-4 py-3 bg-gray-50 border border-gray-100 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 rounded-r-xl text-sm transition-all text-gray-900 outline-hidden font-medium"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black text-gray-900 uppercase tracking-wider">Mot de passe</label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-100 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 rounded-xl text-sm transition-all text-gray-900 outline-hidden font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {mode === 'login' && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const message = `Bonjour DavidSTORE, j'ai oublié mon mot de passe pour mon compte (${phone ? '+243' + phone : 'mon numéro'}). Pouvez-vous m'aider à le récupérer ?`;
                    window.open(`https://wa.me/243995289355?text=${encodeURIComponent(message)}`, '_blank');
                  }}
                  className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider"
                >
                  Mot de passe oublié ?
                </button>
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            isLoading={isLoading} 
            size="lg" 
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-orange-100 transition-all mt-4"
          >
            {mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
          </Button>
        </form>

        <p className="mt-8 text-center text-[11px] text-gray-400 max-w-xs mx-auto leading-relaxed">
          En continuant, vous acceptez nos Conditions d'utilisation et notre Politique de confidentialité.
        </p>
      </div>
    </div>
  );
};
