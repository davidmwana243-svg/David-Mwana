export interface GeocodedAddress {
  country: string;
  province: string;
  city: string;
  commune: string;
  district: string;
}

/**
 * Perform reverse geocoding using OpenStreetMap Nominatim API.
 * Includes a robust fallback mechanism in case of rate limits or network issues.
 */
export async function reverseGeocode(lat: number, lon: number): Promise<GeocodedAddress> {
  // Sensible default fallback for Lubumbashi, Haut-Katanga, DRC
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
      console.warn(`[GEOCODING] Nominatim returned status ${response.status}. Using intelligent fallback.`);
      return fallback;
    }

    const data = await response.json();
    if (!data || !data.address) {
      console.warn('[GEOCODING] Nominatim returned empty address details. Using fallback.');
      return fallback;
    }

    const addr = data.address;
    const country = addr.country || fallback.country;
    const province = addr.state || addr.region || addr.province || fallback.province;
    const city = addr.city || addr.town || addr.village || addr.municipality || fallback.city;
    const commune = addr.suburb || addr.borough || addr.city_district || fallback.commune;
    const district = addr.neighbourhood || addr.quarter || addr.residential || fallback.district;

    return {
      country,
      province,
      city,
      commune,
      district
    };
  } catch (error) {
    console.error('[GEOCODING] Error during reverse geocoding:', error);
    return fallback;
  }
}
