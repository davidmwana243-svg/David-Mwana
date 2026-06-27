import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Bot, Loader2, ShoppingCart, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { getProducts } from '../services/productService';
import { Product } from '../models/types';
import { useCart } from '../contexts/CartContext';
import { useNotification } from '../contexts/NotificationContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  recommendedProductIds?: string[];
}

export const ChatAssistantScreen: React.FC = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { showNotification } = useNotification();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Bonjour ! Je suis Nicole, l'assistante virtuelle de DavidSTORE. ✨\n\nComment puis-je vous aider aujourd'hui ? Je peux vous renseigner sur nos produits, nos zones de livraison exclusivement dans le Haut-Katanga (Lubumbashi, Likasi, Kasumbalesa, etc.), ou encore vous aider à passer commande !",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<Product[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const suggestionChips = [
    { text: "🛍️ Nouveautés", prompt: "Quels sont les articles phares actuellement disponibles ?" },
    { text: "🚚 Tarifs livraison", prompt: "Quels sont vos tarifs et zones de livraison dans le Haut-Katanga ?" },
    { text: "💳 Modes de paiement", prompt: "Comment se passe le paiement ? Offrez-vous la livraison avec paiement à la livraison ?" },
    { text: "💬 Contacter WhatsApp", prompt: "Comment puis-je contacter le support client de DavidSTORE sur WhatsApp ?" },
    { text: "🇨🇩 À propos", prompt: "Présentez-moi brièvement la boutique DavidSTORE" }
  ];

  // Fetch full product catalog to display recommended products
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const prods = await getProducts();
        setCatalogProducts(prods);
      } catch (err) {
        console.error("Could not load product catalog in assistant chat screen:", err);
      }
    };
    fetchCatalog();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendWithPrompt = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'model',
        parts: [{ text: msg.text }]
      }));

      const productsContext = catalogProducts.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category,
        description: p.description
      }));

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: messageText,
          history,
          products: productsContext
        })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("L'assistant est temporairement indisponible.");
      }

      const data = await response.json();

      if (data.error) throw new Error(data.error);

      // Parse recommendations of form [RECOMMEND:ID_PRODUIT]
      const recommendRegex = /\[RECOMMEND:([a-zA-Z0-9_-]+)\]/g;
      const foundIds: string[] = [];
      let match;
      const responseText = data.text || "";

      while ((match = recommendRegex.exec(responseText)) !== null) {
        const idVal = match[1];
        if (!foundIds.includes(idVal)) {
          foundIds.push(idVal);
        }
      }

      // Strip recomendation tag markup to keep bubble clean
      const cleanText = responseText.replace(/\[RECOMMEND:[a-zA-Z0-9_-]+\]/g, "").trim();

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: cleanText,
        sender: 'bot',
        timestamp: new Date(),
        recommendedProductIds: foundIds.length > 0 ? foundIds : undefined
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: "Désolé, je rencontre une petite difficulté de connexion. N'hésitez pas à reformuler votre question ou à contacter notre Service Client directement sur WhatsApp au +243 852 849 473.",
        sender: 'bot',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    handleSendWithPrompt(input);
  };

  const handleSuggestionClick = (promptText: string) => {
    setInput(promptText);
    handleSendWithPrompt(promptText);
  };

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/support');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50 max-w-md mx-auto">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 flex items-center px-4 py-4 sticky top-0 z-10 shadow-xs">
        <button onClick={handleBack} className="mr-3 p-1.5 hover:bg-gray-100 rounded-full transition-colors cursor-pointer">
          <ArrowLeft className="w-5 h-5 text-gray-800" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center relative">
            <Bot className="w-6 h-6 text-orange-600" />
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white" />
          </div>
          <div>
            <div className="flex items-center gap-1">
              <h1 className="text-sm font-bold text-gray-900">Nicole (Assistant DavidSTORE)</h1>
              <Sparkles className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
            </div>
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tight">Conseillère virtuelle</span>
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 scrollbar-thin">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'} space-y-1.5`}
            >
              {/* Message bubble */}
              <div
                className={`max-w-[85%] rounded-[20px] px-4.5 py-3 text-sm leading-relaxed shadow-xs whitespace-pre-wrap ${
                  msg.sender === 'user'
                    ? 'bg-orange-500 text-white rounded-tr-none'
                    : 'bg-white text-gray-850 border border-gray-100 rounded-tl-none font-medium'
                }`}
              >
                <p>{msg.text}</p>
                <span className={`text-[9px] block text-right mt-1.5 font-semibold ${msg.sender === 'user' ? 'text-orange-200' : 'text-gray-450'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {/* Associated Product recommendation list */}
              {msg.recommendedProductIds && msg.recommendedProductIds.length > 0 && (
                <div className="w-full mt-2 space-y-1.5 border-l-2 border-orange-400 pl-3">
                  <div className="flex items-center gap-1 text-[10px] uppercase font-black text-orange-600 tracking-wider">
                    <span>Articles mentionnés ci-dessus :</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto py-1 scrollbar-none snap-x">
                    {msg.recommendedProductIds.map((prodId, idx) => {
                      const prod = catalogProducts.find(p => p.id === prodId);
                      if (!prod) return null;

                      return (
                        <div
                          key={`${prod.id}-${idx}`}
                          className="flex-shrink-0 w-44 bg-white border border-gray-150 rounded-2xl p-2.5 shadow-sm flex flex-col justify-between snap-start"
                        >
                          <div>
                            <div className="w-full h-22 rounded-xl bg-gray-50 overflow-hidden mb-2 relative">
                              <img
                                src={prod.imageUrl}
                                alt={prod.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <h4 className="font-extrabold text-[11px] text-gray-800 line-clamp-2 leading-tight">
                              {prod.name}
                            </h4>
                            <p className="text-orange-600 font-black text-xs mt-1">
                              {Number(prod.price).toLocaleString('fr-FR')} FC
                            </p>
                          </div>

                          <div className="mt-2.5 space-y-1">
                            <button
                              onClick={() => navigate(`/product/${prod.id}`)}
                              className="w-full bg-orange-50 hover:bg-orange-100/70 text-orange-750 text-[9px] font-black py-1.5 rounded-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-0.5 border border-orange-200/50"
                            >
                              Fiche produit <ArrowRight className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                addToCart(prod);
                                showNotification("Panier", `${prod.name} ajouté !`, "success");
                              }}
                              className="w-full bg-orange-500 hover:bg-orange-600 text-white text-[9px] font-black py-1.5 rounded-lg transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1 shadow-xs"
                            >
                              <ShoppingCart className="w-3 h-3" /> Ajouter au panier
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start"
          >
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-2 shadow-xs">
              <Loader2 className="w-4 h-4 text-orange-500 animate-spin" />
              <span className="text-xs text-gray-500 font-medium italic">Nicole prépare sa réponse...</span>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input / Suggestion Box */}
      <div className="p-4 bg-white border-t border-gray-100 pb-10">
        {/* Suggestion Chips list */}
        {!isLoading && (
          <div className="flex gap-2 overflow-x-auto pb-3.5 scrollbar-none">
            {suggestionChips.map((chip, index) => (
              <button
                key={index}
                onClick={() => handleSuggestionClick(chip.prompt)}
                className="flex-shrink-0 bg-orange-50 hover:bg-orange-100/75 border border-orange-100 hover:border-orange-200 text-orange-750 text-xs px-3.5 py-1.5 rounded-full transition-all active:scale-95 cursor-pointer font-bold"
              >
                {chip.text}
              </button>
            ))}
          </div>
        )}

        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Écrivez votre message à Nicole..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium placeholder-gray-400"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
              !input.trim() || isLoading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-orange-500 text-white shadow-md active:scale-90 hover:bg-orange-600 cursor-pointer'
            }`}
          >
            <Send className="w-5 h-5 ml-0.5" />
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-400 mt-3 px-6">
          Besoin d'un conseiller humain ? Posez une question complexe ou contactez directement DavidSTORE via WhatsApp.
        </p>
      </div>
    </div>
  );
};
