import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { ShoppingBag, ArrowLeft, Phone, Lock, User, Eye, EyeOff, Camera, X, Mail, ShieldAlert, CheckCircle2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface LoginScreenProps {
  initialMode?: 'login' | 'register' | 'forgot';
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ initialMode: propInitialMode }) => {
  const { user, signInWithPhone, signUpWithPhone, sendPasswordReset } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  // Initial mode from prop, navigation state, or path
  const initialMode = propInitialMode || (location.state as any)?.mode || (location.pathname.includes('/register') ? 'register' : 'login');
  
  // Mode: 'login' | 'register' | 'forgot'
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>(initialMode);
  
  // Sync mode with location changes or prop changes
  useEffect(() => {
    if (propInitialMode) {
      setMode(propInitialMode);
      return;
    }

    if (location.pathname.includes('/register')) {
      setMode('register');
    } else if (location.pathname.includes('/login')) {
      setMode('login');
    }
  }, [location.pathname, propInitialMode]);
  
  // Form values
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [diagnostics, setDiagnostics] = useState<{ code: string; message: string; recommendation: string } | null>(null);
  const [resetSuccessMsg, setResetSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user && !location.pathname.includes('/register') && !location.pathname.includes('/login')) {
      navigate('/profile', { replace: true });
    }
  }, [user, navigate, location.pathname]);

  const handleBack = () => {
    navigate('/home');
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    if (mode === 'forgot') {
      const input = resetEmail.trim();
      setDiagnostics(null);
      setResetSuccessMsg(null);
      
      if (!input) {
        setErrorMsg("Veuillez saisir votre adresse email ou votre numéro de téléphone.");
        setIsLoading(false);
        return;
      }

      // Check if the input is a phone number
      const isPhoneInput = /^[+0-9\s()-]+$/.test(input) && input.replace(/\D/g, '').length >= 6;
      let emailToReset = input;

      if (isPhoneInput) {
        console.log("[DIAGNOSTIC] Phone number detected for password recovery:", input);
        // Normalize phone number to search Firestore
        let cleanInput = input.replace(/[\s+()-]/g, '');
        if (cleanInput.startsWith('0')) {
          cleanInput = cleanInput.substring(1);
        }
        if (cleanInput.startsWith('243')) {
          cleanInput = cleanInput.substring(3);
        }
        
        const variations = [
          cleanInput,
          '0' + cleanInput,
          '+243' + cleanInput,
          '243' + cleanInput
        ];

        try {
          console.log("[DIAGNOSTIC] Searching Firestore for user with phone variation:", variations);
          let foundUserDoc: any = null;
          
          for (const val of variations) {
            const queryFields = ['phone', 'telephone', 'phoneNumber'];
            for (const field of queryFields) {
              const q = query(collection(db, 'users'), where(field, '==', val));
              const snap = await getDocs(q);
              if (!snap.empty) {
                foundUserDoc = snap.docs[0].data();
                break;
              }
            }
            if (foundUserDoc) break;
          }

          if (!foundUserDoc) {
            const msg = "Aucun utilisateur trouvé avec ce numéro de téléphone.";
            setErrorMsg(msg);
            setDiagnostics({
              code: "auth/user-not-found-by-phone",
              message: "Le numéro de téléphone n'est associé à aucun profil enregistré.",
              recommendation: "Vérifiez que vous avez saisi le bon numéro (9 chiffres) ou inscrivez-vous avec un nouveau profil."
            });
            setIsLoading(false);
            return;
          }

          console.log("[DIAGNOSTIC] User found by phone:", foundUserDoc.displayName, "Email:", foundUserDoc.email);
          emailToReset = foundUserDoc.email || '';
          
        } catch (dbErr: any) {
          console.error("[DIAGNOSTIC] Firestore lookup error:", dbErr);
          setErrorMsg("Erreur lors de la recherche du compte associé.");
          setIsLoading(false);
          return;
        }
      }

      // Detect virtual email address that cannot receive mail
      if (emailToReset.toLowerCase().endsWith('@davidstore.com')) {
        setErrorMsg("Compte virtuel détecté.");
        setDiagnostics({
          code: "auth/virtual-email-not-supported",
          message: `L'adresse associée à votre compte (${emailToReset}) est une boîte virtuelle créée automatiquement pour la connexion simplifiée par numéro de téléphone.`,
          recommendation: "Comme il s'agit d'une adresse virtuelle, elle ne possède pas de boîte aux lettres réelle et ne peut pas recevoir d'e-mails de réinitialisation. Veuillez vous connecter directement à l'aide de votre mot de passe habituel, ou contactez l'administrateur davidmwana243@gmail.com pour configurer une adresse email valide ou réinitialiser le mot de passe."
        });
        setIsLoading(false);
        return;
      }

      try {
        console.log("[DIAGNOSTIC] Initiating sendPasswordResetEmail in Firebase Auth for:", emailToReset);
        await sendPasswordReset(emailToReset);
        
        let successMsg = "Un email de réinitialisation vous a été envoyé. Veuillez vérifier votre boîte de réception !";
        if (isPhoneInput) {
          // Obfuscate email for privacy
          const parts = emailToReset.split('@');
          const local = parts[0];
          const domain = parts[1];
          const obfuscatedLocal = local.length > 3 ? local.substring(0, 3) + '***' : '***';
          successMsg = `Compte trouvé ! Un email de réinitialisation de mot de passe a été envoyé à l'adresse e-mail associée à votre numéro : ${obfuscatedLocal}@${domain}.`;
        }
        
        setResetSuccessMsg(successMsg);
        showNotification("Mot de passe", successMsg, "success");
        // Clear inputs
        setResetEmail('');
      } catch (err: any) {
        console.error("[DIAGNOSTIC EXPLICIT ERROR] Password reset request failed.", {
          code: err?.code,
          message: err?.message,
          email: emailToReset,
          firebaseConfig: {
            projectId: db?.app?.options?.projectId,
            authDomain: db?.app?.options?.authDomain,
            hasApiKey: !!db?.app?.options?.apiKey
          }
        });

        let friendlyError = "Impossible d'envoyer l'email de réinitialisation. Veuillez vérifier que l'adresse saisie est correcte.";
        let code = err?.code || "auth/unknown-error";
        let message = err?.message || "Une erreur inconnue est survenue.";
        let recommendation = "Veuillez contacter le support ou réessayer ultérieurement.";

        if (err?.code === 'auth/user-not-found') {
          friendlyError = "Aucun utilisateur trouvé avec cette adresse email.";
          recommendation = "Cette adresse email n'est reliée à aucun compte. Si vous vous êtes inscrit avec votre numéro, saisissez plutôt votre numéro de téléphone.";
        } else if (err?.code === 'auth/invalid-email') {
          friendlyError = "L'adresse email saisie est invalide. Veuillez réessayer.";
          recommendation = "L'adresse e-mail saisie ne correspond pas au format attendu (ex: nom@domaine.com).";
        } else if (err?.code === 'auth/operation-not-allowed') {
          friendlyError = "L'envoi d'emails est désactivé.";
          recommendation = "Le fournisseur 'Adresse e-mail/Mot de passe' (Email/Password) n'est pas activé dans votre console Firebase. Veuillez vous rendre sur console.firebase.google.com, ouvrir l'onglet 'Authentication' > 'Sign-in method' et activer 'Email/Password'.";
        } else if (err?.code === 'auth/too-many-requests') {
          friendlyError = "Trop de tentatives ! L'accès à ce service a été temporairement suspendu.";
          recommendation = "Afin de protéger la plateforme, Firebase bloque temporairement les requêtes répétées. Veuillez patienter quelques minutes.";
        } else if (err?.code === 'auth/network-request-failed') {
          friendlyError = "Erreur de connexion internet. Impossible de contacter le serveur.";
          recommendation = "Veuillez vous assurer que vous êtes bien connecté à Internet et que les domaines de Firebase (*.firebaseapp.com) ne sont pas bloqués.";
        }

        setErrorMsg(friendlyError);
        setDiagnostics({
          code,
          message,
          recommendation
        });
        showNotification("Réinitialisation", friendlyError, "error");
      } finally {
        setIsLoading(false);
      }
      return;
    }

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
        if (!fullName.trim()) {
          throw new Error("Le nom complet est obligatoire pour l'inscription.");
        }

        if (!email.trim()) {
          throw new Error("L'adresse email est obligatoire pour l'inscription.");
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email.trim())) {
          throw new Error("Veuillez saisir une adresse email valide.");
        }

        if (password !== confirmPassword) {
          throw new Error("Les mots de passe saisis ne sont pas identiques.");
        }

        if (password.length < 6) {
          throw new Error("Le mot de passe doit contenir au moins 6 caractères.");
        }

        if (!photoFile) {
           throw new Error("Une photo de profil est obligatoire pour créer un compte. Veuillez cliquer sur l'icône caméra.");
        }

        await signUpWithPhone(cleanPhone, email.trim(), password, fullName.trim(), photoFile);
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
        friendlyError = "Cette adresse email est déjà associée à un compte DavidSTORE.";
      } else if (err.code === 'auth/phone-already-in-use') {
        friendlyError = "Ce numéro de téléphone est déjà associé à un compte DavidSTORE.";
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
            {mode === 'login' ? 'Connexion' : mode === 'register' ? 'Créer un compte' : 'Réinitialisation'}
          </h1>
          <p className="text-gray-500 text-sm mt-1 mb-6">
            {mode === 'login' 
              ? 'Connectez-vous pour continuer sur DavidSTORE' 
              : mode === 'register'
              ? 'Rejoignez-nous pour commander et suivre vos articles'
              : 'Saisissez votre adresse email pour recevoir un lien de réinitialisation'}
          </p>
        </div>

        {/* Tab Switcher */}
        {mode !== 'forgot' && (
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
        )}

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
                {/* Nom complet */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-900 uppercase tracking-wider">Nom complet</label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      required={mode === 'register'}
                      placeholder="Ex: David Mwana"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 rounded-xl text-sm transition-all text-gray-900 outline-hidden font-medium"
                    />
                  </div>
                </div>

                {/* Adresse email */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-900 uppercase tracking-wider">Adresse email</label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      required={mode === 'register'}
                      placeholder="Ex: exemple@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 rounded-xl text-sm transition-all text-gray-900 outline-hidden font-medium"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {mode !== 'forgot' ? (
            <>
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
                        setMode('forgot');
                        setErrorMsg(null);
                      }}
                      className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider focus:outline-hidden"
                    >
                      Mot de passe oublié ?
                    </button>
                  </div>
                )}
                
                <AnimatePresence mode="popLayout">
                  {mode === 'register' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-1.5 pt-2"
                    >
                      <label className="text-xs font-black text-gray-900 uppercase tracking-wider">Confirmer le mot de passe</label>
                      <div className="relative">
                        <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required={mode === 'register'}
                          placeholder="••••••••"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full pl-11 pr-12 py-3 bg-gray-50 border border-gray-100 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 rounded-xl text-sm transition-all text-gray-900 outline-hidden font-medium"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.55">
                <label className="text-xs font-black text-gray-900 uppercase tracking-wider">Email ou Numéro de téléphone</label>
                <div className="relative">
                  <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: client@gmail.com ou 0995289355"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-100 focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500 rounded-xl text-sm transition-all text-gray-900 outline-hidden font-medium"
                  />
                </div>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-1 tracking-wider">
                  Saisissez votre email OU votre numéro de téléphone (sans +243 ni de 0 si vous préférez).
                </p>
              </div>

              {resetSuccessMsg && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs space-y-2 font-medium"
                >
                  <div className="flex items-center space-x-2 text-emerald-950 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                    <span>Lien Envoyé !</span>
                  </div>
                  <p>{resetSuccessMsg}</p>
                </motion.div>
              )}

              {diagnostics && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs space-y-3"
                >
                  <div className="flex items-center space-x-2 text-amber-950 font-black uppercase tracking-wide">
                    <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
                    <span>Rapport de Diagnostic Firebase</span>
                  </div>
                  
                  <div className="space-y-1 bg-white p-2.5 rounded-lg border border-amber-100 font-mono text-[10px] text-gray-600">
                    <div><span className="font-bold text-amber-800">CODE :</span> {diagnostics.code}</div>
                    <div className="line-clamp-2"><span className="font-bold text-amber-800">MESSAGE :</span> {diagnostics.message}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="font-bold text-amber-900 flex items-center space-x-1">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-700" />
                      <span>Recommandation Corrective :</span>
                    </div>
                    <p className="text-gray-700 font-medium leading-relaxed leading-sans">
                      {diagnostics.recommendation}
                    </p>
                  </div>
                </motion.div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setDiagnostics(null);
                    setResetSuccessMsg(null);
                  }}
                  className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-wider focus:outline-hidden"
                >
                  Retour à la connexion
                </button>
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            isLoading={isLoading} 
            size="lg" 
            className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 active:scale-[0.99] text-white font-bold rounded-xl shadow-lg shadow-orange-100 transition-all mt-4"
          >
            {mode === 'login' ? 'Se connecter' : mode === 'register' ? 'Créer mon compte' : 'Envoyer le lien'}
          </Button>
        </form>

        <p className="mt-8 text-center text-[11px] text-gray-400 max-w-xs mx-auto leading-relaxed">
          En continuant, vous acceptez nos Conditions d'utilisation et notre Politique de confidentialité.
        </p>
      </div>
    </div>
  );
};
