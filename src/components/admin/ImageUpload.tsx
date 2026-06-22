import React, { useState, useEffect } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../../config/firebase';
import { Camera, Link as LinkIcon, X, Check, Loader2, AlertCircle } from 'lucide-react';

interface ImageUploadProps {
  currentImageUrl?: string;
  onImageUploaded: (url: string) => void;
  productId?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ currentImageUrl, onImageUploaded, productId = 'temp' }) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
  const [urlInput, setUrlInput] = useState(currentImageUrl || '');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'file' | 'url'>('file');

  useEffect(() => {
    if (currentImageUrl) {
      setPreviewUrl(currentImageUrl);
      setUrlInput(currentImageUrl);
    }
  }, [currentImageUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to Firebase / Local Server Hybrid
    setUploading(true);
    setError(null);
    setSuccess(false);

    try {
      const timestamp = Date.now();
      let downloadUrl = '';

      // Try uploading to our local server first (extremely fast and doesn't depend on external Firebase activation)
      try {
        const fileToBase64 = (f: File): Promise<string> => {
          return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.readAsDataURL(f);
            r.onload = () => resolve(r.result as string);
            r.onerror = error => reject(error);
          });
        };

        const base64Image = await fileToBase64(file);
        const serverRes = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: base64Image,
            fileName: `${timestamp}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
          })
        });

        if (serverRes.ok) {
          const contentType = serverRes.headers.get("content-type");
          if (!contentType || !contentType.includes("application/json")) {
            throw new Error("Server returned non-JSON response");
          }
          const data = await serverRes.json();
          downloadUrl = data.imageUrl;
          console.log("Local server upload succeeded:", downloadUrl);
        } else {
          throw new Error("Server returned non-OK status");
        }
      } catch (serverErr) {
        console.warn("Failed to upload to local backend, falling back to Firebase Storage:", serverErr);
        
        // Fallback to Firebase Storage
        const storageRef = ref(storage, `products/${productId}/${timestamp}_${file.name}`);
        const uploadPromise = uploadBytes(storageRef, file);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Le délai de téléchargement a expiré (30s). Vérifiez votre connexion ou assurez-vous que Firebase Storage est activé dans votre console Firebase.')), 30000)
        );
        
        await Promise.race([uploadPromise, timeoutPromise]);
        downloadUrl = await getDownloadURL(storageRef);
      }
      
      onImageUploaded(downloadUrl);
      setUrlInput(downloadUrl);
      setSuccess(true);
      setError(null);
    } catch (err: any) {
      console.error("Storage upload error:", err);
      setError(err.message || "Échec du téléchargement. Essayez d'utiliser une URL d'image à la place.");
      setSuccess(false);
    } finally {
      setUploading(false);
    }
  };

  const handleUrlBlur = () => {
    if (urlInput && urlInput !== currentImageUrl) {
      setPreviewUrl(urlInput);
      onImageUploaded(urlInput);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-semibold text-gray-700">Image du produit</label>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`p-1 px-3 rounded-md text-xs font-medium transition-all ${activeTab === 'file' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500'}`}
          >
            Fichier
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('url')}
            className={`p-1 px-3 rounded-md text-xs font-medium transition-all ${activeTab === 'url' ? 'bg-white shadow-sm text-orange-600' : 'text-gray-500'}`}
          >
            URL
          </button>
        </div>
      </div>

      <div className="relative group">
        <div className="w-full h-48 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center overflow-hidden transition-colors hover:border-orange-300">
          {previewUrl ? (
            <>
              <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <button 
                  type="button"
                  onClick={() => { setPreviewUrl(null); setUrlInput(''); onImageUploaded(''); }}
                  className="p-2 bg-white rounded-full text-red-500 hover:scale-110 transition-transform"
                >
                  <X size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center p-6">
              <div className="mx-auto w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-gray-400 mb-2">
                {activeTab === 'file' ? <Camera size={24} /> : <LinkIcon size={24} />}
              </div>
              <p className="text-xs text-gray-500 font-medium">
                {activeTab === 'file' ? 'Cliquez pour choisir un fichier' : 'Lien vers l\'image'}
              </p>
            </div>
          )}
          
          {uploading && (
            <div className="absolute inset-0 bg-white/80 flex flex-col items-center justify-center z-10">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin mb-2" />
              <p className="text-xs font-bold text-gray-700 animate-pulse">Téléchargement en cours...</p>
            </div>
          )}
        </div>

        {activeTab === 'file' ? (
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
            disabled={uploading}
          />
        ) : (
          <div className="mt-2">
            <input
              type="text"
              placeholder="https://example.com/image.jpg"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onBlur={handleUrlBlur}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
            />
          </div>
        )}
      </div>

      {error && (
        <div className="flex flex-col gap-2 p-3 bg-red-50 text-red-600 rounded-lg text-xs animate-shake">
          <div className="flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
          <button 
            type="button"
            onClick={() => setActiveTab('url')}
            className="text-orange-600 font-bold hover:underline text-left mt-1"
          >
            → Utiliser un lien (URL) à la place
          </button>
        </div>
      )}

      {success && !uploading && (
        <div className="flex items-center gap-2 p-2 bg-green-50 text-green-600 rounded-lg text-xs">
          <Check size={14} />
          <p>Image téléchargée avec succès !</p>
        </div>
      )}
      
      {activeTab === 'file' && !error && !success && !uploading && (
        <p className="text-[10px] text-gray-400 italic">
          Tip: Si le fichier est trop lent à charger, utilisez l'onglet URL.
        </p>
      )}
    </div>
  );
};
