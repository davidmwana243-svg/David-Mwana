import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { 
  Search, 
  Filter, 
  Eye, 
  ArrowLeft, 
  MapPin, 
  Phone, 
  User, 
  QrCode, 
  ExternalLink, 
  CheckCircle2, 
  Truck, 
  ShieldAlert, 
  Download, 
  Printer, 
  Compass,
  Clock,
  Map,
  Sparkles,
  Camera, 
  X, 
  ShieldCheck, 
  AlertCircle,
  ThumbsUp,
  Package,
  ShoppingBag,
  Edit
} from 'lucide-react';
import { Button } from '../../components/Button';
import { Order } from '../../models/types';
import { getOrders, updateOrderStatus, confirmQRReceived, updateOrderItemSize } from '../../services/orderService';
import { useNotification } from '../../contexts/NotificationContext';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { formatSafeDate } from '../../utils/dateUtils';
import { QRCodeSVG } from 'qrcode.react';

export const AdminOrdersScreen: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [editingSizeItemIdx, setEditingSizeItemIdx] = useState<number | null>(null);
  const [newSizeValue, setNewSizeValue] = useState('');
  const { showNotification } = useNotification();

  // States for search & filtration
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedProductFilter, setSelectedProductFilter] = useState<string | null>(null);

  // Filtered orders memo
  const filteredOrders = React.useMemo(() => {
    return orders.filter(order => {
      // 1. Status Filter
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }
      
      // 2. Product ID Filter
      if (selectedProductFilter) {
        const hasProduct = order.items?.some(item => item.product?.id === selectedProductFilter);
        if (!hasProduct) return false;
      }
      
      // 3. Search Term Filter
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(term);
        const matchesName = order.userName?.toLowerCase().includes(term);
        const matchesPhone = order.userPhone?.toLowerCase().includes(term);
        const matchesProduct = order.items?.some(item => 
          item.product?.name?.toLowerCase().includes(term) ||
          item.product?.id?.toLowerCase().includes(term)
        );
        
        return matchesId || matchesName || matchesPhone || matchesProduct;
      }
      
      return true;
    });
  }, [orders, statusFilter, selectedProductFilter, searchTerm]);

  // Aggregate active orders' products to prepare
  const activeOrders = React.useMemo(() => {
    return orders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled');
  }, [orders]);

  const productsToPrepare = React.useMemo(() => {
    const counts: { [key: string]: { id: string, name: string, quantity: number, imageUrl?: string, orderCount: number } } = {};
    activeOrders.forEach(order => {
      order.items?.forEach(item => {
        const prod = item.product;
        if (!prod) return;
        const pId = prod.id;
        const key = pId + (item.selectedSize ? '_' + item.selectedSize : '');
        if (!counts[key]) {
          counts[key] = {
            id: pId,
            name: prod.name + (item.selectedSize ? ` (T: ${item.selectedSize})` : ''),
            quantity: 0,
            imageUrl: prod.imageUrl || (prod as any).image || (prod as any).imageUrl,
            orderCount: 0
          };
        }
        counts[key].quantity += item.quantity;
        counts[key].orderCount += 1;
      });
    });
    return Object.values(counts).sort((a, b) => b.quantity - a.quantity);
  }, [activeOrders]);

  // States for the integrated Deliverer Scanner simulator
  const [isScanning, setIsScanning] = useState(false);
  const [isValidatingScan, setIsValidatingScan] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);

  // Real QR Camera scan refs & states for Deliverer
  const adminVideoRef = useRef<HTMLVideoElement | null>(null);
  const adminCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [adminCameraError, setAdminCameraError] = useState<string | null>(null);
  const [isAdminCameraLoading, setIsAdminCameraLoading] = useState(false);
  const [isAdminRealCameraActive, setIsAdminRealCameraActive] = useState(true);

  // Trigger scan success workflow for Admin
  const triggerAdminRealScanSuccess = async (ord: Order, tokenVal: string) => {
    setIsValidatingScan(true);
    try {
      const success = await confirmQRReceived(ord.id, tokenVal);
      if (success) {
        setScanSuccess(true);
        setIsValidatingScan(false);
        setTimeout(() => {
          setIsScanning(false);
          setScanSuccess(false);
          setSelectedOrder(null); // Fermer automatiquement le détail
          showNotification(
            "Colis Livré", 
            `La livraison pour ${ord.userName || 'le client'} a été confirmée avec succès. Inventaire mis à jour.`, 
            'success'
          );
        }, 2200);
      } else {
        showNotification("Signature", "Erreur de signature: Le code QR scanné ne correspond pas à cette commande.", "error");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsValidatingScan(false);
    }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let animationFrameId: number;

    const startCamera = async () => {
      if (!isScanning || !selectedOrder || !isAdminRealCameraActive) return;
      setIsAdminCameraLoading(true);
      setAdminCameraError(null);
      try {
        const constraints = {
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 640 } }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (adminVideoRef.current) {
          adminVideoRef.current.srcObject = stream;
          adminVideoRef.current.setAttribute('playsinline', 'true');
          await adminVideoRef.current.play();
          setIsAdminCameraLoading(false);
          tick();
        }
      } catch (err: any) {
        console.warn("Admin camera permission error:", err);
        setAdminCameraError("Impossible d'accéder à l'appareil photo d'administration.");
        setIsAdminCameraLoading(false);
        setIsAdminRealCameraActive(false);
      }
    };

    const tick = () => {
      if (!adminVideoRef.current || !adminCanvasRef.current || !isScanning || !selectedOrder) return;
      const video = adminVideoRef.current;
      const canvas = adminCanvasRef.current;
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
            if (decodedToken === selectedOrder.qrToken) {
              playScanBeep();
              triggerAdminRealScanSuccess(selectedOrder, decodedToken);
              return;
            }
          } catch (e) {
            if (code.data === selectedOrder.qrToken) {
              playScanBeep();
              triggerAdminRealScanSuccess(selectedOrder, code.data);
              return;
            }
          }
        }
      }
      animationFrameId = requestAnimationFrame(tick);
    };

    if (isScanning && isAdminRealCameraActive) {
      startCamera();
    } else {
      setIsAdminCameraLoading(false);
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      cancelAnimationFrame(animationFrameId);
    };
  }, [isScanning, isAdminRealCameraActive, selectedOrder?.id]);

  const lastOrderCountRef = useRef<number>(0);

  useEffect(() => {
    const ordersCol = collection(db, 'orders');
    const q = query(ordersCol, orderBy('createdAt', 'desc'));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const fetched: Order[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push(docSnap.data() as Order);
      });

      // Notify admin of NEW orders
      if (!isLoading && fetched.length > lastOrderCountRef.current) {
        const newOrder = fetched[0];
        if (newOrder.status === 'payment_pending') {
          showNotification(
            "Nouvelle Commande !", 
            `Client: ${newOrder.userName} - ${newOrder.total} FC`, 
            'success'
          );
          // Sound alert
          playNotificationSound();
        }
      }
      
      lastOrderCountRef.current = fetched.length;
      setOrders(fetched);
      setIsLoading(false);

      if (selectedOrder) {
        const matchingCurrent = fetched.find(o => o.id === selectedOrder.id);
        if (matchingCurrent) {
          setSelectedOrder(matchingCurrent);
        }
      }
    }, (error) => {
      console.error("Synchro Firebase en panne :", error);
      setIsLoading(false);
    });

    return () => unsub();
  }, [selectedOrder?.id]);

  const playNotificationSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // High pitch A5
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5); // Slide down to A4
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.1);
      gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
      setTimeout(() => audioCtx.close(), 1000);
    } catch (e) {
      console.warn("Exception audio alert ignored", e);
    }
  };

  const playScanBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(1000, audioCtx.currentTime);
      gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 120);
    } catch (e) {
      console.warn("Exception audio beep ignored", e);
    }
  };

  const handleConfirmPayment = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'processing');
      showNotification("Paiement Confirmé", "La commande est maintenant en cours de traitement.", "success");
    } catch (err) {
      console.error(err);
      showNotification("Erreur", "Erreur lors de la confirmation du paiement.", "error");
    }
  };

  const handleShipOrder = async (orderId: string) => {
    try {
      await updateOrderStatus(orderId, 'shipped');
      showNotification("Commande Expédiée", "Le colis a été mis en livraison avec succès.", "success");
    } catch (err) {
      console.error(err);
      showNotification("Erreur", "Erreur lors de la mise en livraison.", "error");
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette commande ?")) return;
    try {
      await updateOrderStatus(orderId, 'cancelled');
      showNotification("Commande Annulée", "La commande a été annulée avec succès.", "success");
    } catch (err) {
      console.error(err);
      showNotification("Erreur", "Erreur lors de l'annulation de la commande.", "error");
    }
  };

  const getStatusStyle = (status: string) => {
    switch(status) {
      case 'payment_pending': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'delivered': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'processing': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'cancelled': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'payment_pending': return 'Attente Code PIN';
      case 'delivered': return 'Livré';
      case 'processing': return 'En traitement';
      case 'shipped': return 'En livraison (Expédiée)';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const handleOpenInGoogleMaps = (lat?: number, lng?: number) => {
    if (!lat || !lng) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const copyTokenToClipboard = (token?: string) => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleSimulatedAdminScan = async () => {
    if (!selectedOrder) return;
    setIsScanning(true);
    setScanSuccess(false);
    setIsValidatingScan(false);
    setTimeout(async () => {
      // Execute local verification flow for deliverers screen
    }, 1500);
  };

  const renderMockupQRCode = (payload: string) => {
    return (
      <div className="flex flex-col items-center p-5 bg-white border border-gray-100 rounded-3xl shadow-sm max-w-xs mx-auto">
        <div className="relative">
          <div className="bg-white p-2 rounded-xl shadow-xs border border-gray-100">
            <QRCodeSVG 
              value={payload} 
              size={180} 
              level="H" 
              includeMargin={false}
              className="w-full h-full"
            />
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shadow-md border-2 border-white z-10">
            <QrCode className="w-5 h-5" />
          </div>
        </div>
        
        <div className="mt-4 text-center space-y-1.5 w-full">
          <div 
            onClick={() => copyTokenToClipboard(payload)}
            className="text-[10px] text-gray-500 font-mono tracking-wider truncate max-w-[220px] block px-3 py-1.5 bg-gray-50 rounded-lg mx-auto border border-gray-100/50 cursor-pointer hover:bg-gray-100 active:scale-95 transition-all"
          >
            {copiedToken ? "COPIÉ !" : `${payload.slice(0, 36)}...`}
          </div>
          <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest px-4">
            Demandez au client de scanner ce code pour confirmer la réception
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full space-y-6 bg-gray-50/20 p-4 rounded-2xl min-h-[90dvh]">
      <div className="flex items-center justify-between border-b border-gray-100 pb-4">
        {selectedOrder ? (
          <div className="flex items-center gap-3">
            <button onClick={() => setSelectedOrder(null)} className="p-2 hover:bg-white rounded-full transition-transform active:scale-90 border border-gray-100 shadow-xs cursor-pointer">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">DavidSTORE Security Portal</span>
                <span className="text-xs font-mono text-gray-400 font-medium">#{selectedOrder.id.slice(-8).toUpperCase()}</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900 mt-0.5">Détails de Livraison</h2>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">LOGISTIQUE & LIVRAISONS</h2>
            <p className="text-gray-500 text-xs mt-0.5 uppercase tracking-wider font-semibold opacity-75">Suivi des colis et confirmations sécurisées QR</p>
          </div>
        )}
      </div>

      {selectedOrder ? (
         <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
           <div className="lg:col-span-7 flex flex-col gap-5">
             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
               <div className="flex justify-between items-start">
                 <div>
                   <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest block mb-1">Détails du Destinataire</span>
                   <h3 className="text-lg font-black text-gray-800 flex items-center gap-1.5">
                     <User className="w-5 h-5 text-blue-600" />
                     {selectedOrder.userName || 'Client'}
                   </h3>
                   <div className="mt-4 pt-4 border-t border-gray-50 flex flex-col gap-2">
                     <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest block">Articles Commandés</span>
                     {selectedOrder.items.map((item, idx) => (
                       <div key={item.product.id + idx} className="bg-gray-50 p-2.5 rounded-xl border border-gray-100 flex items-center justify-between">
                         <div className="flex items-center gap-3">
                           <div className="w-8 h-8 bg-white rounded border border-gray-100 flex items-center justify-center overflow-hidden shrink-0">
                             {item.product.image || item.product.imageUrl ? (
                               <img src={item.product.image || item.product.imageUrl} referrerPolicy="no-referrer" alt="" className="w-full h-full object-cover" />
                             ) : (
                               <Sparkles className="w-3 h-3 text-blue-200" />
                             )}
                           </div>
                           <div className="truncate">
                             <p className="text-xs font-black text-gray-800 leading-tight truncate">{item.product.name}</p>
                             <div className="flex items-center gap-2 mt-0.5">
                               {item.selectedSize ? (
                                 <span className="text-[10px] text-orange-600 font-extrabold">Taille: {item.selectedSize}</span>
                               ) : (
                                 <span className="text-[9px] text-gray-400 font-medium italic">Sans taille</span>
                               )}
                               <button
                                 type="button"
                                 onClick={() => {
                                   setEditingSizeItemIdx(idx);
                                   setNewSizeValue(item.selectedSize || '');
                                 }}
                                 className="text-[10px] text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-0.5 cursor-pointer font-sans"
                               >
                                 <Edit className="w-2.5 h-2.5" />
                                 <span>Modifier</span>
                               </button>
                             </div>
                           </div>
                         </div>
                         <div className="shrink-0 text-right">
                           <span className="text-xs font-black text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg">x{item.quantity}</span>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>

                 <div>
                   {selectedOrder.status === 'payment_pending' && (
                     <button
                       onClick={() => handleConfirmPayment(selectedOrder.id)}
                       className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 shadow-sm flex items-center gap-1.5 cursor-pointer"
                     >
                       <ShieldCheck className="w-3.5 h-3.5 text-emerald-200" />
                       <span>Confirmer Paiement</span>
                     </button>
                   )}
                   {selectedOrder.status === 'processing' && (
                     <div className="flex flex-col gap-2">
                       <button
                         onClick={() => handleShipOrder(selectedOrder.id)}
                         className="text-[10px] bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 shadow-sm flex items-center gap-1.5 cursor-pointer"
                       >
                         <Truck className="w-3.5 h-3.5 text-blue-200" />
                         <span>Confirmer l'expédition</span>
                       </button>
                       <button
                         onClick={() => handleCancelOrder(selectedOrder.id)}
                         className="text-[10px] bg-red-50 text-red-600 hover:bg-red-100 font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 border border-red-100 flex items-center gap-1 cursor-pointer"
                       >
                         <X className="w-3 h-3 text-red-600" />
                         <span>Annuler la commande</span>
                       </button>
                     </div>
                   )}
                   {selectedOrder.status !== 'payment_pending' && selectedOrder.status !== 'processing' && selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (
                     <button
                       onClick={() => handleCancelOrder(selectedOrder.id)}
                       className="text-[10px] bg-red-50 text-red-600 hover:bg-red-100 font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 border border-red-100 flex items-center gap-1 cursor-pointer"
                     >
                       <X className="w-3 h-3 text-red-600" />
                       <span>Annuler la commande</span>
                     </button>
                   )}
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-50 text-sm">
                 <div className="flex items-center gap-2.5 text-gray-600">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                      <Phone className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Numéro de Téléphone</p>
                      <p className="font-extrabold text-gray-800">{selectedOrder.userPhone || 'Numéro non renseigné'}</p>
                    </div>
                 </div>
                 <div className="flex items-center gap-2.5 text-gray-600">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100">
                      <Clock className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold uppercase">Créée le</p>
                      <p className="font-extrabold text-gray-800">{formatSafeDate(selectedOrder.createdAt)}</p>
                    </div>
                 </div>
               </div>
               <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                 <div className="flex items-start gap-2">
                   <MapPin className="w-4.5 h-4.5 text-orange-500 shrink-0 mt-0.5" />
                   <div className="text-xs">
                     <p className="font-extrabold text-gray-700">Adresse Complète enregistrée :</p>
                     <p className="text-gray-500 mt-1 leading-relaxed">{selectedOrder.shippingAddress}</p>
                   </div>
                 </div>
               </div>
             </div>

             <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4 flex-1 min-h-[300px] flex flex-col">
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <Map className="w-5 h-5 text-blue-600" />
                   <h4 className="font-black text-sm text-gray-800 uppercase tracking-widest">Géolocalisation</h4>
                 </div>
                 <button onClick={() => handleOpenInGoogleMaps(selectedOrder.shippingAddressObj?.latitude, selectedOrder.shippingAddressObj?.longitude)} className="px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-600 text-xs font-bold border border-blue-100 flex items-center gap-1 active:scale-95 transition-all cursor-pointer">
                   <ExternalLink className="w-3.5 h-3.5" />
                   <span>Maps</span>
                 </button>
               </div>
               <div className="relative flex-1 rounded-xl bg-slate-100 overflow-hidden border border-gray-200 min-h-[260px]">
                 {selectedOrder.shippingAddressObj?.latitude && selectedOrder.shippingAddressObj?.longitude ? (
                   <iframe title="Map" src={`https://maps.google.com/maps?q=${selectedOrder.shippingAddressObj.latitude},${selectedOrder.shippingAddressObj.longitude}&z=16&output=embed`} className="w-full h-full border-0 absolute inset-0" allowFullScreen loading="lazy" referrerPolicy="no-referrer" />
                 ) : (
                   <div className="flex items-center justify-center h-full text-gray-400 text-xs font-bold uppercase">Carte indisponible</div>
                 )}
               </div>
             </div>
           </div>

           <div className="lg:col-span-12 xl:col-span-5 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col justify-between space-y-6">
             <div className="space-y-4 text-center">
               <QrCode className="w-10 h-10 text-blue-600 mx-auto" />
               <h4 className="font-extrabold text-sm text-gray-800 uppercase">Code de Livraison QR</h4>
               {renderMockupQRCode(selectedOrder.qrToken || selectedOrder.id)}
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Une seule utilisation • Sécurité AES-256</p>
             </div>

             {selectedOrder.status === 'delivered' ? (
               <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl space-y-1 text-center">
                 <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
                 <h5 className="font-black text-xs uppercase tracking-widest">LIVRÉ & SIGNÉ</h5>
                 <p className="text-[10px] opacity-75">Validation cryptographique effectuée avec succès.</p>
               </div>
             ) : selectedOrder.status === 'cancelled' ? (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl space-y-1 text-center">
                  <X className="w-6 h-6 text-red-600 mx-auto mb-1" />
                  <h5 className="font-black text-xs uppercase tracking-widest">COMMANDE ANNULÉE</h5>
                  <p className="text-[10px] opacity-75">Cette livraison a été annulée par l'administration.</p>
                </div>
             ) : (
               <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl space-y-4">
                 <div className="flex items-center gap-2 justify-center">
                   <Truck className="w-5 h-5 animate-bounce" />
                   <h5 className="font-black text-xs uppercase tracking-widest">LIVRAISON EN COURS</h5>
                 </div>
                 <button onClick={handleSimulatedAdminScan} className="w-full bg-blue-600 text-white font-black text-xs py-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer">
                   <Camera className="w-4 h-4" />
                   <span>SIMULER SCAN (TEST)</span>
                 </button>
               </div>
             )}
           </div>
         </div>
       ) : (
        <div className="space-y-6 flex-1 flex flex-col">
          {/* RÉCAPITULATIF DE PRÉPARATION (PRODUITS REQUIS) */}
          {productsToPrepare.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-gray-50 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-orange-50 rounded-lg border border-orange-100 font-bold">
                    <Package className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs tracking-wider text-gray-800 uppercase">Articles à préparer (En cours)</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">Calculé sur {activeOrders.length} {activeOrders.length > 1 ? 'commandes actives' : 'commande active'}</p>
                  </div>
                </div>
                {selectedProductFilter && (
                  <button 
                    onClick={() => setSelectedProductFilter(null)}
                    className="text-[10px] font-black uppercase text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg border border-red-100 flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>Tout afficher</span>
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {productsToPrepare.map((item) => {
                  const isSelected = selectedProductFilter === item.id;
                  return (
                    <div 
                      key={item.id}
                      onClick={() => setSelectedProductFilter(isSelected ? null : item.id)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 select-none active:scale-95 ${
                        isSelected 
                          ? 'bg-orange-500/10 border-orange-500 ring-2 ring-orange-500/20 shadow-xs' 
                          : 'bg-gray-50/50 hover:bg-white hover:shadow-xs border-gray-100 hover:border-gray-200'
                      }`}
                      title={isSelected ? "Cliquez pour désélectionner" : "Cliquez pour filtrer les commandes avec ce produit"}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-gray-100 bg-white flex items-center justify-center shrink-0">
                          {item.imageUrl ? (
                            <img src={item.imageUrl} referrerPolicy="no-referrer" alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-black text-gray-800 truncate leading-tight">{item.name}</p>
                          <p className={`text-[9px] font-bold mt-0.5 ${isSelected ? 'text-orange-600' : 'text-gray-400'}`}>
                            {item.orderCount} {item.orderCount > 1 ? 'commandes' : 'commande'}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <span className={`text-xs font-black px-2 py-1 rounded-lg ${
                          isSelected ? 'bg-orange-600 text-white shadow-xs' : 'bg-orange-100 text-orange-700 border border-orange-200'
                        }`}>
                          x{item.quantity}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TABLEAU DES COMMANDES */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
            <div className="p-4 border-b border-gray-100 flex flex-col lg:flex-row gap-4 bg-gray-50/50 justify-between items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher par ID commande, nom client, téléphone ou article..." 
                  className="w-full pl-10 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-xs" 
                />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 whitespace-nowrap cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="flex flex-wrap gap-1.5 w-full lg:w-auto overflow-x-auto pb-1 lg:pb-0">
                {[
                  { value: 'all', label: 'Toutes' },
                  { value: 'payment_pending', label: 'Attente PIN' },
                  { value: 'processing', label: 'En traitement' },
                  { value: 'shipped', label: 'En livraison' },
                  { value: 'delivered', label: 'Livrées' },
                  { value: 'cancelled', label: 'Annulées' }
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => setStatusFilter(tab.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all border active:scale-95 cursor-pointer ${
                      statusFilter === tab.value
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {selectedProductFilter && (
              <div className="px-4 py-2 bg-orange-50 border-b border-orange-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-ping" />
                  <span className="text-xs text-orange-850 font-bold">
                    Affichage des commandes contenant : <strong className="font-black text-orange-950">
                      {productsToPrepare.find(p => p.id === selectedProductFilter)?.name || 'le produit sélectionné'}
                    </strong>
                  </span>
                </div>
                <button 
                  onClick={() => setSelectedProductFilter(null)} 
                  className="text-[10px] uppercase font-black text-orange-650 hover:text-orange-850 flex items-center gap-1 bg-white px-2 py-1 rounded-md border border-orange-200 shadow-3xs hover:scale-95 transition-all cursor-pointer"
                >
                  Tout voir
                </button>
              </div>
            )}

            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-[10px] uppercase font-black tracking-widest text-gray-500 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4">ID</th>
                    <th className="px-6 py-4">Client</th>
                    <th className="px-6 py-4">Produits Commandés</th>
                    <th className="px-6 py-4 text-right">Total</th>
                    <th className="px-6 py-4 text-center">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    <tr><td colSpan={6} className="p-12 text-center text-gray-400 animate-pulse text-xs font-bold uppercase tracking-widest">Chargement...</td></tr>
                  ) : filteredOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-12 text-center text-gray-400 text-xs font-bold uppercase">
                        Aucune commande ne correspond aux filtres
                      </td>
                    </tr>
                  ) : (
                    filteredOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-gray-800">#{order.id.slice(-6).toUpperCase()}</td>
                        <td className="px-6 py-4">
                          <div className="font-extrabold text-gray-800">{order.userName || 'Client'}</div>
                          <div className="text-[10px] text-gray-400">{order.userPhone || 'Pas de numéro'}</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1.5 max-w-xs xl:max-w-md">
                            {order.items?.map((item, idx) => (
                              <div key={idx} className="flex items-center gap-2 text-xs text-gray-700 bg-gray-50/80 px-2 py-1.5 rounded-lg border border-gray-100/50">
                                <div className="w-5 h-5 rounded overflow-hidden bg-white border border-gray-100 flex items-center justify-center shrink-0">
                                  {item.product?.imageUrl || (item.product as any)?.image ? (
                                    <img src={item.product?.imageUrl || (item.product as any)?.image} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <Sparkles className="w-2.5 h-2.5 text-blue-300" />
                                  )}
                                </div>
                                <span className="font-black text-blue-600 bg-blue-100/60 px-1 py-0.2 rounded text-[10px]">x{item.quantity}</span>
                                <span className="truncate font-semibold text-gray-850 flex items-center gap-1.5">
                                 <span>{item.product?.name}</span>
                                 {item.selectedSize && (
                                   <span className="text-[9px] bg-orange-100 text-orange-600 font-extrabold px-1 py-0.5 rounded mr-1">
                                     T: {item.selectedSize}
                                   </span>
                                 )}
                               </span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 font-black text-gray-950 text-right">
                          {(order.total || 0).toLocaleString()} FC
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${getStatusStyle(order.status)}`}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {order.status === 'payment_pending' && (
                              <>
                                <button onClick={() => handleConfirmPayment(order.id)} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 hover:bg-emerald-100 transition-colors cursor-pointer" title="Confirmer paiement">
                                  <ShieldCheck className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleCancelOrder(order.id)} className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-100 transition-colors cursor-pointer" title="Annuler commande">
                                  <X className="w-4 h-4 text-red-650" />
                                </button>
                              </>
                            )}
                             {order.status === 'processing' && (
                               <>
                                 <button onClick={() => handleShipOrder(order.id)} className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer" title="Confirmer l'expédition">
                                   <Truck className="w-4 h-4 text-blue-600" />
                                 </button>
                                 <button onClick={() => handleCancelOrder(order.id)} className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-100 transition-colors cursor-pointer" title="Annuler commande">
                                   <X className="w-4 h-4 text-red-600 cursor-pointer" />
                                 </button>
                               </>
                             )}
                             {order.status !== 'delivered' && order.status !== 'cancelled' && order.status !== 'payment_pending' && order.status !== 'processing' && (
                               <button onClick={() => handleCancelOrder(order.id)} className="p-2 bg-red-50 text-red-600 rounded-lg border border-red-100 hover:bg-red-100 transition-colors cursor-pointer" title="Annuler livraison">
                                 <X className="w-4 h-4 cursor-pointer" />
                               </button>
                             )}
                            <button onClick={() => setSelectedOrder(order)} className="p-2 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer" title="Voir code QR & Détails de livraison">
                              <QrCode className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
       )}

      {/* Scanner Modal */}
      {isScanning && selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 rounded-[32px] overflow-hidden border border-slate-800 shadow-2xl p-6">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-white font-black text-xs uppercase tracking-widest text-orange-500">Scanner Honeywell v4</h3>
               <button onClick={() => setIsScanning(false)} className="text-slate-500 hover:text-white transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
            <div className="aspect-square bg-black rounded-2xl relative flex items-center justify-center overflow-hidden border-2 border-slate-800">
               {isAdminRealCameraActive && !scanSuccess && (
                 <>
                   <video 
                     ref={adminVideoRef} 
                     className="absolute inset-0 w-full h-full object-cover"
                     muted 
                     playsInline
                   />
                   <canvas ref={adminCanvasRef} className="hidden" />
                 </>
               )}
               {scanSuccess ? (
                 <div className="absolute inset-0 bg-emerald-950 flex flex-col items-center justify-center text-center p-6">
                    <CheckCircle2 className="w-12 h-12 text-emerald-400 mb-2 animate-bounce" />
                    <h4 className="text-emerald-300 font-black text-sm uppercase">Signature Validée</h4>
                 </div>
               ) : (
                 <>
                   <Camera className="w-10 h-10 text-orange-500/20" />
                   <div className="absolute inset-0 border-2 border-orange-500/30 rounded-2xl m-8"></div>
                   <div className="absolute inset-x-8 top-1/2 h-0.5 bg-orange-500 animate-[bounce_2s_infinite]"></div>
                   <div className="absolute bottom-6 bg-black/60 px-4 py-1.5 rounded-full text-[10px] font-black text-orange-400 uppercase tracking-widest animate-pulse">Scanning...</div>
                 </>
               )}
            </div>
          </div>
        </div>
      )}

      {/* Size Edit Modal */}
      {editingSizeItemIdx !== null && selectedOrder && (
        <div className="fixed inset-0 z-[100] bg-gray-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative border border-gray-100 animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => setEditingSizeItemIdx(null)} 
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-sm font-black text-gray-950 uppercase tracking-wider mb-2">Modifier la Taille</h3>
            <p className="text-xs text-gray-500 mb-4 font-sans leading-relaxed">
              Produit: <strong className="text-gray-800 font-bold">{selectedOrder.items[editingSizeItemIdx]?.product?.name || "Produit"}</strong>
            </p>
            
            <div className="space-y-4 mb-5">
              <div>
                <label className="block text-[10px] text-gray-400 uppercase font-black tracking-widest mb-1.5 font-sans">Saisir ou choisir la taille</label>
                <input
                  type="text"
                  placeholder="Ex: M, XL, 39, 42, etc."
                  value={newSizeValue}
                  onChange={(e) => setNewSizeValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-250 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 font-sans"
                  autoFocus
                />
              </div>

              {/* Suggestions */}
              <div>
                <span className="block text-[9px] text-gray-400 uppercase font-black tracking-wider mb-1.5 font-sans">Suggestions rapides</span>
                <div className="flex flex-wrap gap-1.5 flex-row">
                  {['S', 'M', 'L', 'XL', 'XXL', '38', '39', '40', '41', '42', '43', '44', '45'].map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => setNewSizeValue(sz)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        newSizeValue === sz 
                          ? 'border-orange-500 bg-orange-500 text-white' 
                          : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2.5">
              <Button
                variant="outline"
                className="px-4 py-2 text-xs font-bold font-sans"
                onClick={() => setEditingSizeItemIdx(null)}
              >
                Annuler
              </Button>
              <Button
                className="px-4 py-2 text-xs font-bold font-sans"
                onClick={async () => {
                  try {
                    await updateOrderItemSize(selectedOrder.id, editingSizeItemIdx, newSizeValue);
                    setEditingSizeItemIdx(null);
                    showNotification("Modification Réussie", "La taille a été mise à jour avec succès.", "success");
                  } catch (err: any) {
                    showNotification("Erreur", err.message || "Impossible de modifier la taille", "error");
                  }
                }}
              >
                Valider
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
