import React, { useState, useEffect } from 'react';
import { Category } from '../../models/types';
import { getCategories, addCategory, updateCategory, deleteCategory } from '../../services/productService';
import { Plus, Edit2, Trash2, Search, X, Tag } from 'lucide-react';
import { Button } from '../../components/Button';

export const AdminCategoriesScreen: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    setIsLoading(true);
    const cats = await getCategories();
    setCategories(cats);
    setIsLoading(false);
  };

  const handleOpenAdd = () => {
    setEditingCategory(null);
    setName('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (category: Category) => {
    setEditingCategory(category);
    setName(category.name || '');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSaving(true);
    setErrorMsg('');
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, { name });
      } else {
        await addCategory({ name });
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (error: any) {
      setErrorMsg(error.message || "Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCategory(categoryToDelete.id);
      setCategoryToDelete(null);
      fetchCategories();
    } catch (error: any) {
      alert("Erreur lors de la suppression : " + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredCategories = categories.filter(c => 
    (c.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Catégories</h2>
          <p className="text-gray-500 mt-1">Gérez les catégories de produits.</p>
        </div>
        <Button onClick={handleOpenAdd} className="flex items-center shadow-sm">
          <Plus className="w-5 h-5 mr-2" />
          Ajouter une catégorie
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Rechercher des catégories..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        {/* List */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-600 font-medium border-b border-gray-200 sticky top-0">
              <tr>
                <th className="px-6 py-4">Nom de la catégorie</th>
                <th className="px-6 py-4">Identifiant</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr><td colSpan={3} className="p-8 text-center text-gray-500">Chargement...</td></tr>
              ) : filteredCategories.length === 0 ? (
                <tr><td colSpan={3} className="p-8 text-center text-gray-500">Aucune catégorie trouvée.</td></tr>
              ) : (
                filteredCategories.map((category) => (
                  <tr key={category.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 flex items-center space-x-3">
                      <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                        <Tag className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-gray-900">{category.name || 'Sans nom'}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 font-mono text-xs">{category.id}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => handleOpenEdit(category)} className="p-2 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => setCategoryToDelete(category)} className="p-2 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50">
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
        <div className="fixed inset-0 bg-gray-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-6">{editingCategory ? 'Modifier la catégorie' : 'Ajouter une catégorie'}</h3>
            {errorMsg && <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">{errorMsg}</div>}
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                <input 
                  required 
                  type="text" 
                  value={name} 
                  onChange={e=>setName(e.target.value)} 
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500" 
                  autoFocus
                />
              </div>
              <Button isLoading={isSaving} type="submit" className="w-full mt-4">
                {editingCategory ? 'Mettre à jour' : 'Ajouter'}
              </Button>
            </form>
          </div>
        </div>
      )}

      {categoryToDelete && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-xs flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative">
            <h3 className="text-lg font-black text-gray-950 mb-2">Confirmer la suppression</h3>
            <p className="text-gray-600 text-sm leading-relaxed mb-5">
              Êtes-vous sûr de vouloir supprimer la catégorie <strong className="text-gray-950 font-bold">{categoryToDelete.name || 'Sans nom'}</strong> ?
            </p>
            <div className="flex items-center justify-end space-x-3">
              <Button variant="outline" onClick={() => setCategoryToDelete(null)} disabled={isDeleting}>
                Annuler
              </Button>
              <Button onClick={confirmDelete} isLoading={isDeleting} className="bg-red-600 hover:bg-red-700 text-white font-bold">
                Supprimer
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
