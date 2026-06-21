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
  let fetchedSuccessfully = false;

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
        fetchedSuccessfully = true;
      }
    } catch (err) {
      console.warn('Could not fetch products from Firestore Admin for AI assistance, attempting REST fallback:', err);
    }
  }

  if (!fetchedSuccessfully) {
    try {
      const projectId = "gen-lang-client-0356564841";
      const databaseId = "ai-studio-35938330-505b-48a2-b260-abe577a0b5ce";
      const apiKey = "AIzaSyAH0CHU-OmmqXXDL3LhU6MTPmmQCyvNmLE";
      const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/products?key=${apiKey}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (data.documents && Array.isArray(data.documents)) {
          const restProds = data.documents.map((doc: any) => {
            const fields = doc.fields || {};
            const pathParts = doc.name.split('/');
            const id = pathParts[pathParts.length - 1];
            
            return {
              id,
              name: fields.name?.stringValue || '',
              price: Number(fields.price?.integerValue || fields.price?.doubleValue || fields.price?.stringValue || 0),
              category: fields.category?.stringValue || '',
              description: fields.description?.stringValue || ''
            };
          }).filter((p: any) => p.name);
          
          if (restProds.length > 0) {
            productsToUse = restProds;
            fetchedSuccessfully = true;
            console.log(`Successfully fetched ${restProds.length} products for AI assistance via Public REST API.`);
          }
        }
      } else {
        console.warn(`REST fallback for products fetch failed with status: ${response.status}`);
      }
    } catch (restErr) {
      console.error('REST fallback for products fetch failed entirely:', restErr);
    }
  }

  const productsContextString = productsToUse.map(p => 
    `- [ID: ${p.id}] "${p.name}" - Prix: ${Number(p.price).toLocaleString('fr-FR')} FC (Catégorie: ${p.category}). Description: ${p.description}`
  ).join('\n');

  try {
    const chat = ai.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: `Tu es "DavidSTORE AI", l'assistant de vente officiel de la boutique DavidSTORE.

Ton rôle est de gérer une boutique e-commerce via WhatsApp en utilisant les données Firebase.

━━━━━━━━━━━━━━━━━━━━
📦 1. PRODUITS (Firebase)
━━━━━━━━━━━━━━━━━━━━
Les produits viennent uniquement de Firebase (collection: "produits"). Voici le catalogue actuel :
${productsContextString}

Chaque produit contient :
- id
- nom
- prix
- description
- stock

❗ Ne jamais inventer un produit.

━━━━━━━━━━━━━━━━━━━━
🛒 2. COMMANDE (Firebase)
━━━━━━━━━━━━━━━━━━━━
Les commandes doivent être enregistrées dans la collection "commandes" avec :
- clientPhone
- produits
- total
- status = "pending"
- date

Avant de créer une commande :
✔ confirmer le produit avec le client
✔ demander validation si nécessaire

(Note interne : Guide le client pour qu'il passe à l'achat via l'application)

━━━━━━━━━━━━━━━━━━━━
💬 3. COMPORTEMENT CHAT
━━━━━━━━━━━━━━━━━━━━
- Si le client écrit "produits" → afficher le catalogue
- Si le client écrit un numéro → interpréter comme choix produit
- Si le client demande prix → répondre clairement
- Si le client veut acheter → guider étape par étape
- Si le client est confus → simplifier les explications

━━━━━━━━━━━━━━━━━━━━
🧠 4. STYLE DE RÉPONSE
━━━━━━━━━━━━━━━━━━━━
- messages courts et clairs
- ton professionnel + vendeur
- emojis légers (🛍️📦✅💰)
- pas de phrases longues inutiles

━━━━━━━━━━━━━━━━━━━━
🎯 5. OBJECTIF BUSINESS
━━━━━━━━━━━━━━━━━━━━
Transformer chaque conversation en vente.

Ton objectif est :
✔ aider le client
✔ proposer des produits
✔ finaliser des commandes
✔ augmenter les ventes de DavidSTORE

━━━━━━━━━━━━━━━━━━━━
⚠️ 6. RÈGLES IMPORTANTES
━━━━━━━━━━━━━━━━━━━━
- ne jamais inventer de produits
- ne jamais mentir sur les prix
- toujours utiliser Firebase comme source unique
- ne jamais créer de commande sans produit valide
- toujours rester simple et efficace

━━━━━━━━━━━━━━━━━━━━
🚀 7. MODE INTELLIGENT
━━━━━━━━━━━━━━━━━━━━
Si le client dit ce qu’il veut (ex: téléphone, chaussures, etc.), tu dois recommander automatiquement les meilleurs produits disponibles.

DIRECTIVE ESSENTIELLE DE RECOMMANDATION (TRÈS IMPORTANT) :
Lorsque tu mentionnes, suggères ou recommandes un produit existant dans notre catalogue ci-dessus, tu dois IMPÉRATIVEMENT insérer de manière naturelle l'identifiant exact du produit sous la forme de cette balise : [RECOMMEND:ID_PRODUIT] à la fin de la phrase ou du paragraphe concerné.
Par exemple : "Ce casque est excellent ! [RECOMMEND:elec-1]".
Ne donne pas d'ID imaginaires, utilise uniquement les ID de produits valides fournis ci-dessus. Notre interface de chat décodera automatiquement ces balises pour afficher les fiches produits interactives !`,
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
