/**
 * Claviers (Keyboards) pour l'intégration complète du Bot Telegram DavidStore
 */

// Clavier de partage de contact
export const contactKeyboard = {
  keyboard: [
    [
      {
        text: '📱 Partager mon numéro',
        request_contact: true,
      }
    ]
  ],
  resize_keyboard: true,
  one_time_keyboard: true
};

// Clavier de partage de localisation
export const locationKeyboard = {
  keyboard: [
    [
      {
        text: '📍 Partager ma localisation',
        request_location: true,
      }
    ]
  ],
  resize_keyboard: true,
  one_time_keyboard: true
};

// Générateur de clavier principal avec WebApp
export function buildMainKeyboard(webAppUrl: string) {
  return {
    keyboard: [
      [
        { 
          text: '🛍️ Ouvrir DAVIDSTORE', 
          web_app: { url: webAppUrl } 
        }
      ],
      [
        { text: '🛍️ Catalogue' },
        { text: '🛒 Mon panier' }
      ],
      [
        { text: '📦 Mes commandes' },
        { text: '❤️ Favoris' }
      ],
      [
        { text: '👤 Mon compte' },
        { text: '📍 Mes adresses' }
      ],
      [
        { text: '🔔 Notifications' },
        { text: '☎️ Support' }
      ],
      [
        { text: 'ℹ️ Guide d\'utilisation' }
      ]
    ],
    resize_keyboard: true
  };
}

// Clavier Principal du Client (Fallback statique)
export const mainKeyboard = buildMainKeyboard('https://ais-pre-htongq6rmqzf7q2pg4r7vz-437132868753.europe-west2.run.app');

// Clavier d'options d'adresse avant commande
export const addressSelectionKeyboard = {
  keyboard: [
    [
      { text: '🏠 Utiliser mon adresse enregistrée' }
    ],
    [
      { text: '📝 Modifier mon adresse' },
      { text: '📍 Partager une nouvelle localisation' }
    ],
    [
      { text: '⬅️ Retour' }
    ]
  ],
  resize_keyboard: true,
  one_time_keyboard: true
};

// Générateur de clavier Inline pour les catégories
export function buildCategoriesKeyboard(categories: any[]) {
  const keyboard: any[][] = [];
  
  // Create rows with 2 buttons each
  for (let i = 0; i < categories.length; i += 2) {
    const row = [
      {
        text: categories[i].name,
        callback_data: `cat_${categories[i].id}`
      }
    ];
    if (categories[i + 1]) {
      row.push({
        text: categories[i + 1].name,
        callback_data: `cat_${categories[i + 1].id}`
      });
    }
    keyboard.push(row);
  }
  
  return { inline_keyboard: keyboard };
}

// Générateur de clavier Inline pour un produit
export function buildProductDetailsKeyboard(productId: string) {
  return {
    inline_keyboard: [
      [
        { text: '🛒 Ajouter au panier', callback_data: `add_cart_${productId}_none_none` },
        { text: '❤️ Ajouter aux favoris', callback_data: `add_fav_${productId}` }
      ],
      [
        { text: '🛍️ Retour au catalogue', callback_data: 'view_catalogue' }
      ]
    ]
  };
}

export function buildProductSelectionKeyboard(
  productId: string,
  sizes: string[] = [],
  colors: string[] = [],
  selectedSize?: string,
  selectedColor?: string
) {
  const inline_keyboard: any[][] = [];

  // Size Buttons
  if (sizes && sizes.length > 0) {
    const row: any[] = [];
    sizes.forEach(size => {
      row.push({
        text: selectedSize === size ? `✅ ${size}` : size,
        callback_data: `select_size_${productId}_${size}_${selectedColor || 'none'}`
      });
    });
    inline_keyboard.push(row);
  }

  // Color Buttons
  if (colors && colors.length > 0) {
    const row: any[] = [];
    colors.forEach(color => {
      row.push({
        text: selectedColor === color ? `✅ ${color}` : color,
        callback_data: `select_color_${productId}_${selectedSize || 'none'}_${color}`
      });
    });
    inline_keyboard.push(row);
  }

  // Add to Cart
  inline_keyboard.push([
    {
      text: '🛒 Ajouter au panier',
      callback_data: `add_cart_${productId}_${selectedSize || 'none'}_${selectedColor || 'none'}`
    },
    { text: '❤️ Ajouter aux favoris', callback_data: `add_fav_${productId}` }
  ]);

  // Return to catalogue
  inline_keyboard.push([{ text: '🛍️ Retour au catalogue', callback_data: 'view_catalogue' }]);

  return { inline_keyboard };
}

// Générateur de clavier Inline pour la gestion du panier
export function buildCartItemKeyboard(productId: string, quantity: number) {
  return {
    inline_keyboard: [
      [
        { text: '➕ Plus', callback_data: `cart_incr_${productId}` },
        { text: '➖ Moins', callback_data: `cart_decr_${productId}` },
        { text: '❌ Retirer', callback_data: `cart_remove_${productId}` }
      ],
      [
        { text: '💳 Passer la commande', callback_data: 'cart_checkout' },
        { text: '🗑️ Vider le panier', callback_data: 'cart_clear' }
      ]
    ]
  };
}

// Générateur de clavier Inline pour la gestion des favoris
export function buildFavoriteItemKeyboard(productId: string) {
  return {
    inline_keyboard: [
      [
        { text: '🛒 Ajouter au panier', callback_data: `add_cart_${productId}` },
        { text: '💔 Retirer des favoris', callback_data: `remove_fav_${productId}` }
      ]
    ]
  };
}

// Clavier d'administration
export const adminKeyboard = {
  keyboard: [
    [
      { text: '📊 Statistiques Globales' },
      { text: '📦 Liste des Commandes' }
    ],
    [
      { text: '👥 Liste des Utilisateurs' },
      { text: '🛍️ Liste des Produits' }
    ],
    [
      { text: '🏠 Retour au Menu Client' }
    ]
  ],
  resize_keyboard: true
};

// Clavier Inline de mise à jour du statut d'une commande par l'administrateur
export function buildAdminOrderStatusKeyboard(orderId: string) {
  return {
    inline_keyboard: [
      [
        { text: '✅ Confirmer', callback_data: `admin_status_${orderId}_processing` },
        { text: '📦 Préparation', callback_data: `admin_status_${orderId}_preparation` }
      ],
      [
        { text: '🚚 Expédier', callback_data: `admin_status_${orderId}_shipped` },
        { text: '📍 En livraison', callback_data: `admin_status_${orderId}_delivery` }
      ],
      [
        { text: '🎉 Livrer', callback_data: `admin_status_${orderId}_delivered` },
        { text: '❌ Annuler', callback_data: `admin_status_${orderId}_cancelled` }
      ]
    ]
  };
}
