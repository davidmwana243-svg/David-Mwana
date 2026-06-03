import express from 'express';
import { GoogleGenAI } from "@google/genai";
import { adminDb } from '../firebase/index';

const router = express.Router();

// Initialize the GoogleGenAI client with standard User-Agent header for tracking
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const DEFAULT_PRODUCTS = [
  { id: 'elec-1', name: 'Casque sans fil à réduction de bruit Pro', price: 185000, category: 'Électronique', description: 'Casque sans fil haut de gamme avec réduction active du bruit et autonomie de 40 heures.' },
  { id: 'elec-2', name: 'Montre analogique intelligente GT', price: 95000, category: 'Électronique', description: 'Montre minimaliste élégante avec capteurs de santé et notifications intelligentes.' },
  { id: 'elec-3', name: 'Enceinte Bluetooth Waterproof X', price: 65000, category: 'Électronique', description: 'Enceinte portable étanche IPX7 avec un son stéréo puissant.' },
  { id: 'men-1', name: 'Veste en Jean délavée Classic', price: 85000, category: 'Mode Homme', description: 'Veste en denim haut de gamme au look intemporel.' },
  { id: 'men-2', name: 'Chemise Slim-fit en Coton Premium', price: 45000, category: 'Mode Homme', description: 'Chemise en coton haute performance, respirante et facile à repasser.' },
  { id: 'women-1', name: 'Robe d\'été Fleurie Bohème', price: 75000, category: 'Mode Femme', description: 'Robe longue, légère et fluide avec d\'élégants motifs floraux.' },
  { id: 'women-2', name: 'Trench-Coat Élégant d\'Automne', price: 135000, category: 'Mode Femme', description: 'Imperméable coupe-vent classique avec ceinture.' },
  { id: 'kids-1', name: 'Ensemble Pyjama Coton Confort', price: 35000, category: 'Enfants', description: 'Ensemble pyjama super doux en coton 100% biologique.' },
  { id: 'shoes-1', name: 'Baskets de Course Ultra-Light', price: 110000, category: 'Chaussures', description: 'Chaussures de running ultra légères et confortables.' }
];

router.post('/chat', async (req, res) => {
  const { message, history } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('Missing GEMINI_API_KEY');
    return res.status(500).json({ error: "L'assistant n'est pas encore configuré. Veuillez contacter l'administrateur." });
  }

  // 1. Fetch dynamic products list to pass to model context
  let productsToUse = DEFAULT_PRODUCTS;
  if (adminDb) {
    try {
      const snap = await adminDb.collection('products').get();
      if (!snap.empty) {
        productsToUse = snap.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            name: d.name || '',
            price: d.price || 0,
            category: d.category || '',
            description: d.description || ''
          };
        });
      }
    } catch (err) {
      console.warn('Could not fetch products from Firestore Admin for AI assistance, using fallback:', err);
    }
  }

  const productsContextString = productsToUse.map(p => 
    `- [ID: ${p.id}] "${p.name}" - Prix: ${Number(p.price).toLocaleString('fr-FR')} FC (Catégorie: ${p.category}). Description: ${p.description}`
  ).join('\n');

  try {
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: `Vous êtes Nicole, l'assistante d'achat virtuelle officielle de DavidSTORE, la boutique e-commerce de référence en République Démocratique du Congo (RDC).

Votre personnalité et ton :
- Chaleureuse, polie, bienveillante et très dynamique.
- Répondez TOUJOURS en français d'une manière naturelle et fluide.
- Utilisez des emojis chaleureux de façon modérée (🛍️, ✨, 📦, 🚚, 💳) pour embellir vos réponses.
- Vous êtes là pour guider l'utilisateur pas à pas.

Votre rôle et expertise :
1. Présentez nos produits du catalogue avec enthousiasme et précision.
2. Répondez précisément avec les vrais prix en Francs Congolais (FC). Voici notre catalogue d'articles actuel disponible en magasin :
${productsContextString}

3. Zone de Service, Tarifs et Logistique de livraison :
- IMPORTANT : DavidSTORE est disponible EXCLUSIVEMENT dans la province du Haut-Katanga.
- Villes desservies : Lubumbashi, Likasi, Kasumbalesa, Kipushi, Kambove, Sakania, etc.
- Attention : Nous ne livrons pas à Kinshasa ni dans les autres provinces pour l'instant. L'application est strictement limitée au Haut-Katanga.
- Tarif de livraison unique : 3 000 FC pour les commandes de moins de 50 000 FC.
- Livraison GRATUITE pour toute commande de 50 000 FC ou plus !
- Délai de livraison rapide : sous 24 heures.
- Pour tout suivi d'un colis ou question complexe, invitez le client à contacter notre support WhatsApp au +243 852 849 473.

4. Moyens de Paiement autorisés :
- Mobile Money (M-Pesa, Orange Money, Airtel Money) : Instantané et fortement conseillé !
- Espèces à la livraison : Disponible pour toutes nos livraisons dans les zones couvertes du Haut-Katanga.
- Carte bancaire (Visa/Mastercard) via notre passerelle de paiement intégrée.

DIRECTIVE ESSENTIELLE DE RECOMMANDATION (TRÈS IMPORTANT) :
Lorsque vous mentionnez, suggérez ou recommandez un produit existant dans notre catalogue ci-dessus, vous devez IMPÉRATIVEMENT insérer de manière naturelle l'identifiant exact du produit sous la forme de cette balise : [RECOMMEND:ID_PRODUIT] à la fin de la phrase ou du paragraphe concerné.
Par exemple : "Si vous cherchez des écouteurs de luxe, je vous recommande vivement notre Casque sans fil de bruit Pro à 185 000 FC, l'immersion sonore est totale ! [RECOMMEND:elec-1]".
Ne sifflez pas d'ID imaginaires ou de catégories entières dans la balise, utilisez uniquement les ID de produits valides fournis ci-dessus (ex: elec-1, men-2, kids-1, shoes-1, etc.). Si vous parlez de plusieurs articles, vous pouvez ajouter leurs balises respectives. Notre interface de chat décodera automatiquement ces balises pour afficher de vrais fiches produits interactives à l'utilisateur !`,
        temperature: 0.7,
      },
      history: history || []
    });

    const result = await chat.sendMessage({ message });
    
    if (!result || !result.text) {
      throw new Error('Empty response from AI');
    }

    res.json({ text: result.text });
  } catch (error: any) {
    console.error('Error with Gemini API:', error);
    res.status(500).json({ error: 'Désolé, Nicole rencontre un petit problème technique passager.' });
  }
});

export default router;
