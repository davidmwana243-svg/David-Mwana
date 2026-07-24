import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { 
  Package, 
  Heart, 
  Settings, 
  MapPin, 
  ChevronRight, 
  LogOut, 
  User as UserIcon, 
  Share2, 
  MessageSquare, 
  Bot, 
  CreditCard, 
  Camera, 
  X, 
  Mail, 
  Bell, 
  Phone, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  MessageCircle, 
  UserCheck2 
} from 'lucide-react';
import { Button } from '../components/Button';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, setDoc, doc } from 'firebase/firestore';
import { Order } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const ProfileScreen: React.FC = () => {
  const { user, profile, logout, isAdmin, updateProfile, mergeAccounts, loading: authLoading } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isFetchingOrders, setIsFetchingOrders] = useState(false);
  const [paymentExpanded, setPaymentExpanded] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [paymentNumber, setPaymentNumber] = useState('');
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const [showMergeConfirm, setShowMergeConfirm] = useState(false);
  const [mergeTargetEmail, setMergeTargetEmail] = useState('');
  const [mergeTargetUid, setMergeTargetUid] = useState('');
  const [isMerging, setIsMerging] = useState(false);
  const [isOverwriting, setIsOverwriting] = useState(false);

  const handleConfirmMerge = async () => {
    setIsMerging(true);
    try {
      await mergeAccounts(mergeTargetEmail, mergeTargetUid);
      showNotification('Comptes fusionnés', 'Vos comptes ont été fusionnés avec succès ! Veuillez vous reconnecter en utilisant Google ou votre e-mail pour accéder à votre profil unifié.', 'success');
      setShowMergeConfirm(false);
    } catch (e: any) {
      showNotification('Échec de la fusion', e?.message || 'Une erreur est survenue lors de la fusion des comptes.', 'error');
    } finally {
      setIsMerging(false);
    }
  };

  const handleForceOverwriteEmail = async () => {
    setIsOverwriting(true);
    try {
      const updatedFields: any = {};
      if (editFirstName.trim()) {
        updatedFields.firstName = editFirstName.trim();
      }
      if (editLastName.trim()) {
        updatedFields.lastName = editLastName.trim();
      }
      const newDisplayName = `${editFirstName.trim()} ${editLastName.trim()}`.trim();
      if (newDisplayName) {
        updatedFields.displayName = newDisplayName;
      }
      updatedFields.email = editEmail.trim().toLowerCase();
      updatedFields.phone = editPhone.trim();

      await updateProfile(updatedFields, selectedPhotoFile || undefined, true, true);
      showNotification('Profil Lié', 'Votre adresse email a été enregistrée directement sur ce compte !', 'success');
      setShowMergeConfirm(false);
      setIsEditingProfile(false);
    } catch (e: any) {
      showNotification('Échec de la liaison', e?.message || "Une erreur est survenue lors de l'enregistrement de l'adresse email.", 'error');
    } finally {
      setIsOverwriting(false);
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [photoPermissionGranted, setPhotoPermissionGranted] = useState<boolean | null>(() => {
    const saved = localStorage.getItem('photo_permission_granted');
    return saved === 'true' ? true : null;
  });
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  useEffect(() => {
    if (profile && isEditingProfile) {
      setEditFirstName(profile.firstName || '');
      setEditLastName(profile.lastName || '');
      setEditEmail(profile.email && !profile.email.endsWith('@davidstore.com') ? profile.email : '');
      setEditPhone(profile.telephone || profile.phone || profile.phoneNumber || '');
      setPhotoPreview(profile.photoUrl || '');
      setSelectedPhotoFile(null);
    }
  }, [profile, isEditingProfile]);

  useEffect(() => {
    if (profile) {
      setSelectedProvider(profile.preferredPaymentMethod || '');
      setPaymentNumber(profile.paymentPhone || profile.telephone || profile.phone || '');
    }
  }, [profile]);

  useEffect(() => {
    if (!user) return;

    setIsFetchingOrders(true);
    const ordersRef = collection(db, 'orders');
    const q = query(
      ordersRef, 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userOrders: Order[] = [];
      snapshot.forEach((doc) => {
        userOrders.push(doc.data() as Order);
      });
      setOrders(userOrders);
      setIsFetchingOrders(false);
    }, (error) => {
      console.error("Error listening to orders:", error);
      setIsFetchingOrders(false);
    });

    return () => unsubscribe();
  }, [user]);

  if (authLoading) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 bg-[#F5F5F5]">
        <div className="w-12 h-12 border-4 border-[#0057FF] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm font-medium">Chargement du profil...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center bg-[#F5F5F5]">
        <div className="w-24 h-24 bg-white shadow-md rounded-full flex items-center justify-center mb-6 border border-gray-100">
          <UserIcon className="w-12 h-12 text-[#002B7F]" />
        </div>
        <h2 className="text-xl font-extrabold text-[#002B7F] mb-2 tracking-tight">Bienvenue sur DavidSTORE</h2>
        <p className="text-gray-500 text-sm mb-8 max-w-xs">Connectez-vous pour gérer votre compte, suivre vos commandes et interagir avec Nicole IA.</p>
        <button 
          onClick={() => navigate('/login')} 
          className="w-full bg-[#0057FF] hover:bg-[#002B7F] text-white font-bold py-4 px-6 rounded-2xl shadow-md transition-all active:scale-95 text-sm uppercase tracking-wide"
        >
          Se connecter
        </button>
      </div>
    );
  }

  const processingCount = orders.filter(o => o.status === 'processing' || o.status === 'payment_pending').length;
  const transitCount = orders.filter(o => o.status === 'shipped').length;
  const deliveredCount = orders.filter(o => o.status === 'delivered').length;

  const handleSavePayment = async () => {
    if (!user) return;
    setIsSavingPayment(true);
    try {
      await updateProfile({
        preferredPaymentMethod: selectedProvider,
        paymentPhone: paymentNumber
      });
      showNotification('Profil', 'Informations de paiement mises à jour.', 'success');
      setPaymentExpanded(false);
    } catch (err) {
      console.error('Error saving payment:', err);
      showNotification('Profil', 'Erreur lors de la sauvegarde.', 'error');
    } finally {
      setIsSavingPayment(false);
    }
  };

  const triggerFileSelector = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRequestPhotoPermission = () => {
    if (photoPermissionGranted === true) {
      triggerFileSelector();
    } else {
      setShowPermissionPrompt(true);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const updatedFields: any = {};
      
      if (editFirstName.trim()) {
        updatedFields.firstName = editFirstName.trim();
      }
      if (editLastName.trim()) {
        updatedFields.lastName = editLastName.trim();
      }
      const newDisplayName = `${editFirstName.trim()} ${editLastName.trim()}`.trim();
      if (newDisplayName) {
        updatedFields.displayName = newDisplayName;
      }

      if (editEmail.trim()) {
        const targetEmail = editEmail.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(targetEmail)) {
          throw new Error("L'adresse email saisie est invalide.");
        }
        if (targetEmail.endsWith('@davidstore.com')) {
          throw new Error("Veuillez saisir une adresse email valide autre que davidstore.com.");
        }
        if (targetEmail !== profile?.email?.toLowerCase()) {
          updatedFields.email = targetEmail;
        }
      } else {
        throw new Error("L'adresse email est obligatoire.");
      }

      updatedFields.phone = editPhone.trim();

      const result = await updateProfile(updatedFields, selectedPhotoFile || undefined);
      if (result && result.emailVerificationSent) {
        showNotification('Vérification requise', 'Un e-mail de confirmation a été envoyé à votre nouvelle adresse. Veuillez cliquer sur le lien dans cet e-mail pour finaliser le changement.', 'warning');
      } else {
        showNotification('Profil mis à jour', 'Votre profil a été mis à jour avec succès.', 'success');
      }
      setIsEditingProfile(false);
    } catch (err: any) {
      console.error('Error updating profile:', err);
      if (err.code === "auth/email-already-in-use-other") {
        setMergeTargetEmail(editEmail.trim().toLowerCase());
        setMergeTargetUid(err.otherUid || '');
        setShowMergeConfirm(true);
      } else {
        showNotification('Échec de la sauvegarde', err?.message || 'Impossible de mettre à jour votre profil en raison d\'un problème de réseau.', 'error');
      }
    } finally {
      setIsSavingProfile(false);
    }
  };

  const pendingOrdersCount = orders.filter(o => o.status === 'payment_pending').length;

  const MENU_ITEMS = [
    { icon: UserIcon, label: 'Modifier mon profil', action: 'editProfile' },
    { icon: Package, label: 'Mes commandes', path: '/orders', badge: pendingOrdersCount > 0 ? `${pendingOrdersCount}` : undefined },
    { icon: Heart, label: 'Liste de souhaits', path: '/wishlist', badge: profile?.wishlist?.length ? `${profile.wishlist.length}` : undefined },
    { icon: MapPin, label: 'Adresses de livraison', path: '/addresses' },
    { icon: CreditCard, label: 'Moyens de paiement', action: 'togglePayment' },
    { icon: LogOut, label: 'Déconnexion', action: 'logout' },
  ];

  const handleAction = async (item: any) => {
    if (item.action === 'editProfile') {
      setIsEditingProfile(true);
      return;
    }
    if (item.action === 'togglePayment') {
      setPaymentExpanded(!paymentExpanded);
      return;
    }
    if (item.action === 'whatsapp') {
      window.open(`https://wa.me/243852849473?text=${encodeURIComponent("Bonjour DavidSTORE ! Je souhaite obtenir des informations ou passer une commande.")}`, '_blank');
      return;
    }
    if (item.action === 'ai') {
      navigate('/chat');
      return;
    }
    if (item.action === 'notifications') {
      showNotification('Notifications', 'Vous êtes abonné aux notifications en temps réel de DavidSTORE ! Activé avec succès.', 'success');
      return;
    }
    if (item.action === 'settings') {
      showNotification('Paramètres de sécurité', 'Toutes vos données de session et vos modes de paiement sont synchronisés et stockés en toute sécurité dans Firestore cloud.', 'success');
      return;
    }
    if (item.action === 'logout') {
      await logout();
      navigate('/login', { replace: true });
      return;
    }
    
    if (item.path) {
      navigate(item.path);
    }
  };

  const getFormattedPhone = (phoneStr: string) => {
    const digits = phoneStr.replace(/\D/g, '');
    if (digits.length === 9) {
      return `+243 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    } else if (digits.length === 12 && digits.startsWith('243')) {
      return `+243 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
    } else if (digits.startsWith('0') && digits.length === 10) {
      return `+243 ${digits.slice(1, 4)} ${digits.slice(4, 7)} ${digits.slice(7)}`;
    }
    return phoneStr;
  };

  const getDisplayName = () => {
    if (profile?.firstName) {
      return `${profile.firstName} ${profile.lastName || ''}`.trim();
    }
    if (profile?.displayName && profile.displayName !== 'Utilisateur' && !profile.displayName.startsWith('Client ')) {
      return profile.displayName;
    }
    if (profile?.email?.endsWith('@davidstore.com')) {
      const phone = profile.email.split('@')[0];
      return `Client ${phone}`;
    }
    if (user?.email?.endsWith('@davidstore.com')) {
      const phone = user.email.split('@')[0];
      return `Client ${phone}`;
    }
    return profile?.displayName || 'David STORE';
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F5F5] pb-10">
      
      {/* HEADER PREMIUM - GRAND EN-TÊTE MODERNE GRADIENT */}
      <div className="bg-gradient-to-br from-[#002B7F] to-[#0057FF] pt-12 pb-10 px-6 text-white rounded-b-[40px] shadow-lg relative overflow-hidden">
        {/* Decorative background grid pattern */}
        <div className="absolute inset-0 bg-white/5 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none opacity-20" />
        
        <div className="flex flex-col items-center text-center relative z-10">
          {/* Round Profile Picture with white border */}
          <div className="relative w-24 h-24 rounded-full border-4 border-white shadow-xl overflow-hidden bg-white/20 mb-4 flex items-center justify-center">
            {profile?.photoUrl ? (
              <img 
                src={profile.photoUrl} 
                alt="Avatar" 
                className="w-full h-full object-cover" 
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  const parent = target.parentElement;
                  target.style.display = 'none';
                  if (parent) {
                    parent.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-[#002B7F]"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-10 h-10 text-white"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>';
                  }
                }}
              />
            ) : (
              <UserIcon className="w-12 h-12 text-white" />
            )}
          </div>

          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-2xl font-black tracking-tight">{getDisplayName()}</h2>
            
            {/* VIP Golden Yellow badge */}
            <span className="bg-[#FFC107] text-[#002B7F] font-black uppercase text-[9px] tracking-widest px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5 fill-[#002B7F] stroke-[2]" />
              VIP
            </span>
          </div>

          <p className="text-blue-100 text-xs font-medium mb-4">
            {profile?.email?.endsWith('@davidstore.com') 
              ? ((profile?.telephone || profile?.phone) ? getFormattedPhone(profile?.telephone || profile?.phone || '') : `+243 ${profile.email.split('@')[0]}`)
              : (profile?.email || user?.email)}
          </p>

          {/* Edit Profile Button in Header */}
          <button
            onClick={() => setIsEditingProfile(true)}
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40 text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-sm active:scale-95"
          >
            <UserCheck2 className="w-3.5 h-3.5" />
            <span>Modifier le profil</span>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-6">
        
        {/* SECTION STATISTIQUES - 3 SEPARATE CARDS IN GRID */}
        <div className="grid grid-cols-3 gap-3 relative z-10">
          {[
            { label: 'À traiter', val: processingCount, color: 'text-amber-500' },
            { label: 'Expédié', val: transitCount, color: 'text-blue-500' },
            { label: 'Livré', val: deliveredCount, color: 'text-emerald-500' }
          ].map((stat, idx) => (
            <div 
              key={idx}
              onClick={() => navigate('/orders')}
              className="bg-white rounded-[18px] p-3 shadow-sm border border-gray-100/50 flex flex-col items-center justify-center text-center cursor-pointer hover:shadow-md transition-all duration-200 active:scale-95"
            >
              <span className="text-xl font-black text-[#002B7F] mb-1">{stat.val}</span>
              <span className="text-[10px] font-bold text-gray-500 tracking-tight uppercase">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* ACCOUNT RECOVERY EMAIL ASSOCIATION BANNER */}
        {profile?.email?.endsWith('@davidstore.com') && !profile?.pendingEmail && (
          <div className="bg-blue-50/80 border border-blue-100/50 rounded-[18px] p-4 flex flex-col gap-3 relative z-10 shadow-xs">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-4.5 h-4.5 text-[#0057FF]" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-black text-[#002B7F] uppercase tracking-wider">Sécuriser votre compte</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  Votre compte utilise un identifiant temporaire. Veuillez lier votre adresse e-mail pour recevoir vos factures et sécuriser vos achats.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsEditingProfile(true)}
              className="text-center w-full text-xs font-extrabold tracking-wide text-white bg-[#0057FF] hover:bg-[#002B7F] px-4 py-2.5 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              Ajouter une adresse email
            </button>
          </div>
        )}

        {/* ADMIN CARD */}
        {isAdmin && (
          <div className="bg-gradient-to-r from-[#FFC107] via-[#FFD54F] to-[#FFE082] p-4 rounded-[18px] shadow-md relative overflow-hidden border border-[#FFC107]/20 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-[#002B7F]/10 rounded-xl">
                <Settings className="w-5 h-5 text-[#002B7F] animate-spin-slow" />
              </div>
              <div>
                <h4 className="text-sm font-black text-[#002B7F] tracking-tight">Panneau d'administration</h4>
                <p className="text-[10px] text-[#002B7F]/80 font-bold uppercase tracking-wider mt-0.5">Contrôle global de l'application</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/admin')}
              className="bg-[#002B7F] hover:bg-black text-white font-extrabold text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider transition-all active:scale-95 shadow-sm"
            >
              Accéder
            </button>
          </div>
        )}

        {/* NICOLE IA ASSISTANT SPECIAL CARD */}
        <div className="bg-gradient-to-r from-[#002B7F] to-[#0057FF] p-5 rounded-[18px] shadow-lg text-white relative overflow-hidden">
          <div className="absolute right-[-10px] top-[-10px] opacity-10 pointer-events-none">
            <Bot className="w-32 h-32" />
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/15 rounded-2xl relative">
              <Bot className="w-8 h-8 text-[#FFC107]" />
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-[#002B7F]" />
            </div>
            <div className="space-y-1 pr-6 flex-1">
              <h3 className="text-base font-black tracking-tight">Nicole IA</h3>
              <p className="text-xs text-blue-100 font-medium leading-relaxed">
                Votre assistante intelligente DAVIDSTORE disponible 24h/24 pour répondre à toutes vos questions.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/chat')}
            className="mt-4 w-full bg-[#FFC107] hover:bg-white text-[#002B7F] font-black text-xs py-3 rounded-xl uppercase tracking-wider transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            Discuter maintenant
          </button>
        </div>

        {/* SUPPORT PREMIUM CARD WHATSAPP */}
        <div className="bg-white rounded-[18px] border border-gray-100 p-4 shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center border border-green-100">
              <MessageCircle className="w-6 h-6 text-green-500 fill-green-50" />
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-900 tracking-tight">Support WhatsApp</h4>
              <p className="text-xs text-gray-500 font-bold mt-0.5">+243 852 849 473</p>
              <div className="flex items-center gap-1 mt-1 text-[10px] text-gray-400 font-bold uppercase">
                <Clock className="w-3 h-3 text-green-500" />
                <span>Lundi à Samedi (8h - 18h)</span>
              </div>
            </div>
          </div>
          <button 
            onClick={() => window.open(`https://wa.me/243852849473?text=${encodeURIComponent("Bonjour DavidSTORE ! Je souhaite obtenir de l'assistance.")}`, '_blank')}
            className="bg-green-500 hover:bg-green-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl uppercase tracking-wider transition-all active:scale-95 shadow-sm shrink-0"
          >
            Discuter
          </button>
        </div>

        {/* MENU OPTIONS LIST (EVERY ITEM IS A SEPARATE CARD) */}
        <div className="space-y-3">
          {MENU_ITEMS.map((item, idx) => {
            const isPaymentCollapse = item.action === 'togglePayment';
            return (
              <React.Fragment key={idx}>
                <motion.div
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAction(item)}
                  className="bg-white rounded-[16px] p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="p-2.5 bg-[#0057FF]/5 rounded-xl group-hover:bg-[#0057FF]/10 transition-colors">
                      <item.icon className="w-5 h-5 text-[#0057FF]" />
                    </div>
                    <span className="text-sm font-bold text-gray-800 tracking-tight">{item.label}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    {item.badge && (
                      <span className="text-[10px] font-black text-white bg-[#0057FF] px-2.5 py-0.5 rounded-full mr-1.5 shadow-sm">
                        {item.badge}
                      </span>
                    )}
                    <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#0057FF] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </motion.div>

                {/* Collapsible Payment details inside menu stream */}
                {isPaymentCollapse && paymentExpanded && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="bg-white border border-gray-100 rounded-[18px] p-5 shadow-inner mt-2 -mb-2 overflow-hidden"
                  >
                    <p className="text-[10px] font-black text-[#002B7F] uppercase tracking-wider mb-4 text-center">Sélectionnez votre mode de paiement préféré</p>
                    
                    <div className="grid grid-cols-3 gap-3 mb-5">
                      {[
                        { 
                          id: 'orange', 
                          name: 'Orange Money', 
                          icon: (
                            <div className="bg-black relative rounded-xl w-full h-full flex flex-col items-center justify-center p-2 shadow-md hover:shadow-lg transition-all border border-gray-800">
                              <div className="w-8 h-8 flex items-center justify-center mb-1">
                                <svg viewBox="0 0 24 24" className="w-7 h-7">
                                   <path d="M6,16 L6,6 L16,6 L16,10 L10,10 L10,16 Z" fill="white" />
                                   <path d="M18,8 L18,18 L8,18 L8,14 L14,14 L14,8 Z" fill="#FF7900" />
                                </svg>
                              </div>
                              <div className="text-white text-[9px] font-sans font-bold leading-tight tracking-tight text-center">
                                Orange<br/><span className="text-gray-300 font-medium">Money</span>
                              </div>
                            </div>
                          )
                        },
                        { 
                          id: 'airtel', 
                          name: 'Airtel Money', 
                          icon: (
                            <div className="bg-[#E40000] relative rounded-xl w-full h-full flex flex-col items-center justify-center p-2 shadow-md hover:shadow-lg transition-all border border-red-500">
                              <div className="w-8 h-8 flex items-center justify-center mb-1">
                                <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 21C16.9706 21 21 16.9706 21 12C21 7.02944 16.9706 3 12 3C7.02944 3 3 7.02944 3 12C3 14.5 4 16.5 6 18C8 19.5 11 18 11 15C11 12 9 10 7 12" />
                                </svg>
                              </div>
                              <div className="flex flex-col items-center leading-[1]">
                                <span className="text-white text-[11px] font-sans font-extrabold lowercase tracking-wide">airtel</span>
                                <span className="text-[#FFCC00] text-[7px] font-semibold tracking-widest mt-0.5">Money</span>
                              </div>
                            </div>
                          )
                        },
                        { 
                          id: 'mpesa', 
                          name: 'Vodacom M-Pesa', 
                          icon: (
                            <div className="bg-[#43B02A] relative rounded-xl w-full h-full flex flex-col items-center justify-center p-2 shadow-md hover:shadow-lg transition-all border border-green-600">
                              <div className="w-8 h-8 flex items-center justify-center mb-1">
                                <svg viewBox="0 0 24 24" className="w-7 h-7">
                                   <rect x="5" y="3" width="14" height="18" rx="3" fill="white" />
                                   <path d="M5 8 L19 8 L19 6 C19 4.34315 17.6569 3 16 3 L8 3 C6.34315 3 5 4.34315 5 6 L5 8 Z" fill="#E4002B" />
                                   <rect x="10" y="16" width="4" height="2" rx="1" fill="#43B02A" />
                                </svg>
                              </div>
                              <div className="text-white text-[10px] font-sans font-black tracking-tight mt-0.5">
                                M-Pesa
                              </div>
                            </div>
                          )
                        }
                      ].map(pay => (
                        <div 
                          key={pay.id} 
                          onClick={() => setSelectedProvider(pay.id)}
                          className={`flex items-center justify-center rounded-2xl border-2 transition-all cursor-pointer aspect-[1.1] relative overflow-hidden bg-white shadow-sm ${
                            selectedProvider === pay.id 
                            ? 'border-[#0057FF] scale-105 ring-4 ring-[#0057FF]/20 z-10' 
                            : 'border-transparent hover:scale-105'
                          }`}
                        >
                          {pay.icon}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-[#002B7F] uppercase tracking-wider mb-2">Numéro de téléphone mobile</label>
                        <input 
                          type="tel"
                          value={paymentNumber}
                          onChange={(e) => setPaymentNumber(e.target.value)}
                          placeholder="Ex: 0812345678"
                          className="w-full px-4 py-3 bg-[#F5F5F5] border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#0057FF] focus:bg-white focus:border-transparent outline-none transition-all text-gray-800 font-semibold"
                        />
                      </div>
                      
                      <button 
                        onClick={handleSavePayment}
                        disabled={isSavingPayment || !selectedProvider || !paymentNumber}
                        className="w-full bg-[#0057FF] hover:bg-[#002B7F] disabled:opacity-50 text-white font-extrabold text-xs py-3.5 rounded-xl uppercase tracking-wider transition-all shadow-md hover:shadow-lg active:scale-95"
                      >
                        {isSavingPayment ? 'Enregistrement...' : 'Confirmer les informations'}
                      </button>
                    </div>
                  </motion.div>
                )}
              </React.Fragment>
            );
          })}
        </div>

      </div>

      {/* MODAL EDITING PROFILE */}
      <AnimatePresence>
        {isEditingProfile && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-md rounded-[24px] shadow-2xl overflow-hidden relative p-6 animate-in fade-in duration-200 text-gray-800"
            >
              <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
                <h3 className="text-lg font-black text-[#002B7F] tracking-tight">Modifier mon profil</h3>
                <button 
                  onClick={() => setIsEditingProfile(false)}
                  className="p-1 px-2.5 bg-gray-150 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-650 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Photo Upload container */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative w-24 h-24 rounded-full border-4 border-[#0057FF]/30 overflow-hidden shadow-inner group bg-gray-50 flex items-center justify-center">
                  {photoPreview ? (
                    <img 
                      src={photoPreview} 
                      alt="Aperçu" 
                      className="w-full h-full object-cover" 
                    />
                  ) : (
                    <UserIcon className="w-10 h-10 text-gray-300" />
                  )}
                  
                  <button
                    type="button"
                    onClick={handleRequestPhotoPermission}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
                  >
                    <Camera className="w-6 h-6 text-white" />
                  </button>
                </div>
                
                <button
                  type="button"
                  onClick={handleRequestPhotoPermission}
                  className="mt-3 text-xs font-black text-[#0057FF] hover:underline flex items-center space-x-1"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Importer une photo</span>
                </button>
                
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handlePhotoChange}
                  accept="image/*"
                  className="hidden"
                />
              </div>

              {/* Edit form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-[#002B7F] uppercase tracking-wider mb-2">Prénom</label>
                  <input 
                    type="text"
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    placeholder="Votre prénom"
                    className="w-full px-4 py-3 bg-[#F5F5F5] border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#0057FF] focus:bg-white focus:border-transparent outline-none transition-all text-gray-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[#002B7F] uppercase tracking-wider mb-2">Nom de famille</label>
                  <input 
                    type="text"
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    placeholder="Votre nom"
                    className="w-full px-4 py-3 bg-[#F5F5F5] border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#0057FF] focus:bg-white focus:border-transparent outline-none transition-all text-gray-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[#002B7F] uppercase tracking-wider mb-2">Adresse email</label>
                  <input 
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="exemple@email.com"
                    className="w-full px-4 py-3 bg-[#F5F5F5] border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#0057FF] focus:bg-white focus:border-transparent outline-none transition-all text-gray-800 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-[#002B7F] uppercase tracking-wider mb-2">Numéro de téléphone mobile</label>
                  <input 
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="Ex: 0852849473"
                    className="w-full px-4 py-3 bg-[#F5F5F5] border border-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-[#0057FF] focus:bg-white focus:border-transparent outline-none transition-all text-gray-800 font-semibold"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="flex-1 py-3.5 border border-gray-200 text-gray-500 font-black text-xs uppercase tracking-wider rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button 
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={isSavingProfile || !editFirstName.trim()}
                    className="flex-1 py-3.5 bg-[#0057FF] hover:bg-[#002B7F] text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSavingProfile ? 'Sauvegarde...' : 'Enregistrer'}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ACCOUNT MERGING CONFIRMATION DIALOG */}
      <AnimatePresence>
        {showMergeConfirm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-[60] backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl p-6 text-center transform text-gray-800"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <Mail className="w-8 h-8 text-[#0057FF]" />
              </div>
              <h4 className="text-lg font-black text-[#002B7F] mb-2">Associer &amp; Fusionner</h4>
              <div className="text-sm text-gray-500 mb-6 font-normal leading-relaxed text-center">
                <p className="mb-3">
                  L&apos;adresse e-mail <strong>{mergeTargetEmail}</strong> est déjà associée à un autre de vos comptes sur DavidSTORE.
                </p>
                {isAdmin ? (
                  <div className="text-left bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs text-amber-900 font-medium space-y-1">
                    <span className="font-bold flex items-center gap-1 text-[#002B7F] uppercase text-[9px] tracking-wider mb-1">
                      👑 Securité Administrateur
                    </span>
                    <p>
                      Vous pouvez choisir d&apos;enregistrer directement votre adresse email sur votre compte actuel (écrasement) sans déconnexion, ou fusionner les deux profils.
                    </p>
                  </div>
                ) : (
                  <p>
                    Voulez-vous fusionner ce compte temporaire avec votre compte principal ? Toutes vos commandes, adresses et favoris seront unifiés.
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-2.5">
                {isAdmin && (
                  <button
                    type="button"
                    disabled={isMerging || isOverwriting}
                    onClick={handleForceOverwriteEmail}
                    className="w-full py-3.5 px-4 bg-[#002B7F] hover:bg-[#002B7F]/90 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition-all border border-[#002B7F]"
                  >
                    {isOverwriting ? "Association en cours..." : "Enregistrer directement ici (Force)"}
                  </button>
                )}
                <button
                  type="button"
                  disabled={isMerging || isOverwriting}
                  onClick={handleConfirmMerge}
                  className="w-full py-3.5 px-4 bg-[#0057FF] hover:bg-[#002B7F] disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition-all"
                >
                  {isMerging ? 'Fusion en cours...' : 'Oui, Fusionner lescomptes'}
                </button>
                <button
                  type="button"
                  disabled={isMerging || isOverwriting}
                  onClick={() => setShowMergeConfirm(false)}
                  className="w-full py-3 px-4 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 rounded-2xl text-sm font-bold text-gray-400 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* PHOTO ACCESS REQUEST DIALOG */}
      <AnimatePresence>
        {showPermissionPrompt && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-[60] backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-sm rounded-[24px] shadow-2xl p-6 text-center text-gray-800"
            >
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-100">
                <Camera className="w-8 h-8 text-[#0057FF]" />
              </div>
              <h4 className="text-lg font-black text-[#002B7F] mb-2 tracking-tight">Accès aux photos</h4>
              <p className="text-sm text-gray-500 mb-6 font-medium leading-relaxed">
                DavidSTORE requiert l'accès à votre galerie de photos pour vous permettre de sélectionner et d'importer votre superbe photo de profil.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setPhotoPermissionGranted(false);
                    localStorage.setItem('photo_permission_granted', 'false');
                    setShowPermissionPrompt(false);
                    showNotification('Accès refusé', "L'autorisation a été refusée.", 'error');
                  }}
                  className="flex-1 py-3 px-4 border border-gray-200 rounded-xl text-sm font-bold text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  Refuser
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoPermissionGranted(true);
                    localStorage.setItem('photo_permission_granted', 'true');
                    setShowPermissionPrompt(false);
                    showNotification('Accès autorisé', 'Permission accordée avec succès.', 'success');
                    setTimeout(() => {
                      triggerFileSelector();
                    }, 150);
                  }}
                  className="flex-1 py-3 px-4 bg-[#0057FF] hover:bg-[#002B7F] text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg active:scale-95 transition-all"
                >
                  Autoriser
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
