/**
 * Vodacom M-Pesa DRC Payment Gateway Integration Service
 */
import { sanitizeDRCPhone, processShwaryPayment } from './shwaryService';

export async function processMpesaPayment(amount: number, clientPhoneNumber: string, orderId: string, hostUrl: string) {
  const formattedPhone = sanitizeDRCPhone(clientPhoneNumber);
  console.log(`[M-PESA DRC] Initiating payment for phone ${formattedPhone}, amount ${amount} CDF, order ${orderId}`);
  
  // Shwary aggregates Mobile Money gateways in DRC including M-Pesa
  return processShwaryPayment(amount, formattedPhone, orderId, hostUrl);
}
