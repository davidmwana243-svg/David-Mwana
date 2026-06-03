import { doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Product, Category } from '../models/types';

export const EX_CATEGORIES: Category[] = [
  { id: 'electronics', name: 'Électronique', icon: 'Smartphone', imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80' },
  { id: 'men_clothing', name: 'Mode Homme', icon: 'Shirt', imageUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&q=80' },
  { id: 'women_clothing', name: 'Mode Femme', icon: 'ShoppingBag', imageUrl: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=400&q=80' },
  { id: 'kids_clothing', name: 'Enfants', icon: 'Smile', imageUrl: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=400&q=80' },
  { id: 'shoes', name: 'Chaussures', icon: 'Footprints', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&q=80' }
];

export const EX_PRODUCTS: Product[] = [
  // Électronique
  {
    id: 'elec-1',
    name: 'Casque sans fil à réduction de bruit Pro',
    description: 'Casque sans fil de haute qualité avec réduction active du bruit et autonomie de 40 heures. Qualité sonore supérieure pour une immersion complète.',
    price: 185000,
    originalPrice: 220000,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'],
    category: 'electronics',
    rating: 0,
    reviewsCount: 0,
    stock: 50,
    salesCount: 0,
    createdAt: Date.now() - 3600000 * 24 * 2
  },
  {
    id: 'elec-2',
    name: 'Montre analogique intelligente GT',
    description: 'Montre minimaliste élégante alliant classicisme et capteurs de suivi de santé et notifications intelligentes.',
    price: 95000,
    originalPrice: 110000,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'],
    category: 'electronics',
    rating: 0,
    reviewsCount: 0,
    stock: 30,
    salesCount: 0,
    createdAt: Date.now() - 3600000 * 24 * 5
  },
  {
    id: 'elec-3',
    name: 'Enceinte Bluetooth Waterproof X',
    description: 'Enceinte sans fil étanche avec autonomie de 15h et un son stéréo puissant pour sublimer vos soirées.',
    price: 65000,
    imageUrl: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800&q=80'],
    category: 'electronics',
    rating: 0,
    reviewsCount: 0,
    stock: 25,
    salesCount: 0,
    createdAt: Date.now() - 3600000 * 24 * 3
  },

  // Mode Homme
  {
    id: 'men-1',
    name: 'Veste en Jean délavée Classic',
    description: 'Veste en jean de qualité supérieure, coupe ajustée et finitions durables pour un style intemporel.',
    price: 85000,
    originalPrice: 105000,
    imageUrl: 'https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=800&q=80'],
    category: 'men_clothing',
    rating: 0,
    reviewsCount: 0,
    stock: 20,
    salesCount: 0,
    createdAt: Date.now() - 3600000 * 24 * 1
  },
  {
    id: 'men-2',
    name: 'Chemise Slim-fit en Coton Premium',
    description: 'Chemise en coton haute performance, respirante et facile à repasser. Idéale pour le bureau ou les sorties décontractées.',
    price: 45000,
    imageUrl: 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80'],
    category: 'men_clothing',
    rating: 0,
    reviewsCount: 0,
    stock: 45,
    salesCount: 0,
    createdAt: Date.now() - 3600000 * 24 * 6
  },

  // Mode Femme
  {
    id: 'women-1',
    name: 'Robe d\'été Fleurie Bohème',
    description: 'Robe longue et fluide avec motif fleuri élégant, idéale pour les journées ensoleillées et soirées d\'été.',
    price: 75000,
    originalPrice: 90000,
    imageUrl: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&q=80'],
    category: 'women_clothing',
    rating: 0,
    reviewsCount: 0,
    stock: 15,
    salesCount: 0,
    createdAt: Date.now() - 3600000 * 24 * 1
  },
  {
    id: 'women-2',
    name: 'Trench-Coat Élégant d\'Automne',
    description: 'Imperméable coupe-vent classique avec ceinture au niveau de la taille, idéal pour un look chic et raffiné.',
    price: 135000,
    imageUrl: 'https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80'],
    category: 'women_clothing',
    rating: 0,
    reviewsCount: 0,
    stock: 12,
    salesCount: 0,
    createdAt: Date.now() - 3600000 * 24 * 4
  },

  // Enfants
  {
    id: 'kids-1',
    name: 'Ensemble Pyjama Coton Confort',
    description: 'Ensemble pyjama extrêmement doux en coton 100% biologique pour protéger la peau sensible de vos enfants.',
    price: 35000,
    imageUrl: 'https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1519457431-44ccd64a579b?w=800&q=80'],
    category: 'kids_clothing',
    rating: 0,
    reviewsCount: 0,
    stock: 60,
    salesCount: 0,
    createdAt: Date.now() - 3600000 * 12
  },

  // Chaussures
  {
    id: 'shoes-1',
    name: 'Baskets de Course Ultra-Light',
    description: 'Baskets aérodynamiques pour le running avec semelle amortissante en mousse et tissu mesh ultra-respirant.',
    price: 110000,
    originalPrice: 140000,
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80'],
    category: 'shoes',
    rating: 0,
    reviewsCount: 0,
    stock: 22,
    salesCount: 0,
    createdAt: Date.now() - 3600000 * 24
  },
  {
    id: 'shoes-2',
    name: 'Mocassins Classiques en Cuir Marron',
    description: 'Chaussures de ville en cuir pleine fleur, cousues main pour garantir une souplesse et une durabilité incomparables.',
    price: 145000,
    imageUrl: 'https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1533867617858-e7b97e060509?w=800&q=80'],
    category: 'shoes',
    rating: 0,
    reviewsCount: 0,
    stock: 18,
    salesCount: 0,
    createdAt: Date.now() - 3600000 * 24 * 7
  }
];

export async function seedDatabase() {
  try {
    // If local storage already recorded a successful seed, do not run again
    if (localStorage.getItem('database_seeded') === 'true') {
      return;
    }

    // Attempting a quick check with a shorter timeout if possible, 
    // but Firestore doesn't have an easy per-call timeout.
    // We'll use getDocs and catch specific transient network errors.
    const prodsSnapshot = await getDocs(collection(db, 'products'));
    if (!prodsSnapshot.empty) {
      // Products are already present, mark as seeded to avoid future overwrites
      localStorage.setItem('database_seeded', 'true');
      return;
    }

    console.log("Starting database seeding...");

    // Seed categories
    for (const cat of EX_CATEGORIES) {
      await setDoc(doc(db, 'categories', cat.id), cat);
    }
    
    // Seed our official high quality items
    for (const prod of EX_PRODUCTS) {
      await setDoc(doc(db, 'products', prod.id), prod);
    }

    localStorage.setItem('database_seeded', 'true');
    console.log("Database seeded successfully on first launch.");
  } catch (error: any) {
    // If it's a "unavailable" error, we might be offline or project is still provisioning
    if (error.code === 'unavailable') {
      console.warn("Firestore is currently unavailable. Seeding will retry on next reload.");
    } else {
      console.error("Error seeding database: ", error);
    }
  }
}
