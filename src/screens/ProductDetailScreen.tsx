import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Product } from '../models/types';
import { useProduct } from '../hooks/useProduct';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { ArrowLeft, ShoppingCart, Heart, Share2, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '../components/Button';
import { ReviewList } from '../components/ReviewList';
export const ProductDetailScreen: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { product, loading: isLoading } = useProduct(id!);
  const [selectedSize, setSelectedSize] = useState<string | undefined>(undefined);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(undefined);
  const [showReviews, setShowReviews] = useState(true);

  const { addToCart } = useCart();
  const { profile, toggleWishlist } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const getAvailableSizes = (prod: Product) => {
    // 0. Custom Sizes configured by Admin
    if (prod.sizes && prod.sizes.length > 0) {
      return {
        type: 'custom',
        label: 'Choisir la Taille',
        options: prod.sizes
      };
    }

    const nameLower = prod.name.toLowerCase();
    const descLower = prod.description.toLowerCase();
    const categoryLower = prod.category.toLowerCase();

    // 1. Shoes Category
    if (categoryLower.includes('shoes') || categoryLower.includes('chaussure') || nameLower.includes('basket') || nameLower.includes('chaussure') || nameLower.includes('soulier')) {
      return {
        type: 'chaussures',
        label: 'Choisir la Pointure',
        options: ['38', '39', '40', '41', '42', '43', '44', '45']
      };
    }

    // 2. Pantalons / Jeans / Pants
    if (nameLower.includes('pantalon') || descLower.includes('pantalon') || nameLower.includes('jean') || descLower.includes('jean') || nameLower.includes('short') || nameLower.includes('chino')) {
      return {
        type: 'pantalon',
        label: 'Choisir la Taille de Pantalon (Numeric)',
        options: ['38', '40', '42', '44', '46', '48']
      };
    }

    // 3. Polos, Chemises and other clothes
    if (categoryLower.includes('clothing') || categoryLower.includes('vetement') || nameLower.includes('polo') || nameLower.includes('chemise') || nameLower.includes('veste') || nameLower.includes('t-shirt') || nameLower.includes('robe') || nameLower.includes('trench') || nameLower.includes('pyjama')) {
      return {
        type: 'polos_clothing',
        label: 'Choisir la Taille (Polos / Chemises)',
        options: ['S', 'M', 'L', 'XL', 'XXL']
      };
    }

    return null;
  };

  const sizeInfo = product ? getAvailableSizes(product) : null;

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div></div>;
  }

  if (!product) {
    return <div className="p-8 text-center">Produit non trouvé</div>;
  }

  const handleAddToCart = () => {
    addToCart(product, 1, selectedSize, selectedColor);
    showNotification("Panier", `Produit ${selectedSize ? `(Taille: ${selectedSize}) ` : ''}${selectedColor ? `(Couleur: ${selectedColor}) ` : ''}ajouté au panier avec succès.`, "success");
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
        <div className="flex items-end space-x-2 mb-2 justify-between">
          <span className="text-3xl font-bold text-orange-500">{Number(product.price || 0).toLocaleString()} FC</span>
          <button 
             onClick={() => setShowReviews(true)}
             className="flex items-center space-x-1 text-sm bg-orange-50 px-2 py-1 rounded-lg text-orange-600 font-bold"
          >
             <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
             <span>{product.averageRating?.toFixed(1) || '0.0'}</span>
          </button>
        </div>
        
        <h1 className="text-lg font-bold text-gray-900 leading-tight mb-3">
          {product.name}
        </h1>

        <div className="flex items-center justify-between text-sm text-gray-500">
          {/* Sales count removed per user request */}
        </div>
      </div>

      {/* Sizing options */}
      {sizeInfo && (
        <div className="bg-white p-4 mb-2 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-gray-900 text-sm">{sizeInfo.label}</span>
            {selectedSize && (
              <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full font-sans">
                Taille : {selectedSize}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizeInfo.options.map((option) => {
              const active = selectedSize === option;
              return (
                <button
                  key={option}
                  onClick={() => setSelectedSize(option)}
                  type="button"
                  className={`px-4 py-2 border rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    active
                      ? 'border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/20 scale-105'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Color options */}
      {product.colors && product.colors.length > 0 && (
        <div className="bg-white p-4 mb-2 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <span className="font-bold text-gray-900 text-sm">Choisir la couleur</span>
            {selectedColor && (
              <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full font-sans">
                Couleur : {selectedColor}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {product.colors.map((color) => {
              const active = selectedColor === color;
              return (
                <button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  type="button"
                  className={`px-4 py-2 border rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    active
                      ? 'border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/20 scale-105'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {color}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Description */}
      <div className="bg-white p-4 mb-2 shadow-sm">
        <h3 className="font-bold text-gray-900 mb-2">Description</h3>
        <p className="text-gray-600 text-sm leading-relaxed font-sans">
          {product.description}
        </p>
      </div>

      <div className="bg-white p-4 mb-2 shadow-sm">
        <button 
          onClick={() => setShowReviews(!showReviews)}
          className="w-full flex justify-between items-center"
        >
          <h3 className="font-bold text-gray-900">Notes et avis</h3>
          {showReviews ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
        </button>
        {showReviews && (
          <div className="block">
            <div className="flex items-center space-x-2 my-4">
              <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span className="text-lg font-bold">{product.averageRating?.toFixed(1) || '0.0'}</span>
              <span className="text-sm text-gray-500">({product.totalReviews || 0} avis)</span>
            </div>
            <ReviewList productId={product.id} />
          </div>
        )}
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
          className="flex-1 py-3.5 text-sm sm:text-base font-bold shadow-lg shadow-orange-500/40 font-sans"
          onClick={() => {
            addToCart(product, 1, selectedSize, selectedColor);
            navigate('/checkout');
          }}
        >
          Acheter
        </Button>
      </div>
    </div>
  );
};

