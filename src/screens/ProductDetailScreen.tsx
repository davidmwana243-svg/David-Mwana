import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Product } from '../models/types';
import { getProductById } from '../services/productService';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { ArrowLeft, ShoppingCart, Heart, Share2 } from 'lucide-react';
import { Button } from '../components/Button';

export const ProductDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { addToCart } = useCart();
  const { profile, toggleWishlist, user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProduct = async () => {
      if (id) {
        const prod = await getProductById(id);
        setProduct(prod);
      }
      setIsLoading(false);
    };
    fetchProduct();
  }, [id]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!product) {
    return <div className="p-8 text-center">Produit non trouvé</div>;
  }

  const handleAddToCart = () => {
    addToCart(product, 1);
    showNotification("Panier", "Produit ajouté au panier avec succès.", "success");
  };

  const isFavorited = profile?.wishlist?.includes(product.id) || false;

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/home');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 pb-44 relative">
      {/* Header */}
      <div className="fixed top-0 w-full max-w-md flex justify-between p-4 z-10 left-1/2 -translate-x-1/2">
        <button onClick={handleBack} className="w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-sm">
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </button>
        <div className="flex space-x-2">
          <button className="w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-sm">
            <Share2 className="w-5 h-5 text-gray-800" />
          </button>
          <button onClick={() => navigate('/cart')} className="w-10 h-10 bg-white/80 backdrop-blur rounded-full flex items-center justify-center shadow-sm">
            <ShoppingCart className="w-5 h-5 text-gray-800" />
          </button>
        </div>
      </div>

      {/* Hero Image */}
      <div className="w-full aspect-square bg-white">
        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
      </div>

      {/* Details Info */}
      <div className="bg-white px-4 py-5 mb-2 shadow-sm rounded-t-3xl -mt-6 relative z-10">
        <div className="flex items-end space-x-2 mb-2">
          <span className="text-3xl font-bold text-orange-500">{Number(product.price || 0).toLocaleString()} FC</span>
        </div>
        
        <h1 className="text-lg font-bold text-gray-900 leading-tight mb-3">
          {product.name}
        </h1>

        <div className="flex items-center justify-between text-sm text-gray-500">
          {/* Sales count removed per user request */}
        </div>
      </div>

      {/* Description */}
      <div className="bg-white p-4 mb-2 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-2">Description</h3>
        <p className="text-gray-600 text-sm leading-relaxed">
          {product.description}
        </p>
      </div>

      <div className="h-10" />

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 w-full max-w-md bg-white border-t border-gray-100 px-4 pt-4 pb-10 flex items-center space-x-3 z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.12)] rounded-t-[32px] left-1/2 -translate-x-1/2">
        <button 
          onClick={async () => {
            if (!profile) navigate('/login');
            else await toggleWishlist(product.id);
          }}
          className={`flex flex-col items-center justify-center w-14 transition-colors ${isFavorited ? 'text-orange-500' : 'text-gray-500 hover:text-orange-500'}`}
        >
          <Heart className={`w-6 h-6 mb-1 ${isFavorited ? 'fill-orange-500' : ''}`} />
          <span className="text-[10px] font-medium">Sauver</span>
        </button>
        <Button 
          variant="outline"
          className="flex-1 py-3.5 text-sm sm:text-base text-orange-600 border-2 border-orange-500 bg-orange-50 hover:bg-orange-100 font-bold shadow-sm"
          onClick={handleAddToCart}
        >
          Ajouter au panier
        </Button>
        <Button 
          variant="primary"
          className="flex-1 py-3.5 text-sm sm:text-base font-bold shadow-lg shadow-orange-500/40"
          onClick={() => {
            addToCart(product, 1);
            navigate('/checkout');
          }}
        >
          Acheter
        </Button>
      </div>
    </div>
  );
};

