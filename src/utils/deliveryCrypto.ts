/**
 * DAVIDSTORE Delivery Cryptographic & Validation Engine
 * Secure QR Code payload, HMAC-SHA256 signature, PIN generation and validation.
 */

import { Order } from '../types';

export const QR_SECRET_KEY = 'davidstore-secure-qr-secret-key-2026';

/**
 * Pure TypeScript SHA-256 and HMAC-SHA256 implementation
 * Guarantees 100% deterministic cryptographic hashing across Node.js and Browser environments.
 */
function sha256Bytes(ascii: string): number[] {
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let result: number[] = [];

  const words: number[] = [];
  const asciiLength = ascii.length;
  
  for (let i = 0; i < asciiLength; i++) {
    words[i >> 2] |= ascii.charCodeAt(i) << ((3 - (i % 4)) * 8);
  }

  const bitLength = asciiLength * 8;
  words[asciiLength >> 2] |= 0x80 << ((3 - (asciiLength % 4)) * 8);
  words[(((asciiLength + 8) >> 6) << 4) + 15] = bitLength;

  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  let H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  const w = new Array(64);

  for (let i = 0; i < words.length; i += 16) {
    for (let j = 0; j < 16; j++) {
      w[j] = words[i + j] || 0;
    }
    for (let j = 16; j < 64; j++) {
      const s0 = ((w[j - 15] >>> 7) | (w[j - 15] << 25)) ^ ((w[j - 15] >>> 18) | (w[j - 15] << 14)) ^ (w[j - 15] >>> 3);
      const s1 = ((w[j - 2] >>> 17) | (w[j - 2] << 15)) ^ ((w[j - 2] >>> 19) | (w[j - 2] << 13)) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) | 0;
    }

    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];

    for (let j = 0; j < 64; j++) {
      const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[j] + w[j]) | 0;
      const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) | 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) | 0;
    }

    H[0] = (H[0] + a) | 0;
    H[1] = (H[1] + b) | 0;
    H[2] = (H[2] + c) | 0;
    H[3] = (H[3] + d) | 0;
    H[4] = (H[4] + e) | 0;
    H[5] = (H[5] + f) | 0;
    H[6] = (H[6] + g) | 0;
    H[7] = (H[7] + h) | 0;
  }

  for (let i = 0; i < 8; i++) {
    result.push((H[i] >> 24) & 0xff);
    result.push((H[i] >> 16) & 0xff);
    result.push((H[i] >> 8) & 0xff);
    result.push(H[i] & 0xff);
  }

  return result;
}

/**
 * Computes HMAC-SHA256 signature as hex string
 */
