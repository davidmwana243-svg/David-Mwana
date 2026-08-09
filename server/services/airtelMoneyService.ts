/**
 * Airtel Money DRC Payment Gateway Integration Service
 */
import { sanitizeDRCPhone, processShwaryPayment } from './shwaryService';

export async function processAirtelMoneyPayment(amount: number, clientPhoneNumber: string, orderId: string, hostUrl: string) {
  const formattedPhone = sanitizeDRCPhone(clientPhoneNumber);
  console.log(`[AIRTEL MONEY] Initiating payment for phone ${formattedPhone}, amount ${amount} CDF, order ${orderId}`);
  
  // Shwary aggregates Mobile Money gateways in DRC including Airtel Money
  return processShwaryPayment(amount, formattedPhone, orderId, hostUrl);
}
