import { formatSafeDate } from './dateUtils';

export interface TrackingStep {
  step: number;
  key: string;
  title: string;
  bannerTitle: string;
  emoji: string;
  description: string;
  defaultEstimatedTime: string;
}

export const TRACKING_STEPS: TrackingStep[] = [
  {
    step: 1,
    key: 'received',
    title: 'Commande reçue',
    bannerTitle: '🔔 DAVIDSTORE',
    emoji: '🟡',
    description: 'Votre commande a été reçue.',
    defaultEstimatedTime: '—'
  },
  {
    step: 2,
    key: 'paid',
    title: 'Paiement confirmé',
    bannerTitle: '✅ Paiement confirmé !',
    emoji: '🟢',
    description: 'Merci, votre paiement a été validé.',
    defaultEstimatedTime: '30 – 45 min'
  },
  {
    step: 3,
    key: 'processing',
    title: 'Préparation en cours',
    bannerTitle: '📦 Préparation en cours',
    emoji: '🔵',
    description: 'Nous préparons votre commande.',
    defaultEstimatedTime: '25 – 35 min'
  },
  {
    step: 4,
    key: 'shipped',
    title: 'Livreur en route',
    bannerTitle: '🚚 Livreur en route',
    emoji: '🚚',
    description: 'Votre commande est en route.',
    defaultEstimatedTime: '10 – 15 min'
  },
  {
    step: 5,
    key: 'driver_nearby',
    title: 'Livreur proche',
    bannerTitle: '📍 Livreur proche',
    emoji: '📍',
    description: 'Votre livreur est proche de votre adresse.',
    defaultEstimatedTime: '2 – 3 min'
  },
  {
    step: 6,
    key: 'delivered',
    title: 'Livraison terminée',
    bannerTitle: '🎉 Livraison confirmée',
    emoji: '✅',
    description: 'Votre commande a été livrée avec succès !',
    defaultEstimatedTime: 'Livrée'
  }
];

export function getStepIndexByStatus(status: string): number {
  const normalized = (status || '').toLowerCase().trim();
  if (['pending', 'received', 'payment_pending', 'reçue', 'recue'].includes(normalized)) return 1;
  if (['paid', 'payment_confirmed', 'confirmed', 'payée', 'payee'].includes(normalized)) return 2;
  if (['processing', 'preparing', 'en_cours', 'preparation', 'préparation'].includes(normalized)) return 3;
  if (['shipped', 'in_transit', 'delivering', 'en_route', 'expedie', 'expédiée', 'expediee', 'delivery', 'en livraison', 'en_livraison'].includes(normalized)) return 4;
  if (['driver_nearby', 'nearby', 'proche', 'livreur_proche'].includes(normalized)) return 5;
  if (['delivered', 'completed', 'livree', 'livrée', 'terminee', 'terminée'].includes(normalized)) return 6;
  if (['cancelled', 'annulée', 'annulee'].includes(normalized)) return 0;
  return 1;
}

export function getStepDetails(status: string): TrackingStep {
  const stepIdx = getStepIndexByStatus(status);
  if (stepIdx === 0) {
    return {
      step: 0,
      key: 'cancelled',
      title: 'Commande annulée',
      bannerTitle: '❌ Commande annulée',
      emoji: '❌',
      description: 'Cette commande a été annulée.',
      defaultEstimatedTime: 'Annulée'
    };
  }
  return TRACKING_STEPS[stepIdx - 1] || TRACKING_STEPS[0];
}

/**
 * Generates the 3-line ASCII progress bar for Telegram messages
 * Example:
 * 🟢━━━━🟢━━━━🔵━━━━⚪━━━━⚪━━━━⚪
 * ①       ②       ③       ④       ⑤       ⑥
 * `Reçue  Paiement  Prépar.  Livraison  Proche   Livrée`
 */
