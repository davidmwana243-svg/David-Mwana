import { doc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Product, Category } from '../models/types';

export const EX_CATEGORIES: Category[] = [
  { id: 'c1', name: 'Électronique', icon: 'Smartphone', imageUrl: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?w=400&q=80' },
  { id: 'c2', name: 'Mode', icon: 'Shirt', imageUrl: 'https://images.unsplash.com/photo-1445205170230-053b83016050?w=400&q=80' },
  { id: 'c3', name: 'Maison', icon: 'Home', imageUrl: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=400&q=80' },
  { id: 'c4', name: 'Beauté', icon: 'Sparkles', imageUrl: 'https://images.unsplash.com/photo-1522335158203-6a0ea0063df4?w=400&q=80' },
  { id: 'c5', name: 'Sports', icon: 'Activity', imageUrl: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=400&q=80' }
];

export const EX_PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Casque sans fil à réduction de bruit Pro',
    description: 'Casque sans fil de haute qualité avec réduction active du bruit et autonomie de 40 heures.',
    price: 199.99,
    originalPrice: 249.99,
    imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'],
    category: 'c1',
    rating: 4.8,
    reviewsCount: 1245,
    stock: 50,
    salesCount: 8900,
    createdAt: Date.now()
  },
  {
    id: 'p2',
    name: 'Montre analogique minimaliste',
    description: 'Montre minimaliste élégante avec bracelet en cuir et cadran en acier inoxydable.',
    price: 89.99,
    imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'],
    category: 'c2',
    rating: 4.5,
    reviewsCount: 450,
    stock: 30,
    salesCount: 2100,
    createdAt: Date.now()
  },
  {
    id: 'p3',
    name: 'Caméra de sécurité domestique intelligente',
    description: 'Caméra de sécurité HD 1080p avec vision nocturne et audio bidirectionnel.',
    price: 49.99,
    originalPrice: 79.99,
    imageUrl: 'https://images.unsplash.com/photo-1557825835-70d97c4aa567?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1557825835-70d97c4aa567?w=800&q=80'],
    category: 'c1',
    rating: 4.2,
    reviewsCount: 890,
    stock: 120,
    salesCount: 5400,
    createdAt: Date.now()
  },
  {
    id: 'p4',
    name: 'T-shirt en coton biologique',
    description: 'T-shirt basique en coton biologique de qualité supérieure à porter tous les jours.',
    price: 19.99,
    imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80'],
    category: 'c2',
    rating: 4.7,
    reviewsCount: 320,
    stock: 500,
    salesCount: 12000,
    createdAt: Date.now()
  },
  {
    id: 'p5',
    name: 'Tasse à café en céramique',
    description: 'Tasse en céramique fabriquée à la main, lavable au lave-vaisselle et utilisable au micro-ondes.',
    price: 14.99,
    imageUrl: 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80'],
    category: 'c3',
    rating: 4.9,
    reviewsCount: 215,
    stock: 80,
    salesCount: 1500,
    createdAt: Date.now()
  },
  {
    id: 'p6',
    name: 'Tapis de yoga Pro',
    description: 'Tapis de yoga antidérapant et respectueux de l\'environnement, avec lignes d\'alignement.',
    price: 34.99,
    originalPrice: 45.99,
    imageUrl: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&q=80',
    images: ['https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&q=80'],
    category: 'c5',
    rating: 4.6,
    reviewsCount: 540,
    stock: 200,
    salesCount: 3300,
    createdAt: Date.now()
  }
];

export async function seedDatabase() {
  try {
    const catsSnapshot = await getDocs(collection(db, 'categories'));
    if (catsSnapshot.empty) {
      console.log('Seeding categories...');
      for (const cat of EX_CATEGORIES) {
        await setDoc(doc(db, 'categories', cat.id), cat);
      }
    }
    
    const prodsSnapshot = await getDocs(collection(db, 'products'));
    if (prodsSnapshot.empty) {
      console.log('Seeding products...');
      for (const prod of EX_PRODUCTS) {
        await setDoc(doc(db, 'products', prod.id), prod);
      }
    }
  } catch (error) {
    console.error("Error seeding database: ", error);
  }
}
