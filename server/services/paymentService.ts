import { processShwaryPayment, sanitizeDRCPhone } from './shwaryService';
import { processAirtelMoneyPayment } from './airtelMoneyService';
import { processOrangeMoneyPayment } from './orangeMoneyService';
import { processMpesaPayment } from './mpesaService';

export {
  processShwaryPayment,
  sanitizeDRCPhone,
  processAirtelMoneyPayment,
  processOrangeMoneyPayment,
  processMpesaPayment,
};

export async function processPaymentByProvider(
  provider: 'shwary' | 'airtel' | 'orange' | 'mpesa' | string,
  amount: number,
  clientPhoneNumber: string,
  orderId: string,
  hostUrl: string
) {
  const normProvider = (provider || 'shwary').toLowerCase();

  switch (normProvider) {
    case 'airtel':
    case 'airtel_money':
      return processAirtelMoneyPayment(amount, clientPhoneNumber, orderId, hostUrl);
    case 'orange':
    case 'orange_money':
      return processOrangeMoneyPayment(amount, clientPhoneNumber, orderId, hostUrl);
    case 'mpesa':
    case 'vodacom':
      return processMpesaPayment(amount, clientPhoneNumber, orderId, hostUrl);
    case 'shwary':
    default:
      return processShwaryPayment(amount, clientPhoneNumber, orderId, hostUrl);
  }
}