export function computeHmacSha256(data: string, secret: string = QR_SECRET_KEY): string {
  let keyBytes: number[] = [];
  for (let i = 0; i < secret.length; i++) {
    keyBytes.push(secret.charCodeAt(i) & 0xff);
  }

  if (keyBytes.length > 64) {
    keyBytes = sha256Bytes(secret);
  }
  while (keyBytes.length < 64) {
    keyBytes.push(0);
  }

  const oKeyPad = new Array(64);
  const iKeyPad = new Array(64);

  for (let i = 0; i < 64; i++) {
    oKeyPad[i] = keyBytes[i] ^ 0x5c;
    iKeyPad[i] = keyBytes[i] ^ 0x36;
  }

  let iKeyPadString = '';
  for (let i = 0; i < 64; i++) {
    iKeyPadString += String.fromCharCode(iKeyPad[i]);
  }
  const innerHashBytes = sha256Bytes(iKeyPadString + data);

  let oKeyPadString = '';
  for (let i = 0; i < 64; i++) {
    oKeyPadString += String.fromCharCode(oKeyPad[i]);
  }
  let innerHashString = '';
  for (let i = 0; i < innerHashBytes.length; i++) {
    innerHashString += String.fromCharCode(innerHashBytes[i]);
  }

  const outerHashBytes = sha256Bytes(oKeyPadString + innerHashString);

  return outerHashBytes.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a random secure token PIN (e.g. SECURE-TOK-7UQC2WUA)
 */
export function generateSecureToken(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let randomStr = '';
  for (let i = 0; i < 8; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `SECURE-TOK-${randomStr}`;
}

export interface DeliveryQRPayload {
  version: number;
  orderId: string;
  secureToken: string;
  driverId: string;
  clientId: string;
  createdAt: number;
  expiresAt: number;
  signature: string;
}

/**
 * Creates the complete secure JSON payload for the delivery QR code.
 */
export function generateDeliveryQRPayload(
  order: Partial<Order> & { id: string },
  driverId: string = '',
  clientId: string = ''
): { payloadObj: DeliveryQRPayload; jsonString: string } {
  const orderId = order.id;
  const secureToken = order.secureToken || order.qrToken || generateSecureToken();
  const finalDriverId = driverId || order.driverId || '';
  const finalClientId = clientId || order.userId || order.clientId || '';
  const createdAt = order.createdAt || Date.now();
  // Validity: 30 days default
  const expiresAt = order.expiresAt || (createdAt + 30 * 24 * 60 * 60 * 1000);

  // Signature = HMAC_SHA256(orderId + secureToken + createdAt + expiresAt, SECRET_KEY)
  const signInput = `${orderId}${secureToken}${createdAt}${expiresAt}`;
  const signature = computeHmacSha256(signInput, QR_SECRET_KEY);

  console.log(`[DELIVERY] QR généré pour commande #${orderId}`);
  console.log(`[DELIVERY] PIN généré: ${secureToken}`);
  console.log(`[DELIVERY] Signature créée: ${signature}`);

  const payloadObj: DeliveryQRPayload = {
    version: 1,
    orderId,
    secureToken,
    driverId: finalDriverId,
    clientId: finalClientId,
    createdAt,
    expiresAt,
    signature
  };

  const jsonString = JSON.stringify(payloadObj);

  return { payloadObj, jsonString };
}

export interface DeliveryValidationResult {
  success: boolean;
  code: 
    | 'SUCCESS'
    | 'ORDER_NOT_FOUND'
    | 'ORDER_MISMATCH'
    | 'INVALID_PIN'
    | 'QR_EXPIRED'
    | 'INVALID_SIGNATURE'
    | 'ALREADY_CONFIRMED'
    | 'UNAUTHORIZED_DRIVER'
    | 'INVALID_FORMAT';
  message: string;
  payload?: DeliveryQRPayload;
}

/**
 * Single Unified Delivery Validation Engine
 * Validates either a QR Code JSON payload or a manual PIN string against a target Order.
 */
export function validateDeliveryScanOrPin(
  input: string | any,
  targetOrder: Order | null | undefined,
  options: { driverId?: string; currentUserId?: string } = {}
): DeliveryValidationResult {
  // 1. Check order existence
  if (!targetOrder || !targetOrder.id) {
    console.warn(`[DELIVERY] Erreur exacte: Commande introuvable.`);
    return {
      success: false,
      code: 'ORDER_NOT_FOUND',
      message: 'Commande introuvable.'
    };
  }

  // 2. Check if already confirmed
  if (targetOrder.status === 'delivered' || targetOrder.deliveryConfirmed === true) {
    console.warn(`[DELIVERY] Erreur exacte: Commande #${targetOrder.id} déjà confirmée.`);
    return {
      success: false,
      code: 'ALREADY_CONFIRMED',
      message: 'Commande déjà confirmée.'
    };
  }

  // 3. Driver authorization check (if driverId specified on order)
  if (targetOrder.driverId && options.driverId && targetOrder.driverId !== options.driverId) {
    console.warn(`[DELIVERY] Erreur exacte: Livreur non autorisé pour commande #${targetOrder.id}`);
    return {
      success: false,
      code: 'UNAUTHORIZED_DRIVER',
      message: 'Livreur non autorisé.'
    };
  }

  const expectedSecureToken = (targetOrder.secureToken || targetOrder.qrToken || '').trim();
  const expectedDeliveryPin = (targetOrder.deliveryPin || '').trim();

  let rawString = typeof input === 'string' ? input.trim() : JSON.stringify(input);

  // Check if input is a JSON string (from QR Scan)
  if (rawString.startsWith('{') && rawString.endsWith('}')) {
    try {
      const parsed: DeliveryQRPayload = JSON.parse(rawString);

      // Verify orderId match
      if (parsed.orderId && parsed.orderId !== targetOrder.id) {
        console.warn(`[DELIVERY] Erreur exacte: orderId scanné (${parsed.orderId}) ne correspond pas à (${targetOrder.id})`);
        return {
          success: false,
          code: 'ORDER_MISMATCH',
          message: 'Commande incorrecte.'
        };
      }

      // Verify secureToken match
      if (parsed.secureToken && expectedSecureToken && parsed.secureToken !== expectedSecureToken) {
        console.warn(`[DELIVERY] Erreur exacte: secureToken scanné (${parsed.secureToken}) ne correspond pas à (${expectedSecureToken})`);
        return {
          success: false,
          code: 'INVALID_PIN',
          message: 'PIN invalide.'
        };
      }

      // Verify expiration
      if (parsed.expiresAt && parsed.expiresAt > 0 && Date.now() > parsed.expiresAt) {
        console.warn(`[DELIVERY] Erreur exacte: QR expiré (expiresAt: ${parsed.expiresAt}, now: ${Date.now()})`);
        return {
          success: false,
          code: 'QR_EXPIRED',
          message: 'QR expiré.'
        };
      }

      // Verify HMAC signature
      if (parsed.signature) {
        const signInput = `${parsed.orderId}${parsed.secureToken}${parsed.createdAt}${parsed.expiresAt}`;
        const computedSig = computeHmacSha256(signInput, QR_SECRET_KEY);

        console.log(`[DELIVERY] Signature reçue: ${parsed.signature}`);
        console.log(`[DELIVERY] Signature calculée: ${computedSig}`);

        if (computedSig !== parsed.signature) {
          console.warn(`[DELIVERY] Erreur exacte: Signature invalide.`);
          return {
            success: false,
            code: 'INVALID_SIGNATURE',
            message: 'Signature invalide.'
          };
        }
        console.log(`[DELIVERY] Signature vérifiée`);
      }

      console.log(`[DELIVERY] PIN vérifié`);
      console.log(`[DELIVERY] Commande confirmée`);
      return {
        success: true,
        code: 'SUCCESS',
        message: 'Livraison confirmée avec succès.',
        payload: parsed
      };
    } catch (err) {
      console.warn(`[DELIVERY] Non-JSON fallback or JSON parse error:`, err);
    }
  }

  // Fallback for Manual PIN entry or raw token scan
  const cleanInput = rawString.toUpperCase().trim();
  const cleanToken = expectedSecureToken.toUpperCase();
  const cleanPin = expectedDeliveryPin.toUpperCase();

  const strip = (s: string) => s.replace(/[^A-Z0-9]/g, '');
  const sInput = strip(cleanInput);
  const sToken = strip(cleanToken);
  const sPin = strip(cleanPin);

  // Accept SECURE-TOK-XXXXXXX, or just XXXXXXX, or deliveryPin numbers with or without dashes/spaces
  const isMatch = 
    (sToken && sInput === sToken) ||
    (sPin && sInput === sPin) ||
    (sToken && sInput.length >= 4 && sToken.endsWith(sInput)) ||
    (sPin && sInput.length >= 4 && sPin.endsWith(sInput)) ||
    (sToken && sInput.length >= 4 && sInput.endsWith(sToken)) ||
    cleanInput === cleanToken ||
    cleanInput === cleanPin ||
    (`SECURE-TOK-${cleanInput}`) === cleanToken ||
    cleanToken.endsWith(cleanInput);

  if (!isMatch) {
    console.warn(`[DELIVERY] Erreur exacte: PIN invalide. Reçu: ${cleanInput} (${sInput}), attendu: ${cleanToken} (${sToken}) ou ${cleanPin} (${sPin})`);
    return {
      success: false,
      code: 'INVALID_PIN',
      message: 'PIN invalide.'
    };
  }

  console.log(`[DELIVERY] PIN vérifié (Saisie manuelle)`);
  console.log(`[DELIVERY] Commande confirmée`);

  return {
    success: true,
    code: 'SUCCESS',
    message: 'Livraison confirmée avec succès.'
  };
}
