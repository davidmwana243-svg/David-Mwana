import React, { useState, useEffect } from 'react';
import { Product, Category } from '../../models/types';
import { getProducts, addProduct, updateProduct, deleteProduct, getCategories } from '../../services/productService';
import { Plus, Edit2, Trash2, Search, Filter, X } from 'lucide-react';
import { Button } from '../../components/Button';
import { ImageUpload } from '../../components/admin/ImageUpload';

export const AdminProductsScreen: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('0');
  const [stock, setStock] = useState('0');
  const [category, setCategory] = useState('c1');
  const [imageUrl, setImageUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchProducts = async () => {
    setIsLoading(true);
    const prods = await getProducts();
    setProducts(prods);
    setIsLoading(false);
  };

  const fetchCategories = async () => {
    const cats = await getCategories();
    setCategories(cats);
  };

  useEffect(() => {
    if (categories.length > 0 && category === 'c1') {
      setCategory(categories[0].id);
    }
  }, [categories, category]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setName('');
    setDescription('');
    setPrice('0');
    setStock('0');
    setCategory(categories[0]?.id || 'mode');
    setImageUrl('');
    setSuccessMsg('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setName(product.name);
    setDescription(product.description);
    setPrice(product.price.toString());
    setStock(product.stock.toString());
    setCategory(product.category);
    setImageUrl(product.imageUrl);
    setSuccessMsg('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');
    console.log("handleSave started", { name, price, stock, category, imageUrl });
    try {
      const parsedPrice = parseFloat(price) || 0;
      const parsedStock = parseInt(stock) || 0;
      
      if (editingProduct) {
        console.log("Updating existing product:", editingProduct.id);
        await updateProduct(editingProduct.id, {
          name, description, 
          price: parsedPrice, 
          stock: parsedStock, 
          category,
          imageUrl
        });
        setSuccessMsg('Produit mis à jour avec succès');
      } else {
        console.log("Adding new product");
        // Better defaults based on category if no image provided
        let finalImageUrl = imageUrl;
        if (!finalImageUrl) {
          if (category === 'mode' || category === 'c1' || name.toLowerCase().includes('robe')) {
            finalImageUrl = 'https://images.unsplash.com/photo-1539008835272-35996020ce6b?w=800&q=80'; // Dress
          } else if (category === 'electronics') {
            finalImageUrl = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&q=80'; // Headphones
          } else {
            finalImageUrl = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80'; // Watch
          }
        }

        const productData: Omit<Product, 'id' | 'createdAt'> = {
          name, 
          description, 
          price: parsedPrice, 
          stock: parsedStock, 
          category,
          imageUrl: finalImageUrl,
          images: [finalImageUrl], 
          rating: 0, 
          reviewsCount: 0, 
          salesCount: 0
        };
        await addProduct(productData);
        setSuccessMsg('Produit ajouté avec succès');
      }
      
      setTimeout(() => {
        setIsModalOpen(false);
        fetchProducts();
      }, 1500);
    } catch (error: any) {
      console.error("handleSave error:", error);
      setErrorMsg("Erreur : " + (error.message || "Erreur inconnue."));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Voulez-vous vraiment supprimer ce produit ?')) {
      await deleteProduct(id);
      fetchProducts();
    }
  };

  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Produits</h2>
          <p className="text-gray-500 mt-1">Gérez le catalogue de votre boutique.</p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center shadow-sm">
          <Plus className="w-5 h-5 mr-2" />
          Ajouter un produit
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Rechercher des produits..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
          </div>
          <Button variant="outline" className="w-full sm:w-auto bg-white">
            <Filter className="w-4 h-4 mr-2 text-gray-500" />
            Filtres
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-6 py-4">Produit</th>
                <th className="px-6 py-4">Catégorie</th>
                <th className="px-6 py-4">Prix</th>
                <th className="px-6 py-4">Stock</th>
                <th className="px-6 py-4">Ventes</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Chargement...</td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Aucun produit trouvé.</td></tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 flex-shrink-0">
                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 line-clamp-1 max-w-[200px]">{product.name}</p>
                        <p className="text-xs text-gray-500">ID: {product.id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {categories.find(c => c.id === product.category)?.name || product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-900">{product.price.toFixed(2)} FC</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.stock > 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {product.stock} en stock
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{product.salesCount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => handleOpenEdit(product)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(product.id)} className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-6">{editingProduct ? 'Modifier le produit' : 'Ajouter un produit'}</h3>
            {errorMsg && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{errorMsg}</div>}
            {successMsg && <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-lg text-sm">{successMsg}</div>}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input required type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea required value={description} onChange={e=>setDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 resize-none" rows={3}></textarea>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prix</label>
                  <input required type="number" step="0.01" value={price} onChange={e=>setPrice(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                  <input required type="number" value={stock} onChange={e=>setStock(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
                <select 
                  required 
                  value={category} 
                  onChange={e=>setCategory(e.target.value)} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500 bg-white"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <ImageUpload 
                  currentImageUrl={imageUrl} 
                  onImageUploaded={(url) => setImageUrl(url)} 
                  productId={editingProduct?.id} 
                />
              </div>
              <Button isLoading={isSaving} type="submit" className="w-full mt-4">
                {editingProduct ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
