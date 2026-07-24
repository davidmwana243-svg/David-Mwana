import express from 'express';
import { GoogleGenAI } from "@google/genai";
import { adminDb } from '../firebase/index';
import { EX_PRODUCTS } from '../../src/services/mockData';

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

router.post('/chat', async (req, res) => {
  const { message, history, products } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  if (!process.env.GEMINI_API_KEY) {
    console.error('Missing GEMINI_API_KEY');
    return res.status(500).json({ error: "L'assistant n'est pas encore configuré. Veuillez contacter l'administrateur." });
  }

  // Use products passed from client, or fetch from DB / default catalog
  let productsToUse = Array.isArray(products) && products.length > 0 ? products : [];

  if (productsToUse.length === 0) {
    try {
      if (adminDb) {
        const snapshot = await adminDb.collection('products').get();
        if (!snapshot.empty) {
          productsToUse = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      }
    } catch (err) {
      console.warn('Could not fetch products from adminDb for AI assistant context:', err);
    }
  }

  if (productsToUse.length === 0) {
    productsToUse = EX_PRODUCTS;
  }

  const productsContextString = productsToUse.length > 0 
    ? productsToUse.map(p => 
        `- [ID: ${p.id}] "${p.name}" - Prix: ${Number(p.price).toLocaleString('fr-FR')} FC (Catégorie: ${p.category}). Description: ${p.description}`
      ).join('\n')
    : "LE CATALOGUE EST ACTUELLEMENT VIDE. Aucun produit n'est disponible à la vente pour le moment.";

  try {
    const modelName = process.env.GEMINI_MODEL || "gemini-flash-latest";
    let result;
    try {
      const chat = ai.chats.create({
        model: modelName,
        config: {
          systemInstruction: `Tu es "Nicole", l'assistante virtuelle officielle de DavidSTORE.
 
 Ton rôle unique est d'aider les clients en te basant EXCLUSIVEMENT sur les données fournies ci-dessous.
 
 ━━━━━━━━━━━━━━━━━━━━
 📦 CATALOGUE RÉEL (SOURCE UNIQUE DE VÉRITÉ)
 ━━━━━━━━━━━━━━━━━━━━
 Voici la LISTE EXACTE et COMPLÈTE des produits actuellement en stock chez DavidSTORE. 
 SI UN PRODUIT N'EST PAS DANS CETTE LISTE, IL N'EXISTE PAS.
 
 ${productsContextString}
 
 ⚠️ RÈGLES CRITIQUES SUR LA DISPONIBILITÉ :
 1. INTERDICTION FORMELLE d'inventer, d'imaginer ou de mentionner des produits qui ne sont pas dans la liste ci-dessus.
 2. Si le catalogue indiqué ci-dessus est "VIDE", tu dois IMPÉRATIVEMENT dire au client que la boutique est en cours de réapprovisionnement et qu'aucun article n'est disponible pour le moment.
 3. Ne mentionne jamais de produits que tu "penses" que DavidSTORE pourrait vendre s'ils ne sont pas listés explicitement.
 4. Si un client demande un produit supprimé ou inexistant, réponds : "Désolé, cet article n'est plus disponible dans notre catalogue actuel."
 
 ━━━━━━━━━━━━━━━━━━━━
 💬 COMPORTEMENT & STYLE
 ━━━━━━━━━━━━━━━━━━━━
 - Ton nom est Nicole.
 - Tu es polie, professionnelle et chaleureuse.
 - Tu aides les clients à trouver des produits, réponds sur les zones de livraison (Haut-Katanga uniquement) et guides vers l'achat.
 - Utilise des emojis avec parcimonie (🛍️, ✨, 🚚).
 
 ━━━━━━━━━━━━━━━━━━━━
 🚀 RECOMMANDATIONS INTELLIGENTES
 ━━━━━━━━━━━━━━━━━━━━
 Lorsque tu mentionnes un produit du catalogue, insère TOUJOURS sa balise de recommandation pour l'interface : [RECOMMEND:ID_PRODUIT].
 Exemple : "Nous avons de superbes baskets ! [RECOMMEND:shoes-1]"`,
          temperature: 0.1,
        },
        history: history || []
      });

      result = await chat.sendMessage({ message });
    } catch (primaryErr: any) {
      console.warn('Primary Gemini model failed, trying fallback model:', primaryErr?.message || primaryErr);
      const fallbackChat = ai.chats.create({
        model: "gemini-2.5-flash",
        config: {
          systemInstruction: `Tu es "Nicole", l'assistante virtuelle officielle de DavidSTORE.
 
 Ton rôle unique est d'aider les clients en te basant EXCLUSIVEMENT sur les données fournies ci-dessous.
 
 ━━━━━━━━━━━━━━━━━━━━
 📦 CATALOGUE RÉEL (SOURCE UNIQUE DE VÉRITÉ)
 ━━━━━━━━━━━━━━━━━━━━
 ${productsContextString}
 
 Ton nom est Nicole. Tu es polie, professionnelle et chaleureuse.`,
          temperature: 0.1,
        },
        history: history || []
      });
      result = await fallbackChat.sendMessage({ message });
    }
    
    if (!result || !result.text) {
      throw new Error('Empty response from AI');
    }

    res.json({ text: result.text });
  } catch (error: any) {
    console.error('Error with Gemini API:', error);
    res.status(500).json({ error: 'Désolé, Nicole rencontre un petit problème technique passager.', details: error.message });
  }
});

export default router;
