import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Plus, Trash2, CheckCircle, Navigation, Info, Edit2, AlertCircle } from 'lucide-react';
import { UserAddress } from '../models/types';
import { Button } from '../components/Button';
import { motion, AnimatePresence } from 'motion/react';

const HAUT_KATANGA_CITIES_MAP: Record<string, string[]> = {
  'Lubumbashi': ['Annexe', 'Kamalondo', 'Kampemba', 'Katuba', 'Kenya', 'Lubumbashi', 'Ruashi'],
  'Likasi': ['Kikula', 'Likasi', 'Panda', 'Shituru'],
  'Kasumbalesa': ['Kasumbalesa', 'Musoshi'],
  'Kipushi': ['Kipushi'],
  'Kambove': ['Kambove'],
  'Sakania': ['Sakania']
};

export const AddressScreen: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [customCommune, setCustomCommune] = useState('');
  const [customCity, setCustomCity] = useState('');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [deleteConfirmAddress, setDeleteConfirmAddress] = useState<UserAddress | null>(null);
  
  // Form State
  const [newAddr, setNewAddr] = useState<Partial<UserAddress>>({
    label: '',
    fullName: profile?.displayName || '',
    phone: '',
    addressLines: '',
    commune: '',
    quartier: '',
    avenue: '',
    houseNumber: '',
    reference: '',
    city: 'Lubumbashi',
    country: 'RD Congo',
    latitude: undefined,
    longitude: undefined,
    isDefault: false
  });

  const handleBack = () => {
    if (editingAddressId || showAddForm) {
      // If adding/editing, just close the form instead of going back
      setShowAddForm(false);
      setEditingAddressId(null);
      setCustomCity('');
      setCustomCommune('');
      setNewAddr({
        label: '',
        fullName: profile?.displayName || '',
        phone: '',
        addressLines: '',
        commune: '',
        quartier: '',
        avenue: '',
        houseNumber: '',
        reference: '',
        city: 'Lubumbashi',
        country: 'RD Congo',
        latitude: undefined,
        longitude: undefined,
        isDefault: false
      });
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/profile');
    }
  };

  const getUserLocation = () => {
    if (!navigator.geolocation) {
      showNotification("Localisation", "La géolocalisation n'est pas supportée par votre navigateur.", "error");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        
        let fetchedFields: Partial<UserAddress> = {
          latitude: lat,
          longitude: lon,
        };

        try {
          // fetch reverse-geocoding details via OSM Nominatim API with French language preference
          const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&accept-language=fr`;
          const response = await fetch(url);
          
          if (response.ok) {
            const data = await response.json();
            if (data && data.address) {
              const addr = data.address;
              
              // 1. Identify City
              const rawCity = addr.city || addr.town || addr.village || addr.municipality || addr.county || '';
              const matchedCityKey = Object.keys(HAUT_KATANGA_CITIES_MAP).find(
                cityKey => cityKey.toLowerCase() === rawCity.toLowerCase() || rawCity.toLowerCase().includes(cityKey.toLowerCase())
              );

              if (matchedCityKey) {
                fetchedFields.city = matchedCityKey;
              } else if (rawCity) {
                fetchedFields.city = 'Autre';
                setCustomCity(rawCity);
              }

              // 2. Identify Commune/Secteur
              const rawCommune = addr.suburb || addr.city_district || addr.district || addr.borough || addr.subdistrict || '';
              const currentCity = fetchedFields.city || 'Lubumbashi';
              
              if (currentCity !== 'Autre' && HAUT_KATANGA_CITIES_MAP[currentCity]) {
                const communesList = HAUT_KATANGA_CITIES_MAP[currentCity];
                const matchedCommune = communesList.find(
                  c => c.toLowerCase() === rawCommune.toLowerCase() || 
                       rawCommune.toLowerCase().includes(c.toLowerCase()) || 
                       c.toLowerCase().includes(rawCommune.toLowerCase())
                );
                
                if (matchedCommune) {
                  fetchedFields.commune = matchedCommune;
                } else if (rawCommune) {
                  fetchedFields.commune = 'Autre';
                  setCustomCommune(rawCommune);
                }
              } else if (rawCommune) {
                fetchedFields.commune = rawCommune;
              }

              // 3. Identify Quartier
              const rawQuartier = addr.neighbourhood || addr.quarter || addr.residential || addr.subdivision || (addr.suburb && addr.suburb !== fetchedFields.commune ? addr.suburb : '') || '';
              if (rawQuartier) {
                // Clean up prefixes
                fetchedFields.quartier = rawQuartier.replace(/Quartier\s+/i, '');
              }

              // 4. Identify Avenue / Road
              let rawAvenue = addr.road || addr.pedestrian || addr.street || addr.footway || '';
              if (rawAvenue) {
                rawAvenue = rawAvenue
                  .replace(/^Avenue\s+/i, '')
                  .replace(/^Av\.\s+/i, '')
                  .replace(/^Rue\s+de\s+la\s+/i, '')
                  .replace(/^Rue\s+de\s+/i, '')
                  .replace(/^Rue\s+/i, '');
                fetchedFields.avenue = rawAvenue;
              }

              // 5. Identify House Number
              if (addr.house_number) {
                fetchedFields.houseNumber = addr.house_number;
              }
            }
          }
        } catch (apiErr) {
          console.error("Geocoding API error:", apiErr);
        }

        setNewAddr(prev => ({
          ...prev,
          ...fetchedFields
        }));
        setIsLocating(false);
      },
      (error) => {
        console.error("Error getting location:", error);
        setIsLocating(false);
        showNotification("Localisation", "Impossible de récupérer votre position. Assurez-vous d'avoir activé le GPS.", "error");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleEditClick = (addr: UserAddress) => {
    setEditingAddressId(addr.id);
    
    // Check if the city is one of the predefined ones
    const isPredefinedCity = Object.keys(HAUT_KATANGA_CITIES_MAP).includes(addr.city);
    if (!isPredefinedCity) {
      setCustomCity(addr.city);
    } else {
      setCustomCity('');
    }

    // Check if the commune is predefined for that city
    const predefinedCommunes = HAUT_KATANGA_CITIES_MAP[addr.city] || [];
    const isPredefinedCommune = predefinedCommunes.includes(addr.commune || '');
    if (addr.commune && !isPredefinedCommune) {
      setCustomCommune(addr.commune);
    } else {
      setCustomCommune('');
    }

    setNewAddr({
      label: addr.label,
      fullName: addr.fullName,
      phone: addr.phone,
      addressLines: addr.addressLines,
      commune: isPredefinedCommune ? addr.commune : 'Autre',
      quartier: addr.quartier || '',
      avenue: addr.avenue || '',
      houseNumber: addr.houseNumber || '',
      reference: addr.reference || '',
      city: isPredefinedCity ? addr.city : 'Autre',
      country: addr.country,
      latitude: addr.latitude,
      longitude: addr.longitude,
      isDefault: addr.isDefault || false
    });
    
    setShowAddForm(true);
  };

  const handleSaveAddress = async () => {
    const selectedCity = newAddr.city === 'Autre' ? customCity : newAddr.city;
    const selectedCommune = (newAddr.commune === 'Autre' || newAddr.commune === 'Autre font') ? customCommune : newAddr.commune;

    const finalizedPhone = (newAddr.phone || '').startsWith('+243') ? (newAddr.phone || '') : `+243${newAddr.phone || ''}`;
    
    if (!newAddr.label || !newAddr.phone || !selectedCity || !selectedCommune || !newAddr.quartier || !newAddr.avenue) {
      showNotification("Adresse", "Veuillez remplir les informations obligatoires (Nom, Téléphone, Ville, Commune, Quartier et Avenue).", "error");
      return;
    }

    const isHautKatangaCity = (cityName: string): boolean => {
      const lowerCity = cityName.toLowerCase().trim();
      const validCities = ['lubumbashi', 'likasi', 'kasumbalesa', 'kipushi', 'kambove', 'sakania', 'fungurume', 'kasenga', 'mitwaba', 'pweto'];
      return validCities.some(v => lowerCity.includes(v) || v.includes(lowerCity));
    };

    if (!isHautKatangaCity(selectedCity)) {
      showNotification("Hors-zone", "DavidSTORE livre exclusivement dans la province du Haut-Katanga. Veuillez renseigner une adresse située dans cette province.", "error");
      return;
    }

    const n = newAddr.houseNumber ? `N° ${newAddr.houseNumber}` : 'Sans numéro';
    const refStr = newAddr.reference ? ` (Réf: ${newAddr.reference})` : '';
    const generatedAddressLines = `${n}, Av. ${newAddr.avenue}, Q/ ${newAddr.quartier}, C/ ${selectedCommune}${refStr}`;

    let updatedAddresses = [...(profile?.addresses || [])];
    const isNowDefault = newAddr.isDefault || updatedAddresses.length === 0;

    if (editingAddressId) {
      // Edit mode
      updatedAddresses = updatedAddresses.map(a => {
        if (a.id === editingAddressId) {
          return {
            ...a,
            label: newAddr.label || '',
            fullName: newAddr.label || '',
            phone: finalizedPhone,
            city: selectedCity || '',
            commune: selectedCommune || '',
            quartier: newAddr.quartier || '',
            avenue: newAddr.avenue || '',
            houseNumber: newAddr.houseNumber || '',
            reference: newAddr.reference || '',
            addressLines: generatedAddressLines,
            latitude: newAddr.latitude,
            longitude: newAddr.longitude,
            isDefault: isNowDefault
          };
        }
        return a;
      });

      if (isNowDefault) {
        updatedAddresses.forEach(a => {
          if (a.id !== editingAddressId) a.isDefault = false;
        });
      }
    } else {
      // Add mode
      const address: UserAddress = {
        ...(newAddr as UserAddress),
        phone: finalizedPhone,
        city: selectedCity || '',
        commune: selectedCommune || '',
        fullName: newAddr.label || '',
        addressLines: generatedAddressLines,
        id: Date.now().toString(),
        isDefault: isNowDefault
      };

      if (isNowDefault) {
        updatedAddresses.forEach(a => a.isDefault = false);
      }
      updatedAddresses.push(address);
    }

    // Ensure at least one is default
    if (updatedAddresses.length > 0 && !updatedAddresses.find(a => a.isDefault)) {
      updatedAddresses[0].isDefault = true;
    }

    try {
      await updateProfile({ addresses: updatedAddresses });
      setShowAddForm(false);
      setEditingAddressId(null);
      navigate(-1);
      setNewAddr({
        label: '',
        fullName: profile?.displayName || '',
        phone: '',
        addressLines: '',
        commune: '',
        quartier: '',
        avenue: '',
        houseNumber: '',
        reference: '',
        city: 'Lubumbashi',
        country: 'RD Congo',
        latitude: undefined,
        longitude: undefined,
        isDefault: false
      });
      setCustomCommune('');
      setCustomCity('');
    } catch (err) {
      showNotification("Adresse", "Erreur lors de l'enregistrement de l'adresse.", "error");
    }
  };

  const handleDeleteAddress = async (id: string) => {
    const updatedAddresses = profile?.addresses?.filter(a => a.id !== id) || [];
    
    // If we deleted the default, set first one as default if exists
    if (updatedAddresses.length > 0 && !updatedAddresses.find(a => a.isDefault)) {
      updatedAddresses[0].isDefault = true;
    }

    try {
      await updateProfile({ addresses: updatedAddresses });
      setDeleteConfirmAddress(null);
      showNotification("Adresse", "Adresse supprimée avec succès.", "success");
    } catch (err) {
      showNotification("Adresse", "Erreur lors de la suppression.", "error");
    }
  };

  const setAsDefault = async (id: string) => {
    const updatedAddresses = profile?.addresses?.map(a => ({
      ...a,
      isDefault: a.id === id
    })) || [];
    await updateProfile({ addresses: updatedAddresses });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10 border-b border-gray-100 flex items-center">
        <button onClick={handleBack} className="mr-3">
          <ArrowLeft className="w-6 h-6 text-gray-800" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1 text-center pr-9">Adresses de livraison</h1>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {!showAddForm && (
          <>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Vos adresses</h2>
              <button 
                onClick={() => {
                  setEditingAddressId(null);
                  setNewAddr({
                    label: '',
                    fullName: profile?.displayName || '',
                    phone: '',
                    addressLines: '',
                    commune: '',
                    quartier: '',
                    avenue: '',
                    houseNumber: '',
                    reference: '',
                    city: 'Lubumbashi',
                    country: 'RD Congo',
                    latitude: undefined,
                    longitude: undefined,
                    isDefault: false
                  });
                  setShowAddForm(true);
                }}
                className="flex items-center text-orange-500 font-bold text-sm bg-orange-50 px-3 py-1.5 rounded-lg active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 mr-1" /> Ajouter
              </button>
            </div>

            {profile?.addresses && profile.addresses.length > 0 ? (
              <div className="space-y-3">
                {profile.addresses.map((addr) => (
                  <div key={addr.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 relative group">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center mr-3">
                          <MapPin className="w-5 h-5 text-orange-500" />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{addr.label}</h3>
                          <p className="text-xs text-gray-400">{addr.fullName}</p>
                        </div>
                      </div>
                      {addr.isDefault && (
                        <span className="bg-green-100 text-green-700 text-[9px] font-bold px-2 py-0.5 rounded-full">DÉFAUT</span>
                      )}
                    </div>
                    
                    <div className="mt-3 text-sm text-gray-600 leading-relaxed">
                      <p>{addr.addressLines}</p>
                      <p>{addr.city}, {addr.country}</p>
                      {addr.phone && <p className="mt-1 font-medium text-gray-800">{addr.phone}</p>}
                      {addr.latitude && (
                        <div className="mt-2 flex items-center text-[10px] text-blue-500 font-medium">
                          <Navigation className="w-3 h-3 mr-1" />
                          GPS: {addr.latitude.toFixed(4)}, {addr.longitude?.toFixed(4)}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between">
                      {!addr.isDefault ? (
                        <button 
                          onClick={() => setAsDefault(addr.id)}
                          className="text-[10px] font-bold text-gray-400 hover:text-green-600"
                        >
                          Définir par défaut
                        </button>
                      ) : (
                        <div className="flex items-center text-[10px] font-bold text-green-600">
                          <CheckCircle className="w-3 h-3 mr-1" /> Sélectionné
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => handleEditClick(addr)}
                          className="p-2 text-gray-400 hover:text-orange-500 rounded-lg active:bg-orange-50 transition-colors"
                          title="Modifier"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirmAddress(addr)}
                          className="p-2 text-gray-400 hover:text-red-500 rounded-lg active:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl p-10 text-center border-2 border-dashed border-gray-100">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-gray-300" />
                </div>
                <h3 className="font-bold text-gray-900">Aucune adresse</h3>
                <p className="text-sm text-gray-400 mt-2">Vous n'avez pas encore enregistré d'adresse de livraison.</p>
                <Button onClick={() => setShowAddForm(true)} className="mt-6">Ajouter ma première adresse</Button>
              </div>
            )}
          </>
        )}

        {showAddForm && (
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col">
              <div className="bg-orange-500 p-6 text-white">
                <h2 className="text-xl font-bold">{editingAddressId ? "Modifier l'adresse" : "Nouvelle adresse"}</h2>
                <p className="text-orange-100 text-xs mt-1">Utilisez le GPS pour plus de précision</p>
              </div>

              <div className="p-6 space-y-4">
                {/* GPS Magic Button */}
                <button 
                  onClick={getUserLocation}
                  disabled={isLocating}
                  className={`w-full flex items-center justify-center gap-3 py-4 rounded-xl border-2 border-blue-500 text-blue-600 font-black text-sm transition-all active:scale-95 ${isLocating ? 'bg-gray-100 border-gray-300 text-gray-400' : 'bg-blue-50 hover:bg-blue-100'}`}
                >
                  {isLocating ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-400 border-t-transparent" />
                  ) : (
                    <Navigation className="w-5 h-5 fill-blue-600" />
                  )}
                  {isLocating ? "Localisation en cours..." : "UTILISER MA POSITION GPS"}
                </button>

                {newAddr.latitude && newAddr.longitude && (
                  <div className="space-y-2">
                    <div className="bg-green-50 p-2 rounded-lg border border-green-100 flex items-center justify-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-[10px] font-bold text-green-700">COORDONNÉES GPS CAPTURÉES</span>
                    </div>
                    <div className="w-full h-44 rounded-xl overflow-hidden border border-gray-100 shadow-inner">
                      <iframe
                        title="Aperçu de votre adresse"
                        src={`https://maps.google.com/maps?q=${newAddr.latitude},${newAddr.longitude}&z=16&output=embed`}
                        className="w-full h-full border-none"
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Identifiants du client (Nom et Postnom)</label>
                    <input 
                      type="text" 
                      value={newAddr.label}
                      onChange={e => setNewAddr({...newAddr, label: e.target.value})}
                      placeholder="Ex: Josué David, etc." 
                      className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Téléphone de livraison</label>
                    <div className="flex items-stretch focus-within:ring-1 focus-within:ring-orange-500 rounded-lg overflow-hidden border border-gray-100 bg-gray-50">
                      <div className="flex items-center px-4 bg-gray-100 border-r border-gray-100 text-sm font-bold text-gray-500">
                        +243
                      </div>
                      <input 
                        type="tel" 
                        value={newAddr.phone?.startsWith('+243') ? newAddr.phone.slice(4) : newAddr.phone}
                        onChange={e => setNewAddr({...newAddr, phone: e.target.value.replace(/\D/g, '')})}
                        placeholder="995289355" 
                        className="w-full bg-transparent px-4 py-3 text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-4 space-y-4">
                    <h4 className="text-xs font-bold text-orange-500 uppercase tracking-wider">Localisation de livraison</h4>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Ville / Territoire</label>
                        <select
                          value={newAddr.city}
                          onChange={e => {
                            const selectedCity = e.target.value;
                            setNewAddr({...newAddr, city: selectedCity, commune: ''});
                            setCustomCommune('');
                          }}
                          className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500 font-medium"
                        >
                          <option value="Lubumbashi">Lubumbashi</option>
                          <option value="Likasi">Likasi</option>
                          <option value="Kasumbalesa">Kasumbalesa</option>
                          <option value="Kipushi">Kipushi</option>
                          <option value="Kambove">Kambove</option>
                          <option value="Sakania">Sakania</option>
                          <option value="Autre">Autre...</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Commune / Secteur</label>
                        {newAddr.city && newAddr.city !== 'Autre' && HAUT_KATANGA_CITIES_MAP[newAddr.city] ? (
                          <select
                            value={newAddr.commune}
                            onChange={e => setNewAddr({...newAddr, commune: e.target.value})}
                            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                          >
                            <option value="">Sélectionner...</option>
                            {HAUT_KATANGA_CITIES_MAP[newAddr.city].map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                            <option value="Autre">Autre commune...</option>
                          </select>
                        ) : (
                          <input 
                            type="text" 
                            value={newAddr.commune || ''}
                            onChange={e => setNewAddr({...newAddr, commune: e.target.value})}
                            placeholder="Saisir la commune" 
                            className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                          />
                        )}
                      </div>
                    </div>

                    {newAddr.city === 'Autre' && (
                      <div className="animate-in fade-in duration-200">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Saisir votre ville / territoire</label>
                        <input 
                          type="text" 
                          value={customCity}
                          onChange={e => setCustomCity(e.target.value)}
                          placeholder="Nom de la ville" 
                          className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    )}

                    {(newAddr.commune === 'Autre') && newAddr.city !== 'Autre' && (
                      <div className="animate-in fade-in duration-200">
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Saisir votre commune / secteur</label>
                        <input 
                          type="text" 
                          value={customCommune}
                          onChange={e => setCustomCommune(e.target.value)}
                          placeholder="Nom de la commune" 
                          className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Quartier</label>
                        <input 
                          type="text" 
                          value={newAddr.quartier}
                          onChange={e => setNewAddr({...newAddr, quartier: e.target.value})}
                          placeholder="Ex: GB, Joli Parc..." 
                          className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Avenue</label>
                        <input 
                          type="text" 
                          value={newAddr.avenue}
                          onChange={e => setNewAddr({...newAddr, avenue: e.target.value})}
                          placeholder="Ex: de l'Équateur..." 
                          className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Numéro de parcelle</label>
                        <input 
                          type="text" 
                          value={newAddr.houseNumber || ''}
                          onChange={e => setNewAddr({...newAddr, houseNumber: e.target.value})}
                          placeholder="Ex: 14 bis" 
                          className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Pays</label>
                        <input 
                          type="text" 
                          value={newAddr.country}
                          onChange={e => setNewAddr({...newAddr, country: e.target.value})}
                          disabled
                          className="w-full bg-gray-100 border border-gray-100 rounded-lg px-4 py-3 text-sm text-gray-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                        Point de repère / Référence (Facultatif)
                        <Info className="w-3.5 h-3.5 text-orange-400" />
                      </label>
                      <input 
                        type="text" 
                        value={newAddr.reference || ''}
                        onChange={e => setNewAddr({...newAddr, reference: e.target.value})}
                        placeholder="Ex: À côté de la mosquée, non loin du supermarché..." 
                        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-6">
                  <button 
                    onClick={() => {
                      setShowAddForm(false);
                      setEditingAddressId(null);
                      setNewAddr({
                        label: '',
                        fullName: profile?.displayName || '',
                        phone: '',
                        addressLines: '',
                        commune: '',
                        quartier: '',
                        avenue: '',
                        houseNumber: '',
                        reference: '',
                        city: 'Lubumbashi',
                        country: 'RD Congo',
                        latitude: undefined,
                        longitude: undefined,
                        isDefault: false
                      });
                    }}
                    className="flex-1 py-4 bg-gray-100 text-gray-500 font-bold rounded-xl active:scale-95 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    onClick={handleSaveAddress}
                    className="flex-1 py-4 bg-orange-500 text-white font-bold rounded-xl shadow-lg shadow-orange-100 active:scale-95 transition-all"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            </div>
          )}
      </div>

      {/* Custom Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmAddress && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl relative"
            >
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 mx-auto">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 text-center">Supprimer l'adresse ?</h3>
              <p className="text-sm text-gray-500 text-center mt-2 leading-relaxed">
                Êtes-vous sûr de vouloir supprimer l'adresse <span className="font-semibold text-gray-800">"{deleteConfirmAddress.label}"</span> ? Cette action est irréversible.
              </p>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setDeleteConfirmAddress(null)}
                  className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 text-gray-600 font-bold rounded-xl text-sm transition-all active:scale-95 border border-gray-100"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleDeleteAddress(deleteConfirmAddress.id)}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-sm shadow-lg shadow-red-100 transition-all active:scale-95"
                >
                  Supprimer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
