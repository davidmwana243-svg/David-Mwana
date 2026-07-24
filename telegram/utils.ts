/**
 * Utilitaires pour le Bot Telegram DavidStore
 */

export interface GeocodedAddress {
  country: string;
  province: string;
  city: string;
  commune: string;
  district: string;
}

/**
 * Nettoie et formate les numéros de téléphone de la RDC
 */
export function sanitizeDRCPhone(phoneStr: string): string {
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
}

/**
 * Valide si le numéro est au format correct pour la RDC (Vodacom, Airtel, Orange, Africell, etc.)
 */
export function isValidDRCPhone(phoneStr: string): boolean {
  const sanitized = sanitizeDRCPhone(phoneStr);
  return /^\+243[89][0-9]{8}$/.test(sanitized);
}

/**
 * Effectue un Reverse Geocoding afin de récupérer le pays, province, ville, etc.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<GeocodedAddress> {
  const fallback: GeocodedAddress = {
    country: "Congo-Kinshasa (RDC)",
    province: "Haut-Katanga",
    city: "Lubumbashi",
    commune: "Lubumbashi",
    district: "Golf"
  };

  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DavidStoreBot/1.0 (davidmwana243@gmail.com)'
      }
    });

    if (!response.ok) {
      console.warn(`[GEOCODING] Nominatim status ${response.status}. Fallback applied.`);
      return fallback;
    }

    const data = await response.json();
    if (!data || !data.address) {
      return fallback;
    }

    const addr = data.address;
    return {
      country: addr.country || fallback.country,
      province: addr.state || addr.region || addr.province || fallback.province,
      city: addr.city || addr.town || addr.village || addr.municipality || fallback.city,
      commune: addr.suburb || addr.borough || addr.city_district || fallback.commune,
      district: addr.neighbourhood || addr.quarter || addr.residential || fallback.district
    };
  } catch (error) {
    console.error('[GEOCODING] Reverse Geocoding Error:', error);
    return fallback;
  }
}

/**
 * Formate un prix en Franc Congolais (CDF)
 */
export function formatPrice(amount: number): string {
  return `${amount.toLocaleString('fr-FR')} CDF`;
}

/**
 * Génère un numéro de commande court unique (ex: DS-123456)
 */
export function generateOrderNumber(): string {
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `DS-${rand}`;
}

/**
 * Formate une date en format français
 */
export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
