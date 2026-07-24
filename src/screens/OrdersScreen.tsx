import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { Order } from '../models/types';
import { getUserOrders, confirmQRReceived, updateOrderStatus } from '../services/orderService';
import { 
  ArrowLeft, 
  Package, 
  Calendar, 
  QrCode, 
  Camera, 
  X, 
  CheckCircle2, 
  Sparkles, 
  AlertCircle, 
  Truck, 
  Clock, 
  MapPin,
  ChevronRight,
  ShieldCheck,
  Eye,
  Star,
  Send
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { formatSafeDate } from '../utils/dateUtils';
import { QRCodeSVG } from 'qrcode.react';
import { addProductReview } from '../services/productService';

export const OrdersScreen: React.FC = () => {
  const { user, profile } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Custom states for QR delivery validation
  const [scanningOrder, setScanningOrder] = useState<Order | null>(null);
  const [showingQRForOrder, setShowingQRForOrder] = useState<Order | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);

  // States for writing a review/rating
  const [reviewOrder, setReviewOrder] = useState<Order | null>(null);
  const [reviewRatings, setReviewRatings] = useState<Record<string, number>>({});
  const [reviewComments, setReviewComments] = useState<Record<string, string>>({});
  const [isSubmittingReviews, setIsSubmittingReviews] = useState<Record<string, boolean>>({});
  const [submittedReviews, setSubmittedReviews] = useState<Record<string, boolean>>({});

  const handleOpenReviewModal = (order: Order) => {
    setReviewOrder(order);
    const initialRatings: Record<string, number> = {};
    const initialComments: Record<string, string> = {};
    order.items.forEach(item => {
      if (item.product?.id) {
        initialRatings[item.product.id] = 5;
        initialComments[item.product.id] = '';
      }
    });
    setReviewRatings(initialRatings);
    setReviewComments(initialComments);
  };

  const handleSendReview = async (productId: string, productName: string) => {
    const rating = reviewRatings[productId] || 5;
    const comment = reviewComments[productId] || '';
    
    if (!comment.trim()) {
      showNotification("Avis", "Veuillez rédiger un commentaire avant de publier votre avis.", "error");
      return;
    }
    
    setIsSubmittingReviews(prev => ({ ...prev, [productId]: true }));
    
    const authorName = profile?.displayName || profile?.firstName || "Acheteur DavidStore";
    const authorId = user?.uid || "anon";
    
    try {
      await addProductReview(productId, authorId, authorName, rating, comment);
      setSubmittedReviews(prev => ({ ...prev, [productId]: true }));
      showNotification("Merci !", `Votre avis pour "${productName}" a été publié !`, "success");
    } catch (err) {
      console.error(err);
      showNotification("Erreur", "Une erreur est survenue lors de la publication de votre avis.", "error");
    } finally {
      setIsSubmittingReviews(prev => ({ ...prev, [productId]: false }));
    }
  };


  // Real QR Camera scan refs & states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraLoading, setIsCameraLoading] = useState(false);
  const [isRealCameraActive, setIsRealCameraActive] = useState(true);

  // Trigger scan success workflow
  const triggerRealScanSuccess = async (ord: Order, tokenVal: string) => {
    setIsValidating(true);
    try {
      const success = await confirmQRReceived(ord.id, tokenVal);
      if (success) {
        setSuccessOrder(ord);
        setShowSuccess(true);
        setScanningOrder(null);
      } else {
        showNotification("Signature", "Erreur de validation de la signature: le jeton QR ne correspond pas.", "error");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRetryCamera = () => {
    setCameraError(null);
    setIsRealCameraActive(true);
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const startCamera = async () => {
      if (!scanningOrder || !isRealCameraActive) return;
      
      // Wait a bit to ensure the ref is attached after modal opens
      await new Promise(resolve => setTimeout(resolve, 300));
      
      if (!videoRef.current) {
        console.warn("Video ref not ready yet");
        return;
      }

      setIsCameraLoading(true);
      setCameraError(null);
      try {
        const constraints = {
          video: { 
            facingMode: 'environment', // Prefer back camera
            width: { ideal: 1080 }, 
            height: { ideal: 1080 } 
          }
        };
        
        console.log("Requesting camera with constraints:", constraints);
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
          setIsCameraLoading(false);
          tick();
        }
      } catch (err: any) {
        console.error("Camera access error:", err);
        let errorMsg = "Impossible d'accéder à la caméra.";
        
        if (err.name === 'NotAllowedError') {
          errorMsg = "L'accès à la caméra a été refusé. Veuillez autoriser la caméra dans les réglages.";
        } else if (err.name === 'NotFoundError') {
          errorMsg = "Aucune caméra n'a été trouvée sur cet appareil.";
        } else if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
          errorMsg = "La caméra nécessite une connexion sécurisée (HTTPS).";
        }
        
        setCameraError(errorMsg);
        setIsCameraLoading(false);
        setIsRealCameraActive(false);
      }
    };

    const tick = () => {
      if (!videoRef.current || !canvasRef.current || !scanningOrder) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });

        if (code && code.data) {
          try {
            let decodedToken = code.data;
            if (code.data.startsWith('{')) {
              const json = JSON.parse(code.data);
              decodedToken = json.token || json.qrToken || code.data;
            }
            
            if (decodedToken === scanningOrder.qrToken) {
              playScanBeep();
              triggerRealScanSuccess(scanningOrder, decodedToken);
              return;
            }
          } catch (e) {
            if (code.data === scanningOrder.qrToken) {
              playScanBeep();
              triggerRealScanSuccess(scanningOrder, code.data);
              return;
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    if (scanningOrder && isRealCameraActive) {
      startCamera();
    } else {
      setIsCameraLoading(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [scanningOrder, isRealCameraActive]);

  useEffect(() => {
    if (user) {
      const fetchOrders = async () => {
        try {
          const userOrders = await getUserOrders(user.uid);
          setOrders(userOrders);
        } catch (error) {
          console.error("Error fetching orders:", error);
        } finally {
          setIsLoading(false);
        }
      };
      
      // Keep real-time snapshot sync so clicking scan on client updates both screens instantaneously!
      fetchOrders();
      
      const q = doc(db, 'test', 'connection'); // keep background alive
    } else {
      setIsLoading(false);
    }
  }, [user]);

  // Handle active live changes to shown orders
  useEffect(() => {
    if (user && orders.length > 0) {
      // Listen to the order currently being scanned (or state modifications overall) to reflect delivered changes in the list
      const unsubscribes = orders.map(ord => {
        return onSnapshot(doc(db, 'orders', ord.id), (snap) => {
          if (snap.exists()) {
            const upDoc = snap.data() as Order;
            setOrders(prev => prev.map(o => o.id === upDoc.id ? upDoc : o));
          }
        });
      });
      return () => unsubscribes.forEach(unsub => unsub());
    }
  }, [user, orders.length === 0]);

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'payment_pending': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'pending': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: Order['status']) => {
    switch (status) {
      case 'payment_pending': return 'Attente Code PIN';
      case 'pending': return 'Payé - En attente de validation';
      case 'processing': return 'En préparation';
      case 'shipped': return 'En livraison (Expédié)';
      case 'delivered': return 'Livré (Confirmé)';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/profile');
    }
  };

  const playScanBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime); // 1000 Hz high pitched clear beep
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 120);
    } catch (e) {
      console.warn("Could not play scan beep", e);
    }
  };

  // Simulated Scanning trigger action
  const handlePerformSimulatedScan = async () => {
    if (!scanningOrder) return;
    setIsValidating(true);

    setTimeout(async () => {
      playScanBeep();
      await triggerRealScanSuccess(scanningOrder, scanningOrder.qrToken || '');
    }, 1200);
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <Package className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Connectez-vous</h2>
        <p className="text-gray-500 mb-6 font-medium text-xs">Vous devez être connecté pour voir vos commandes.</p>
        <button onClick={() => navigate('/login')} className="bg-blue-600 text-white px-8 py-3 rounded-xl font-extrabold transition-all active:scale-95 shadow-md">Se connecter</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative pb-12">
      
      {/* Top Bar Navigation */}
      <div className="bg-white px-4 py-3.5 shadow-sm sticky top-0 z-10 border-b border-gray-100 flex items-center">
        <button onClick={handleBack} className="mr-3 p-1 rounded-full hover:bg-gray-100 active:scale-95 transition-all">
          <ArrowLeft className="w-6 h-6 text-gray-800" />
        </button>
        <h1 className="text-lg font-black text-gray-900 flex-1 text-center pr-9">Mes Commandes</h1>
      </div>

      <div className="flex-1 p-4 max-w-md mx-auto w-full">
        {isLoading ? (
          <div className="flex flex-col justify-center items-center h-48 space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-650"></div>
            <span className="text-xs text-gray-450 font-bold uppercase tracking-wider">Chargement des colis...</span>
          </div>
        ) : orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map(order => (
              <div key={order.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden relative">
                
                {/* Header detail */}
                <div className="p-4 border-b border-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-[10px] font-mono font-bold text-gray-400">ID COMMANDE: #{order.id.slice(-8).toUpperCase()}</p>
                      <div className="flex items-center text-xs font-bold text-gray-700 mt-0.5">
                        <Calendar className="w-3.5 h-3.5 mr-1 text-gray-400" />
                        {formatSafeDate(order.createdAt)}
                      </div>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border uppercase tracking-wide shrink-0 ${getStatusColor(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  {/* Thumbnail gallery preview */}
                  <div className="flex items-center space-x-3 mt-3">
                    <div className="flex -space-x-2">
                      {order.items.slice(0, 3).map((item, idx) => (
                        <div key={idx} className="w-9 h-9 rounded-xl border-2 border-white overflow-hidden bg-gray-50 shadow-sm">
                          <img src={item.imageUrl || item.product?.imageUrl || ''} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      {order.items.length > 3 && (
                        <div className="w-9 h-9 rounded-xl border-2 border-white bg-gray-100 flex items-center justify-center text-[10px] font-black text-gray-600 shadow-sm">
                          +{order.items.length - 3}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-bold text-gray-500">
                      {order.items.length} article{order.items.length > 1 ? 's' : ''} commandé{order.items.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Tracking section & CTA */}
                <div className="p-4 bg-gray-50/50 space-y-3">
                  
                  {/* Address brief card */}
                  <div className="flex items-start gap-1.5 text-xs text-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">
                      {typeof order.shippingAddress === 'object' && order.shippingAddress !== null ? (
                        `${(order.shippingAddress as any).address || ''}${(order.shippingAddress as any).city ? `, ${(order.shippingAddress as any).city}` : ''}`
                      ) : (
                        order.shippingAddress
                      )}
                    </span>
                  </div>

                  {/* Pricing footer summary */}
                  <div className="flex justify-between items-center text-xs pt-1">
                    <span className="text-gray-400 font-bold uppercase tracking-wider text-[9px]">Total Payé</span>
                    <span className="text-sm font-black text-blue-600">{(order.total || 0).toLocaleString()} FC</span>
                  </div>

                  {/* DavidSTORE STYLE QR ACTIONS: Show only if "shipped" status */}
                  {order.status === 'shipped' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => setScanningOrder(order)}
                        className="mt-2 flex-[2] bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl text-[10px] font-black tracking-wide flex items-center justify-center gap-2 shadow-md shadow-blue-100 active:scale-95 transition-all cursor-pointer"
                      >
                        <Camera className="w-3.5 h-3.5 text-blue-200" />
                        <span>SCANNER LE LIVREUR</span>
                      </button>
                      <button
                        onClick={() => setShowingQRForOrder(order)}
                        className="mt-2 flex-1 bg-white border border-gray-200 text-gray-700 py-3 px-4 rounded-xl text-[10px] font-black tracking-wide flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer"
                      >
                        <QrCode className="w-3.5 h-3.5 text-orange-500" />
                        <span>MON QR</span>
                      </button>
                    </div>
                  )}

                  {order.status === 'delivered' && (
                    <div className="mt-2 p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-[11px] text-emerald-800 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="font-extrabold">Réception certifiée par Code QR</span>
                    </div>
                  )}



                  {order.status !== 'payment_pending' && order.status !== 'cancelled' && (
                    <button
                      onClick={() => handleOpenReviewModal(order)}
                      className="w-full mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white py-2.5 px-4 rounded-xl text-[10px] font-black tracking-wide flex items-center justify-center gap-2 shadow-lg shadow-orange-100 active:scale-95 transition-all cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-100 fill-amber-100" />
                      <span>NOTER & DONNER MON AVIS</span>
                    </button>
                  )}

                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-16 h-16 text-gray-200 mb-4" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">Pas encore de commande</h2>
            <p className="text-gray-500 mb-6 font-medium text-xs">Vos commandes apparaîtront ici une fois que vous aurez effectué des achats.</p>
            <button onClick={() => navigate('/home')} className="bg-blue-600 text-white px-8 py-2.5 rounded-full font-bold shadow-md">Faire des achats</button>
          </div>
        )}
      </div>

      {/* RENDER MODAL VIEW 1: PRE-SCAN CONFIRMATION CAMERA ENGINE */}
      <AnimatePresence>
        {scanningOrder && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="bg-neutral-900 border border-neutral-800 text-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-sm"
            >
              {/* Camera header */}
              <div className="p-4 border-b border-neutral-800 flex justify-between items-center">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Camera className="w-5 h-5 animate-pulse" />
                  <span className="text-xs uppercase tracking-widest font-black font-sans">Objectif Caméra de Suivi</span>
                </div>
                <button 
                  onClick={() => setScanningOrder(null)} 
                  className="p-1 rounded-full bg-neutral-800 hover:bg-neutral-700 transition"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Viewport Frame with grid lasers */}
              <div className="relative aspect-square bg-neutral-950 flex items-center justify-center overflow-hidden border-b border-neutral-800">
                {isRealCameraActive ? (
                  <>
                    <video 
                      ref={videoRef} 
                      className="absolute inset-0 w-full h-full object-cover"
                      muted 
                      playsInline
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {isCameraLoading && (
                      <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center text-center p-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-2"></div>
                        <p className="text-[11px] text-gray-400 font-extrabold uppercase tracking-widest animate-pulse">Démarrage de la caméra...</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 bg-neutral-900 flex flex-col items-center justify-center text-center p-6 space-y-4">
                    {cameraError ? (
                      <>
                        <AlertCircle className="w-8 h-8 text-red-500" />
                        <p className="text-[11px] font-black text-red-400 uppercase tracking-wide">ERREUR CAMÉRA</p>
                        <p className="text-[10.5px] text-gray-300 leading-normal">{cameraError}</p>
                        <button 
                          onClick={handleRetryCamera}
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-[10px] font-bold uppercase tracking-widest transition"
                        >
                          Réessayer la caméra
                        </button>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-8 h-8 text-amber-500 animate-bounce" />
                        <p className="text-xs font-black text-gray-200 uppercase tracking-wide">MODE SIMULATION ACTIVÉ</p>
                        <p className="text-[10.5px] text-gray-400 leading-normal">
                          Accès caméra indisponible dans ce mode. Ouvrez l'application dans un nouvel onglet pour activer l'appareil photo, ou utilisez le test ci-dessous !
                        </p>
                      </>
                    )}
                  </div>
                )}
                
                {/* Laser animation overlay */}
                {(!isCameraLoading || !isRealCameraActive) && (
                  <div className="absolute left-0 right-0 h-0.5 bg-emerald-500 shadow-lg shadow-emerald-400/80 animate-[bounce_2.5s_infinite] z-20" />
                )}

                {/* Frame Corner markings */}
                <div className="absolute top-4 left-4 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-lg z-20" />
                <div className="absolute top-4 right-4 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-lg z-20" />
                <div className="absolute bottom-4 left-4 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-lg z-20" />
                <div className="absolute bottom-4 right-4 w-6 h-6 border-b-4 border-r-4 border-emerald-550 rounded-br-lg z-20" />

                {/* Live scanner tag */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/75 px-3 py-1 rounded-full border border-neutral-800 text-[9px] font-black uppercase tracking-widest text-emerald-400 animate-pulse z-20">
                  {isValidating ? "TRANSACT-HANDSHAKE..." : isRealCameraActive ? "SCANNER DE CAMÉRA ACTIF" : "SCANNER SIMULÉ"}
                </div>
              </div>

              {/* Action Simulation controllers */}
              <div className="p-5 bg-neutral-950 space-y-3">
                <div className="text-center text-xs text-neutral-400 space-y-1">
                  <p className="font-extrabold text-neutral-350">ID Commande : #{scanningOrder.id.slice(-8).toUpperCase()}</p>
                  <p className="text-[10px] text-neutral-500 leading-normal">
                    Assurez-vous que l'administrateur ou le livreur affiche le QR correspondant à cette commande sur son terminal.
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={handlePerformSimulatedScan}
                    disabled={isValidating}
                    className="w-full bg-emerald-550 hover:bg-emerald-600 disabled:bg-neutral-800 text-white font-black text-sm py-3 px-4 rounded-xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isValidating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/80 border-b-transparent"></div>
                        <span>Handshake cryptographique...</span>
                      </>
                    ) : (
                      <>
                        <QrCode className="w-4 h-4 text-emerald-300" />
                        <span>Simuler le Scan du Code QR Admin</span>
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => setScanningOrder(null)}
                    disabled={isValidating}
                    className="w-full bg-neutral-900 border border-neutral-850 hover:bg-neutral-800 text-neutral-450 font-bold text-xs py-2 rounded-xl transition-all"
                  >
                    Fermer l'appareil photo
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RENDER MODAL VIEW 2: SPLENDED SUCCESS CONFETTI CELEBRATION */}
      <AnimatePresence>
        {showSuccess && successOrder && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -10 }}
              className="bg-white rounded-3xl overflow-hidden p-6 shadow-2xl w-full max-w-sm text-center relative space-y-5"
            >
              {/* Decorative design sparkles */}
              <div className="absolute top-4 right-4 text-amber-500 animate-spin">
                <Sparkles className="w-5 h-5" />
              </div>

              {/* Huge animated check badge */}
              <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100 relative">
                <span className="absolute w-full h-full bg-emerald-400/20 rounded-full animate-ping" />
                <CheckCircle2 className="w-12 h-12 text-emerald-500 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <h3 className="font-black text-lg text-gray-900 tracking-tight">Réception Confirmée !</h3>
                <p className="text-[11px] text-gray-500 font-extrabold uppercase tracking-widest text-emerald-650">Handshake validé • DavidSTORE Sécurisé</p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-left space-y-3.5 text-xs">
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 font-bold">
                  <span className="text-gray-400">ID de Transaction</span>
                  <span className="font-mono text-gray-800">#{successOrder.id.slice(-8).toUpperCase()}</span>
                </div>
                
                <div className="flex justify-between items-center pb-2 border-b border-gray-100 font-bold">
                  <span className="text-gray-400">Statut Client</span>
                  <span className="text-emerald-650 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">RÉCEP-LIVRÉ</span>
                </div>

                <div className="flex items-start gap-1.5 text-gray-500 text-[11px] leading-relaxed">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <span>Le jeton de sécurité à usage unique a été consommé. L'historique et l'administration ont été notifiés en temps réel.</span>
                </div>
              </div>

              <button
                onClick={() => { setShowSuccess(false); setSuccessOrder(null); }}
                className="w-full bg-neutral-900 hover:bg-neutral-850 text-white font-extrabold text-xs py-3 rounded-xl shadow-lg transition shadow-neutral-100"
              >
                Fermer & Terminer
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RENDER MODAL VIEW 3: SHOW QR TO DELIVERER */}
      <AnimatePresence>
        {showingQRForOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
             <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] overflow-hidden p-8 shadow-2xl w-full max-w-sm text-center space-y-6"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full">Pass de Livraison DavidSTORE</span>
                <button onClick={() => setShowingQRForOrder(null)} className="p-1 rounded-full hover:bg-gray-100 transition-colors">
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-2">
                <h3 className="font-black text-xl text-gray-900 leading-tight">Présentez ce Code</h3>
                <p className="text-xs text-gray-500 font-medium px-4">Le livreur doit scanner ce code pour officialiser la réception de votre colis.</p>
              </div>

              <div className="bg-gray-50 p-6 rounded-[2.5rem] border-2 border-dashed border-gray-200 flex items-center justify-center relative">
                 <div className="bg-white p-3 rounded-3xl shadow-sm border border-gray-100">
                    <QRCodeSVG 
                      value={showingQRForOrder.qrToken || showingQRForOrder.id} 
                      size={200} 
                      level="H"
                      className="w-full h-full"
                    />
                 </div>
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white border-4 border-white shadow-lg">
                    <ShieldCheck className="w-5 h-5" />
                 </div>
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-[10px] text-blue-700 font-bold leading-relaxed">
                NE PARTAGEZ PAS : Ce code est unique à votre commande #{showingQRForOrder.id.slice(-6).toUpperCase()} et garantit la sécurité de votre achat.
              </div>

              <button
                onClick={() => setShowingQRForOrder(null)}
                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-gray-200"
              >
                Fermer
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* RENDER MODAL VIEW 4: NOTER & LAISSER UN AVIS DIRECTLY */}
      <AnimatePresence>
        {reviewOrder && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-[32px] overflow-hidden p-6 shadow-2xl w-full max-w-sm flex flex-col max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500 animate-bounce" />
                  <h3 className="font-extrabold text-base text-gray-900 tracking-tight">Noter mes articles</h3>
                </div>
                <button 
                  onClick={() => setReviewOrder(null)} 
                  className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="text-xs text-gray-500 font-medium mb-4 leading-normal text-left">
                Votre retour est précieux ! Vous pouvez donner une note et écrire un avis sur vos articles commandés.
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-4 py-1">
                {reviewOrder.items.map((item) => {
                  const prod = item.product || { id: 'unknown', name: 'Produit Inconnu', imageUrl: '', category: '' };
                  const isSubmitted = submittedReviews[prod.id];
                  const isSubmitting = isSubmittingReviews[prod.id];
                  const currentRating = reviewRatings[prod.id] || 5;
                  const currentComment = reviewComments[prod.id] || '';

                  return (
                    <div key={prod.id} className="p-3 bg-gray-50 rounded-2xl border border-gray-150 space-y-2.5 text-left">
                      {/* Product identity */}
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={item.imageUrl || prod.imageUrl} 
                          alt={prod.name} 
                          className="w-10 h-10 rounded-lg object-cover border border-gray-200 bg-white" 
                        />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-xs text-gray-800 truncate">{prod.name}</h4>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="text-[9px] text-gray-400 font-bold uppercase">{prod.category.replace('_', ' ')}</span>
                            {item.selectedSize && (
                              <span className="text-[9px] bg-orange-100 text-orange-600 font-extrabold px-1 rounded">
                                T: {item.selectedSize}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isSubmitted ? (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-2.5 text-emerald-800 text-[10px] font-extrabold flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>Avis enregistré avec succès !</span>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {/* Stars selection */}
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500 font-extrabold">Note :</span>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => {
                                  setReviewRatings(prev => ({ ...prev, [prod.id]: star }));
                                }}
                                className="p-0.5 transition-all active:scale-90"
                              >
                                <Star 
                                  className={`w-4 h-4 transition-colors ${
                                    star <= currentRating 
                                      ? 'text-amber-400 fill-amber-400' 
                                      : 'text-gray-300'
                                  }`} 
                                />
                              </button>
                            ))}
                            <span className="text-[10px] font-black text-amber-600 font-mono ml-1">({currentRating}/5)</span>
                          </div>

                          {/* Textarea for review comment */}
                          <textarea
                            value={currentComment}
                            onChange={(e) => {
                              setReviewComments(prev => ({ ...prev, [prod.id]: e.target.value }));
                            }}
                            placeholder="Partagez votre avis sur ce produit..."
                            className="w-full text-xs p-2.5 bg-white border border-gray-250 rounded-xl h-14 outline-none focus:ring-1 focus:ring-orange-400 resize-none font-medium placeholder-gray-400"
                          />

                          {/* Action button */}
                          <button
                            type="button"
                            onClick={() => handleSendReview(prod.id, prod.name)}
                            disabled={isSubmitting}
                            className={`w-full text-[10px] font-black py-2 rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm uppercase active:scale-95 cursor-pointer
                              ${isSubmitting 
                                ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                                : 'bg-orange-500 hover:bg-orange-600 text-white'
                              }`}
                          >
                            {isSubmitting ? (
                              <div className="w-3 h-3 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                            ) : (
                              <Send className="w-3 h-3" />
                            )}
                            <span>{isSubmitting ? "Publication..." : "Envoyer l'avis"}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-3 border-t border-gray-150 mt-3">
                <button
                  onClick={() => setReviewOrder(null)}
                  className="w-full py-3 bg-gray-900 hover:bg-gray-800 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
