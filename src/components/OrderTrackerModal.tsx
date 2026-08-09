import React, { useState } from 'react';
import { 
  X, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  QrCode, 
  Key, 
  ShieldCheck, 
  Copy, 
  Check, 
  RefreshCw,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { Order } from '../types';
import { 
  TRACKING_STEPS, 
  getStepIndexByStatus, 
  getStepDetails 
} from '../utils/orderTracking';
import { formatSafeDate } from '../utils/dateUtils';
import { QRCodeSVG } from 'qrcode.react';
import { generateDeliveryQRPayload } from '../utils/deliveryCrypto';
import { confirmQRReceived } from '../services/orderService';
import { useNotification } from '../context/NotificationContext';

interface OrderTrackerModalProps {
  order: Order;
  onClose: () => void;
  onOrderUpdated?: () => void;
}

export const OrderTrackerModal: React.FC<OrderTrackerModalProps> = ({
  order,
  onClose,
  onOrderUpdated
}) => {
  const [copiedPin, setCopiedPin] = useState(false);
  const [showFullQR, setShowFullQR] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const { showNotification } = useNotification();

  const currentStepIndex = getStepIndexByStatus(order.status);
  const currentStep = getStepDetails(order.status);

  // Generate QR payload
  const { payloadObj, jsonString } = generateDeliveryQRPayload(
    order,
    order.driverId || '',
    order.userId || ''
  );

  const deliveryPin = order.deliveryPin || order.secureToken || payloadObj.secureToken;

  const handleCopyPin = () => {
    navigator.clipboard.writeText(deliveryPin);
    setCopiedPin(true);
    setTimeout(() => setCopiedPin(false), 2000);
  };

  const handleConfirmReceipt = async () => {
    if (!window.confirm("Êtes-vous sûr d'avoir reçu votre commande ?")) return;
    setIsConfirming(true);
    try {
      const res = await confirmQRReceived(order.id, deliveryPin, {
        confirmedBy: order.userId || 'client'
      });
      if (res.success) {
        showNotification(
          "Livraison Confirmée",
          "Merci d'avoir confirmé la réception de votre commande !",
          "success"
        );
        if (onOrderUpdated) onOrderUpdated();
      } else {
        showNotification("Erreur Confirmation", res.message, "error");
      }
    } catch (err) {
      showNotification("Erreur", "Impossible de confirmer la réception.", "error");
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto border border-gray-100 flex flex-col">
        
        {/* Modal Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-gray-100 flex justify-between items-center z-10">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 text-base">Suivi de Commande en Direct</h3>
              <p className="text-xs text-gray-400 font-mono font-bold">#{order.id.slice(-8).toUpperCase()}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          
          {/* Current Status Banner */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="absolute right-[-20px] top-[-20px] opacity-10 pointer-events-none">
              <Truck className="w-48 h-48 text-white" />
            </div>
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-200 bg-white/10 px-2.5 py-0.5 rounded-full backdrop-blur-sm">
                  Statut Actuel
                </span>
                <h4 className="text-xl font-black mt-1 flex items-center gap-2">
                  <span>{currentStep.emoji}</span>
                  <span>{currentStep.title}</span>
                </h4>
                <p className="text-xs text-blue-100 mt-1">{currentStep.description}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider block">Temps Estimé</span>
                <span className="text-sm font-black text-white bg-white/20 px-3 py-1 rounded-xl backdrop-blur-sm mt-0.5 inline-block">
                  ⏱️ {order.estimatedDeliveryTime || currentStep.defaultEstimatedTime}
                </span>
              </div>
            </div>
          </div>

          {/* 6-Step Progress Visualizer */}
          <div className="bg-gray-50/80 p-5 rounded-2xl border border-gray-100 space-y-4">
            <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <span>📊 Progression de la livraison</span>
            </h4>

            {/* Stepper Timeline */}
            <div className="relative pt-2 pb-1">
              <div className="grid grid-cols-6 gap-1 relative z-10 text-center">
                {TRACKING_STEPS.map((s) => {
                  const isDone = s.step < currentStepIndex;
                  const isCurrent = s.step === currentStepIndex;

                  return (
                    <div key={s.step} className="flex flex-col items-center space-y-2">
                      <div 
                        className={`w-9 h-9 rounded-2xl flex items-center justify-center font-black text-xs transition-all duration-300 shadow-sm ${
                          isDone 
                            ? 'bg-emerald-500 text-white' 
                            : isCurrent 
                            ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-110 animate-pulse' 
                            : 'bg-white text-gray-300 border border-gray-200'
                        }`}
                      >
                        {isDone ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <span>{s.step}</span>
                        )}
                      </div>
                      <span className={`text-[10px] leading-tight font-bold transition-colors ${
                        isCurrent ? 'text-blue-600 font-black' : isDone ? 'text-gray-700' : 'text-gray-300'
                      }`}>
                        {s.title.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Connecting Progress Line */}
              <div className="absolute top-[26px] left-[8%] right-[8%] h-1 bg-gray-200 -z-0 rounded-full">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, Math.max(0, ((currentStepIndex - 1) / 5) * 100))}%`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Delivery & Driver Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Delivery Address */}
            <div className="p-4 bg-gray-50/60 rounded-2xl border border-gray-100 space-y-2">
              <div className="flex items-center space-x-2 text-gray-500">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Adresse de Livraison</span>
              </div>
              <p className="text-xs font-bold text-gray-800 leading-relaxed">
                {order.shippingAddress}
              </p>
            </div>

            {/* Driver Info */}
            <div className="p-4 bg-gray-50/60 rounded-2xl border border-gray-100 space-y-2">
              <div className="flex items-center space-x-2 text-gray-500">
                <User className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Livreur Assigné</span>
              </div>
              <p className="text-xs font-bold text-gray-800">
                {order.driverName || 'Partenaire DavidSTORE'}
              </p>
              <div className="flex items-center text-xs font-bold text-blue-600">
                <Phone className="w-3.5 h-3.5 mr-1" />
                <a href={`tel:${order.driverPhone || '+243971234567'}`} className="hover:underline">
                  {order.driverPhone || '+243 97 123 45 67'}
                </a>
              </div>
            </div>

          </div>

          {/* QR Code & PIN Security Box (Active during shipping/delivery) */}
          {(currentStepIndex === 4 || currentStepIndex === 5 || currentStepIndex === 6) && (
            <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-4 shadow-xl">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                    Validation Sécurisée de Livraison
                  </span>
                </div>
                {order.deliveryConfirmed && (
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-2.5 py-0.5 rounded-full border border-emerald-500/30 uppercase">
                    ✅ Livré & Confimé
                  </span>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-5">
                
                {/* QR Code SVG */}
                <div 
                  onClick={() => setShowFullQR(!showFullQR)} 
                  className="bg-white p-3 rounded-2xl cursor-pointer hover:scale-105 transition-transform shadow-md shrink-0 group relative"
                  title="Cliquez pour agrandir"
                >
                  <QRCodeSVG value={jsonString} size={110} level="M" />
                  <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity">
                    Agrandir
                  </div>
                </div>

                {/* Secret PIN display */}
                <div className="space-y-2 flex-1 text-center sm:text-left">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                    Code PIN de Validation
                  </span>
                  <div className="flex items-center justify-center sm:justify-start space-x-2">
                    <span className="font-mono text-xl font-black tracking-widest text-emerald-400 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700">
                      {deliveryPin}
                    </span>
                    <button
                      onClick={handleCopyPin}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-slate-300 transition-colors"
                      title="Copier le code PIN"
                    >
                      {copiedPin ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-tight">
                    Présentez le QR Code ou communiquez le code PIN au livreur à l'arrivée.
                  </p>
                </div>
              </div>

              {/* Confirmation CTA button */}
              {!order.deliveryConfirmed && (
                <button
                  onClick={handleConfirmReceipt}
                  disabled={isConfirming}
                  className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-colors shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  {isConfirming ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  <span>Confirmer la Réception de mon Colis</span>
                </button>
              )}
            </div>
          )}

          {/* Status History Audit Trail */}
          {Array.isArray(order.statusHistory) && order.statusHistory.length > 0 && (
            <div className="space-y-3 pt-2">
              <h4 className="text-xs font-black text-gray-500 uppercase tracking-wider">
                Historique des Changements de Statut
              </h4>
              <div className="space-y-2 border-l-2 border-gray-100 pl-4 ml-2">
                {order.statusHistory.slice().reverse().map((h: any, idx: number) => (
                  <div key={idx} className="relative text-xs space-y-0.5">
                    <div className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-blue-600 ring-4 ring-white" />
                    <span className="font-black text-gray-800">{h.label || h.status}</span>
                    <span className="text-[10px] text-gray-400 block font-mono">
                      {formatSafeDate(h.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