export function generateProgressBarText(status: string): string {
  const currentStep = getStepIndexByStatus(status);
  
  if (currentStep === 0) {
    return '❌━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━❌\n`Commande annulée`';
  }

  const indicators: string[] = [];
  for (let i = 1; i <= 6; i++) {
    if (i < currentStep) {
      indicators.push('🟢');
    } else if (i === currentStep) {
      if (i === 1) indicators.push('🟡');
      else if (i === 2) indicators.push('🟢');
      else if (i === 3) indicators.push('🔵');
      else if (i === 4) indicators.push('🚚');
      else if (i === 5) indicators.push('📍');
      else indicators.push('✅');
    } else {
      indicators.push('⚪');
    }
  }

  const line1 = indicators.join('━━━');
  const line2 = '①       ②       ③       ④       ⑤       ⑥';
  const line3 = '`Reçue  Paiement  Prépar.  Livraison  Proche   Livrée`';

  return `${line1}\n${line2}\n${line3}`;
}

/**
 * Formats a clean, modern Telegram tracking message with date, time, status banner, progress bar, estimated time, and driver info.
 */
export function formatTelegramTrackingMessage(order: any): string {
  const orderId = order.id || order.orderId || 'INCONNU';
  const shortId = orderId.length > 12 ? `#DS-${orderId.slice(-8).toUpperCase()}` : `#DS-${orderId}`;
  
  const step = getStepDetails(order.status);
  const progressBar = generateProgressBarText(order.status);
  
  // Format Date & Time
  const createdAt = order.createdAt || Date.now();
  let dateObj: Date;
  if (createdAt && typeof createdAt === 'object' && 'seconds' in createdAt) {
    dateObj = new Date(createdAt.seconds * 1000);
  } else if (createdAt && typeof createdAt.toDate === 'function') {
    dateObj = createdAt.toDate();
  } else {
    dateObj = new Date(createdAt);
  }

  const dateStr = dateObj.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const timeStr = dateObj.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const estimatedTime = order.estimatedDeliveryTime || step.defaultEstimatedTime;

  let msg = `📦 *DAVIDSTORE*\n\n` +
    `${step.bannerTitle}\n` +
    `${step.description}\n\n` +
    `Commande : *${shortId}*\n` +
    `📅 ${dateStr}\n` +
    `🕐 ${timeStr}\n\n` +
    `*Statut actuel*\n` +
    `${step.emoji} *${step.title}*\n\n` +
    `📊 *Progression de la commande*\n\n` +
    `${progressBar}\n\n` +
    `⏱️ *Temps estimé :* ${estimatedTime}\n`;

  if (order.driverName || order.driverPhone) {
    msg += `\n👤 *Livreur :* ${order.driverName || 'Partenaire DavidSTORE'}\n` +
      `📞 \`${order.driverPhone || '+243 97 123 45 67'}\`\n`;
  }

  if (step.step === 4 || step.step === 5) {
    msg += `\n🔒 *En attente de confirmation*\n` +
      `Veuillez confirmer la livraison avec le QR Code ou le code PIN.\n`;
  }

  return msg;
}

/**
 * Generates the context-aware Telegram inline keyboard buttons for an order
 */
export function getTelegramTrackingKeyboard(order: any): any {
  const orderId = order.id || order.orderId || '';
  const currentStep = getStepIndexByStatus(order.status);

  const keyboard: any[][] = [];

  // Primary Row 1: Track order
  if (currentStep === 4 || currentStep === 5) {
    keyboard.push([
      { text: '📍 Suivre en temps réel', callback_data: `track_order_${orderId}` }
    ]);
  } else {
    keyboard.push([
      { text: '📍 Suivre ma commande', callback_data: `track_order_${orderId}` }
    ]);
  }

  // Row 2: Details & Refresh
  keyboard.push([
    { text: '📦 Voir les détails', callback_data: `view_order_details_${orderId}` },
    { text: '🔄 Actualiser', callback_data: `refresh_order_${orderId}` }
  ]);

  // Contextual Row: Confirmation / QR / PIN if order is shipped/driver nearby
  if (currentStep === 4 || currentStep === 5) {
    keyboard.push([
      { text: '📱 Afficher le QR Code', callback_data: `show_qr_${orderId}` },
      { text: '🔐 Afficher le PIN', callback_data: `show_pin_${orderId}` }
    ]);
    keyboard.push([
      { text: '✅ Confirmer la réception', callback_data: `confirm_receipt_${orderId}` }
    ]);
  }

  // Row 4: Support
  keyboard.push([
    { text: '📞 Support', callback_data: `support_order_${orderId}` }
  ]);

  return { inline_keyboard: keyboard };
}
