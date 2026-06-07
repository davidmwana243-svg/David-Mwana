import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { Package, Heart, Settings, MapPin, ChevronRight, LogOut, User as UserIcon, Share2, MessageSquare, Bot, CreditCard, Camera, X, Mail } from 'lucide-react';
import { Button } from '../components/Button';
import { getUserOrders } from '../services/orderService';
import { Order } from '../models/types';

import { db } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';

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

      // Pass bypassEmailVerification=true and forceOverwriteEmail=true to save directly
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

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

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
      <div className="flex flex-col h-full items-center justify-center p-6 bg-white">
        <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-gray-500 text-sm font-medium">Chargement du profil...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col h-full items-center justify-center p-6 text-center bg-gray-50">
        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4">
          <UserIcon className="w-12 h-12 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Bienvenue sur DavidSTORE</h2>
        <p className="text-gray-500 mb-8">Connectez-vous pour gérer votre compte et voir vos commandes.</p>
        <Button onClick={() => navigate('/login')} className="w-full">Se connecter</Button>
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
      navigate('/home');
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

      // Add phone field to update
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
    { icon: MessageSquare, label: 'Support WhatsApp', action: 'whatsapp' },
    { icon: Bot, label: 'Nicole (Assistant DavidSTORE)', action: 'ai' },
    { icon: Share2, label: 'Partagez DavidSTORE', action: 'share' },
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
      window.open('https://wa.me/243852849473', '_blank');
      return;
    }
    if (item.action === 'ai') {
      navigate('/chat');
      return;
    }
    if (item.action === 'share') {
      const targetUrl = 'https://ais-pre-htongq6rmqzf7q2pg4r7vz-437132868753.europe-west2.run.app';
      const shareData = {
        title: 'DavidSTORE',
        text: 'Découvrez DavidSTORE, ma boutique en ligne préférée !',
        url: targetUrl
      };

      try {
        if (navigator.share) {
          await navigator.share(shareData);
        } else {
          await navigator.clipboard.writeText(targetUrl);
          showNotification('Partage', 'Lien de l\'application copié dans le presse-papier !', 'info');
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
          // Fallback to clipboard if share fails for non-abort reason
          try {
            await navigator.clipboard.writeText(targetUrl);
            showNotification('Partage', 'Lien copié dans le presse-papier !', 'info');
          } catch (clipErr) {
            console.error('Clipboard fallback failed:', clipErr);
          }
        }
      }
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
    return profile?.displayName || 'Utilisateur';
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-orange-500 pt-10 pb-6 px-6 text-white">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-white/20 overflow-hidden border-2 border-white/50">
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
                    parent.classList.add('bg-orange-500');
                    parent.innerHTML = '<div class="w-full h-full flex items-center justify-center"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-8 h-8 text-white"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg></div>';
                  }
                }}
              />
            ) : (
              <UserIcon className="w-full h-full p-3 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-bold">
              {getDisplayName()}
            </h2>
            <p className="text-orange-100 text-sm">
              {profile?.email?.endsWith('@davidstore.com') 
                ? ((profile?.telephone || profile?.phone) ? getFormattedPhone(profile?.telephone || profile?.phone || '') : `+243 ${profile.email.split('@')[0]}`)
                : (profile?.email || user?.email)}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 -mt-4">
        {/* Quick Stats */}
        <div 
          onClick={() => navigate('/orders')}
          className="bg-white rounded-xl shadow-sm p-4 grid grid-cols-3 gap-2 text-center relative z-10 cursor-pointer"
        >
          {[
            { label: 'À traiter', val: processingCount },
            { label: 'Expédié', val: transitCount },
            { label: 'Livré', val: deliveredCount }
          ].map(stat => (
            <div key={stat.label} className="flex flex-col items-center">
              <span className="text-lg font-bold text-gray-900">{stat.val}</span>
              <span className="text-[10px] text-gray-500 mt-1">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Banner for legacy account email association */}
        {profile?.email?.endsWith('@davidstore.com') && !profile?.pendingEmail && (
          <div className="bg-orange-50 border border-orange-100/60 rounded-xl p-4 flex flex-col gap-3 relative z-10">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                <Settings className="w-4 h-4 text-orange-600 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-orange-950 uppercase tracking-widest">Associer un e-mail</h4>
                <p className="text-xs text-orange-850 leading-relaxed font-semibold">
                  Votre compte utilise un identifiant temporaire. Veuillez associer votre véritable adresse e-mail pour recevoir vos factures et réinitialiser votre mot de passe en cas d'oubli !
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsEditingProfile(true)}
              className="text-center w-full text-[10px] font-black tracking-widest uppercase text-white bg-orange-500 hover:bg-orange-600 px-3.5 py-2.5 rounded-lg transition-all shadow-xs"
            >
              Ajouter mon adresse email
            </button>
          </div>
        )}

        {/* Banner for pending email verification */}
        {profile?.pendingEmail && (
          <div className="bg-blue-50 border border-blue-100/60 rounded-xl p-4 flex flex-col gap-3 relative z-10">
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4 text-blue-600 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-black text-blue-950 uppercase tracking-widest">E-mail en attente de vérification</h4>
                <p className="text-xs text-blue-850 leading-relaxed font-semibold">
                  Un e-mail de confirmation a été envoyé à <strong className="text-blue-950">{profile.pendingEmail}</strong>. Veuillez cliquer sur le lien dans cet e-mail pour finaliser l'association de votre compte.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  setIsSavingProfile(true);
                  try {
                    await updateProfile({ email: profile.pendingEmail });
                    showNotification('E-mail renvoyé', 'L\'e-mail de confirmation a été renvoyé avec succès.', 'success');
                  } catch (e: any) {
                    showNotification('Échec du renvoi', e?.message || 'Une erreur est survenue lors du renvoi de l\'e-mail.', 'error');
                  } finally {
                    setIsSavingProfile(false);
                  }
                }}
                disabled={isSavingProfile}
                className="text-center w-full text-[10px] font-black tracking-widest uppercase text-white bg-blue-500 hover:bg-blue-600 px-3.5 py-2.5 rounded-lg transition-all shadow-xs disabled:opacity-50"
              >
                {isSavingProfile ? 'Renvoyer en cours...' : 'Renvoyer l\'email de confirmation'}
              </button>

              <button
                onClick={async () => {
                  setIsSavingProfile(true);
                  try {
                    await updateProfile({ email: profile.pendingEmail }, undefined, true);
                    showNotification('Compte associé', 'Votre adresse e-mail a été enregistrée avec succès directement sur votre profil.', 'success');
                  } catch (e: any) {
                    if (e.code === "auth/email-already-in-use-other") {
                      setMergeTargetEmail(profile.pendingEmail?.toLowerCase() || '');
                      setMergeTargetUid(e.otherUid || '');
                      setShowMergeConfirm(true);
                    } else {
                      showNotification('Échec', e?.message || 'Une erreur est survenue lors de l\'association directe.', 'error');
                    }
                  } finally {
                    setIsSavingProfile(false);
                  }
                }}
                disabled={isSavingProfile}
                className="text-center w-full text-[10px] font-black tracking-widest uppercase text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 px-3.5 py-2.5 rounded-lg transition-all shadow-xs disabled:opacity-50"
              >
                Associer directement sans lien de confirmation
              </button>
            </div>
          </div>
        )}

        {/* Dashboard Link for admin only */}
        {isAdmin && (
          <button 
            onClick={() => navigate('/admin')}
            className="w-full flex items-center px-4 py-4 border border-orange-200 bg-orange-50 rounded-xl shadow-sm hover:bg-orange-100 transition-colors"
          >
            <Settings className="w-5 h-5 text-orange-500 mr-3" />
            <span className="flex-1 text-left text-sm font-medium text-orange-800">Accéder au Panneau d'Administration</span>
            <ChevronRight className="w-4 h-4 text-orange-300" />
          </button>
        )}

        {/* Menu list */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {MENU_ITEMS.map((item, idx) => (
            <React.Fragment key={idx}>
              <button 
                onClick={() => handleAction(item)}
                className="w-full flex items-center px-4 py-4 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors"
              >
                <item.icon className="w-5 h-5 text-gray-400 mr-3" />
                <span className="flex-1 text-left text-sm font-medium text-gray-800">{item.label}</span>
                {item.badge && <span className="text-xs text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full mr-2">{item.badge}</span>}
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>

              {/* Payment Methods Section - Displayed when expanded */}
              {item.action === 'togglePayment' && paymentExpanded && (
                <div className="px-4 py-6 bg-gray-50 border-b border-gray-100 animate-in slide-in-from-top duration-300">
                  <div className="mb-5">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Choisir votre mode préféré</p>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { id: 'mpesa', name: 'M-Pesa', logo: 'https://i.postimg.cc/26Phc4LK/1779419706497.jpg' },
                        { id: 'airtel', name: 'Airtel Money', logo: 'https://i.postimg.cc/hvWMzFsc/1779419565561.jpg' },
                        { id: 'orange', name: 'Orange Money', logo: 'https://i.postimg.cc/BQfwtF7T/1779419792771.jpg' }
                      ].map(pay => (
                        <div 
                          key={pay.id} 
                          onClick={() => setSelectedProvider(pay.id)}
                          className={`flex items-center justify-center aspect-square rounded-xl border-2 overflow-hidden transition-all cursor-pointer ${
                            selectedProvider === pay.id 
                            ? 'border-orange-500 bg-orange-50 shadow-sm' 
                            : 'border-white bg-white hover:border-gray-200'
                          }`}
                        >
                          <img 
                            src={pay.logo} 
                            alt={pay.name} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${pay.name.charAt(0)}&background=f3f4f6&color=9ca3af&size=64`;
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Numéro de téléphone</label>
                      <input 
                        type="tel"
                        value={paymentNumber}
                        onChange={(e) => setPaymentNumber(e.target.value)}
                        placeholder="Ex: 0812345678"
                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    
                    <Button 
                      onClick={handleSavePayment}
                      disabled={isSavingPayment || !selectedProvider || !paymentNumber}
                      className="w-full text-sm font-bold h-12"
                    >
                      {isSavingPayment ? 'Enregistrement...' : 'Mettre à jour les infos'}
                    </Button>
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        <button 
          onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
          className="w-full flex items-center justify-center space-x-2 bg-white rounded-xl shadow-sm p-4 text-red-500 font-medium hover:bg-red-50 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Se déconnecter</span>
        </button>
      </div>

      {isEditingProfile && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden relative transform transition-all p-6 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
              <h3 className="text-lg font-bold text-gray-900">Modifier mon profil</h3>
              <button 
                onClick={() => setIsEditingProfile(false)}
                className="p-1 px-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col items-center mb-6">
              <div className="relative w-24 h-24 rounded-full bg-orange-100 border-4 border-orange-500/20 overflow-hidden shadow-inner group">
                {photoPreview ? (
                  <img 
                    src={photoPreview} 
                    alt="Aperçu" 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <UserIcon className="w-full h-full p-4 text-orange-400" />
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
                className="mt-3 text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center space-x-1"
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Changer la photo de profil</span>
              </button>
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handlePhotoChange}
                accept="image/*"
                className="hidden"
              />
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Prénom</label>
                <input 
                  type="text"
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  placeholder="Votre prénom"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:bg-white focus:border-transparent outline-none transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Nom</label>
                <input 
                  type="text"
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  placeholder="Votre nom"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:bg-white focus:border-transparent outline-none transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Adresse email</label>
                <input 
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="exemple@email.com"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:bg-white focus:border-transparent outline-none transition-all text-gray-800"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Numéro de téléphone</label>
                <input 
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="Ex: 0852849473"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500 focus:bg-white focus:border-transparent outline-none transition-all text-gray-800"
                />
              </div>

              <div className="pt-4 flex gap-3">
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 text-sm font-bold border-gray-200 text-gray-500"
                >
                  Annuler
                </Button>
                <Button 
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={isSavingProfile || !editFirstName.trim()}
                  className="flex-1 text-sm font-bold"
                >
                  {isSavingProfile ? 'Sauvegarde...' : 'Enregistrer'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMergeConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-[60] backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center transform scale-95 transition-all text-gray-800 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-200">
              <Mail className="w-8 h-8 text-blue-600" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">Associer &amp; Fusionner</h4>
            <div className="text-sm text-gray-500 mb-6 font-normal leading-relaxed text-center">
              <p className="mb-3">
                L&apos;adresse e-mail <strong>{mergeTargetEmail}</strong> est déjà associée à un autre de vos comptes sur DavidSTORE.
              </p>
              {isAdmin ? (
                <div className="text-left bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs text-amber-900 font-medium space-y-1">
                  <span className="font-bold flex items-center gap-1 text-amber-950 uppercase text-[10px] tracking-wider mb-1">
                    👑 Mode Administrateur
                  </span>
                  <p>
                    Vous pouvez choisir d&apos;enregistrer directement votre adresse email sur votre compte actuel (par écrasement) sans vous déconnecter, ou de fusionner les deux profils.
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
                  className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer border border-blue-600"
                >
                  {isOverwriting ? "Association directe en cours..." : "Enregistrer directement ici (Force)"}
                </button>
              )}
              <button
                type="button"
                disabled={isMerging || isOverwriting}
                onClick={handleConfirmMerge}
                className="w-full py-3.5 px-4 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-md hover:shadow-lg active:scale-95 transition-all cursor-pointer"
              >
                {isMerging ? 'Fusion en cours...' : 'Oui, Fusionner & Se déconnecter'}
              </button>
              <button
                type="button"
                disabled={isMerging || isOverwriting}
                onClick={() => setShowMergeConfirm(false)}
                className="w-full py-3 px-4 border border-gray-200 hover:bg-gray-50 active:bg-gray-100 disabled:opacity-50 rounded-2xl text-sm font-semibold text-gray-400 transition-colors cursor-pointer"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {showPermissionPrompt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-6 z-[60] backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-6 text-center transform scale-95 transition-all text-gray-800 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 border border-orange-200">
              <Camera className="w-8 h-8 text-orange-600" />
            </div>
            <h4 className="text-lg font-bold text-gray-900 mb-2">Accès aux photos</h4>
            <p className="text-sm text-gray-500 mb-6 font-normal leading-relaxed">
              DavidSTORE requiert l'accès à votre galerie de photos pour vous permettre de sélectionner et de téléverser votre avatar de profil.
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
                className="flex-1 py-3 px-4 border border-gray-200 rounded-2xl text-sm font-semibold text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors"
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
                className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-2xl text-sm font-bold shadow-md hover:shadow-lg active:scale-95 transition-all"
              >
                Autoriser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
