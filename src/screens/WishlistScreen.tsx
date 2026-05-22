import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { Product } from '../models/types';
import { getProducts } from '../services/productService';
import { ProductCard } from '../components/ProductCard';
import { ArrowLeft, Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const WishlistScreen: React.FC = () => {
  const { profile, user } = useAuth();
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchWishlistItems = async () => {
      if (!profile?.wishlist || profile.wishlist.length === 0) {
        setWishlistProducts([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const allProducts = await getProducts();
        const filtered = allProducts.filter(p => profile.wishlist!.includes(p.id));
        setWishlistProducts(filtered);
      } catch (error) {
        console.error("Error fetching wishlist products:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWishlistItems();
  }, [profile?.wishlist]);

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
        <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Heart className="w-10 h-10 text-gray-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Votre liste est vide</h2>
        <p className="text-gray-500 mb-6">Connectez-vous pour voir votre liste de souhaits et enregistrer vos articles préférés.</p>
        <button 
          onClick={() => navigate('/login')}
          className="bg-orange-500 text-white px-8 py-3 rounded-full font-bold shadow-lg"
        >
          Se connecter
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white px-4 py-3 shadow-sm sticky top-0 z-10 border-b border-gray-100 flex items-center">
        <button onClick={() => navigate(-1)} className="mr-3">
          <ArrowLeft className="w-6 h-6 text-gray-800" />
        </button>
        <h1 className="text-lg font-bold text-gray-900 flex-1 text-center pr-9">Liste de souhaits</h1>
      </div>

      <div className="flex-1 p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        ) : wishlistProducts.length > 0 ? (
          <div className="grid grid-cols-2 gap-4">
            {wishlistProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
              <Heart className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-1">Aucun article trouvé</h2>
            <p className="text-gray-500 mb-6 px-10">Vous n'avez pas encore ajouté d'articles à votre liste de souhaits.</p>
            <button 
              onClick={() => navigate('/')}
              className="text-orange-500 font-bold"
            >
              Découvrir des produits
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
