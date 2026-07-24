/**
 * Shwary Payment Integration Service
 */

export const sanitizeDRCPhone = (phoneStr: string): string => {
  let cl = (phoneStr || '').replace(/\s+/g, '').replace(/[-\(\)]/g, '');
  if (cl.startsWith('+243')) {
    cl = cl.substring(4);
  } else if (cl.startsWith('243')) {
    cl = cl.substring(3);
  }
  if (cl.startsWith('0')) {
    cl = cl.substring(1);
  }
  return `+243${cl}`;
};

/**
 * Reusable core Shwary payment processor.
 * Used by Web APIs and backend handlers.
 */
export async function processShwaryPayment(amount: number, clientPhoneNumber: string, orderId: string, hostUrl: string) {
  const apiKey = process.env.SHWARY_API_KEY || process.env.SHWARY_SECRET;
  const siteId = process.env.SHWARY_SITE_ID;
  const merchantKey = process.env.SHWARY_MERCHANT_KEY || apiKey;
  const merchantId = process.env.SHWARY_MERCHANT_ID || siteId;
  const effectiveApiKey = apiKey || merchantKey;

  const formattedPhone = sanitizeDRCPhone(clientPhoneNumber);
  const baseUrl = hostUrl || process.env.APP_URL || 'https://ais-pre-htongq6rmqzf7q2pg4r7vz-437132868753.europe-west2.run.app';
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const callbackUrl = `${cleanBaseUrl}/api/shwary/webhook`;

  console.log('================================================================');
  console.log('[SHWARY API ENGINE] INITIATING TRANSACTION SESSION');
  console.log(`- Order ID: ${orderId}`);
  console.log(`- Client Phone (Raw): ${clientPhoneNumber}`);
  console.log(`- Client Phone (Sanitized): ${formattedPhone}`);
  console.log(`- Amount: ${amount} CDF`);
  console.log(`- Dynamic Callback URL: ${callbackUrl}`);
  console.log('================================================================');

  const isPlaceholder = (val?: string) => !val || val.toLowerCase().includes('placeholder') || val === 'YOUR_KEY' || val === 'YOUR_ID';
  const isDummyConfig = isPlaceholder(effectiveApiKey) && isPlaceholder(merchantKey) && isPlaceholder(siteId) && isPlaceholder(merchantId);

  if (isDummyConfig) {
    throw new Error("Le service de paiement n'est pas encore configuré. Veuillez renseigner des identifiants Shwary valides.");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  const gatewayUrl = 'https://api.shwary.com/api/v1/merchants/payment/DRC';
  const payload = {
    amount,
    clientPhoneNumber: formattedPhone,
    phone: formattedPhone,
    callbackUrl,
    callback_url: callbackUrl,
    orderId,
    reference: orderId
  };

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (merchantKey) requestHeaders['x-merchant-key'] = merchantKey;
  if (merchantId) requestHeaders['x-merchant-id'] = merchantId;
  if (siteId) requestHeaders['x-site-id'] = siteId;
  if (effectiveApiKey) requestHeaders['Authorization'] = `Bearer ${effectiveApiKey}`;

  const response = await fetch(gatewayUrl, {
    method: 'POST',
    headers: requestHeaders,
    body: JSON.stringify(payload),
    signal: controller.signal
  });

  clearTimeout(timeoutId);

  const text = await response.text();
  console.log(`[SHWARY API ENGINE] Shwary HTTP Status: ${response.status}`);
  console.log(`[SHWARY API ENGINE] Shwary Response Raw: ${text}`);

  if (!response.ok) {
    if (response.status === 422) {
      try {
        const errObj = JSON.parse(text);
        const errMsg = errObj.message || '';
        const match = errMsg.match(/we can instead process\s+([0-9.]+)/i);
        if (match && match[1]) {
          let recommendedAmount = parseFloat(match[1]);
          if (!isNaN(recommendedAmount) && recommendedAmount > 0) {
            if (recommendedAmount < 100) {
              recommendedAmount = Math.ceil(recommendedAmount * 2800);
            }
            console.log(`[SHWARY API ENGINE] Corrective Trigger: Shwary suggested alternative. Retrying with: ${recommendedAmount} CDF...`);
            
            const retryPayload = {
              amount: recommendedAmount,
              clientPhoneNumber: formattedPhone,
              phone: formattedPhone,
              callbackUrl,
              callback_url: callbackUrl,
              orderId,
              reference: orderId
            };
            const retryController = new AbortController();
            const retryTimeoutId = setTimeout(() => retryController.abort(), 8000);
            
            const retryResponse = await fetch(gatewayUrl, {
              method: 'POST',
              headers: requestHeaders,
              body: JSON.stringify(retryPayload),
              signal: retryController.signal
            });
            clearTimeout(retryTimeoutId);
            const retryText = await retryResponse.text();
            
            if (retryResponse.ok) {
              return JSON.parse(retryText);
            } else {
              throw new Error(`Le paiement Shwary de rattrapage a échoué (Statut ${retryResponse.status}): ${retryText}`);
            }
          }
        }
      } catch (parseErr: any) {
        throw new Error(`La passerelle Shwary a décliné (Statut 422) et l'ajustement a échoué: ${parseErr?.message || parseErr}`);
      }
    }
    throw new Error(`La passerelle Shwary a retourné une erreur (Statut ${response.status}): ${text}`);
  }

  return JSON.parse(text);
}
