import React, { useState, useEffect, useCallback } from 'react';
import { Camera, X, Upload, Image as ImageIcon, ZoomIn, Check, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

// Configuración
const MAX_PHOTOS = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];

function PhotoGallery({ orderId, existingPhotos = [], onPhotosChange, readOnly = false }) {
  const [photos, setPhotos] = useState(existingPhotos || []);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [photoToDelete, setPhotoToDelete] = useState(null);
  const [photoToDeleteIndex, setPhotoToDeleteIndex] = useState(null);
  const [previewFiles, setPreviewFiles] = useState([]);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Sincronizar con cambios externos
  useEffect(() => {
    setPhotos(existingPhotos || []);
  }, [existingPhotos]);

  // Notificar cambios al padre
  const notificarCambio = useCallback((nuevasFotos) => {
    onPhotosChange?.(nuevasFotos);
  }, [onPhotosChange]);

  // Comprimir imagen antes de subir (reduce tamaño)
  const compressImage = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // ✅ MEJORA: Reducir tamaño máximo a 1200px (menos espacio)
          const maxDimension = 1200;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height * maxDimension) / width;
              width = maxDimension;
            } else {
              width = (width * maxDimension) / height;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // ✅ MEJORA: Comprimir a 70% calidad (menos espacio que 80%)
          canvas.toBlob((blob) => {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            console.log(`📸 Compresión: ${(file.size / 1024).toFixed(0)}KB → ${(compressedFile.size / 1024).toFixed(0)}KB (${Math.round((1 - compressedFile.size / file.size) * 100)}% menos)`);
            resolve(compressedFile);
          }, 'image/jpeg', 0.7);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  }, []);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validar límite máximo de fotos
    if (photos.length + files.length > MAX_PHOTOS) {
      alert(`Máximo ${MAX_PHOTOS} fotos por orden. Actualmente tienes ${photos.length} fotos.`);
      return;
    }

    // Mostrar preview antes de subir
    const previews = files.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      size: file.size
    }));
    setPreviewFiles(previews);
    setShowPreviewModal(true);
    
    // Limpiar input
    e.target.value = '';
  };

  const confirmUpload = async () => {
    setUploading(true);
    setShowPreviewModal(false);
    
    try {
      const newPhotos = [];
      
      for (let i = 0; i < previewFiles.length; i++) {
        const { file, name } = previewFiles[i];
        
        setUploadProgress(prev => ({ ...prev, [name]: 'comprimiendo' }));
        
        // ✅ MEJORA: Comprimir SIEMPRE, no solo si es mayor a 1MB
        let fileToUpload = file;
        try {
          fileToUpload = await compressImage(file);
          console.log(`✅ Comprimido: ${name}`);
        } catch (err) {
          console.warn('Error comprimiendo, usando original:', err);
        }
        
        setUploadProgress(prev => ({ ...prev, [name]: 'subiendo' }));
        
        const fileExt = 'jpg'; // Todas se convierten a jpg
        const fileName = `${orderId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('ordenes-fotos')
          .upload(fileName, fileToUpload, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage
          .from('ordenes-fotos')
          .getPublicUrl(fileName);
        
        newPhotos.push(publicUrl);
        setUploadProgress(prev => ({ ...prev, [name]: 'completado' }));
      }
      
      const updatedPhotos = [...photos, ...newPhotos];
      setPhotos(updatedPhotos);
      notificarCambio(updatedPhotos);
      
    } catch (error) {
      console.error('Error subiendo fotos:', error);
      alert('Error al subir fotos: ' + error.message);
    } finally {
      setUploading(false);
      setUploadProgress({});
      // Limpiar previews
      previewFiles.forEach(p => URL.revokeObjectURL(p.preview));
      setPreviewFiles([]);
    }
  };

  const cancelUpload = () => {
    previewFiles.forEach(p => URL.revokeObjectURL(p.preview));
    setPreviewFiles([]);
    setShowPreviewModal(false);
  };

  const handleDeletePhoto = (photoUrl, index) => {
    setPhotoToDelete(photoUrl);
    setPhotoToDeleteIndex(index);
    setShowDeleteModal(true);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;

    try {
      // Extraer el path de la URL
      const urlParts = photoToDelete.split('/');
      const fileName = urlParts.slice(urlParts.indexOf('ordenes-fotos') + 1).join('/');
      
      const { error } = await supabase.storage
        .from('ordenes-fotos')
        .remove([fileName]);
      
      if (error) throw error;
      
      const updatedPhotos = photos.filter((_, i) => i !== photoToDeleteIndex);
      setPhotos(updatedPhotos);
      notificarCambio(updatedPhotos);
      
      setShowDeleteModal(false);
      setPhotoToDelete(null);
      setPhotoToDeleteIndex(null);
      
    } catch (error) {
      console.error('Error eliminando foto:', error);
      alert('Error al eliminar foto: ' + error.message);
    }
  };

  const openPhotoModal = (photo) => {
    setSelectedPhoto(photo);
  };

  return (
    <div className="space-y-4">
      {/* Modal de confirmación para eliminar */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
            <div className="bg-red-50 p-6 rounded-t-2xl border-b border-red-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Eliminar foto</h3>
                  <p className="text-sm text-gray-600">Esta acción no se puede deshacer</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-gray-700">¿Estás seguro de que quieres eliminar esta foto?</p>
              <p className="text-xs text-gray-500 mt-2">La foto se eliminará permanentemente del almacenamiento.</p>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeletePhoto}
                className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <X className="w-4 h-4" />
                <span>Eliminar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de preview antes de subir */}
      {showPreviewModal && previewFiles.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
            <div className="bg-gray-50 p-6 rounded-t-2xl border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <ImageIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">Previsualizar fotos</h3>
                  <p className="text-sm text-gray-600">
                    {previewFiles.length} {previewFiles.length === 1 ? 'foto' : 'fotos'} para subir
                  </p>
                </div>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {previewFiles.map((preview, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={preview.preview}
                      alt={preview.name}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
                    <div className="absolute bottom-1 right-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                      {(preview.size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-green-50 rounded-lg text-xs text-green-700">
                ✅ Las fotos se comprimirán automáticamente al subir (70% calidad, máx 1200px)
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end space-x-3">
              <button
                onClick={cancelUpload}
                className="px-5 py-2.5 border border-gray-300 rounded-xl hover:bg-gray-100 transition-colors font-medium"
                disabled={uploading}
              >
                Cancelar
              </button>
              <button
                onClick={confirmUpload}
                disabled={uploading}
                className="px-5 py-2.5 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors flex items-center space-x-2 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" />
                    <span>Subiendo...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Subir {previewFiles.length} {previewFiles.length === 1 ? 'foto' : 'fotos'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver foto ampliada */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4 cursor-pointer"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <img
              src={selectedPhoto}
              alt="Foto ampliada"
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors p-2"
            >
              <X className="w-8 h-8" />
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700 flex items-center">
          <Camera className="w-4 h-4 mr-2 text-gray-600" />
          Fotos de la joya
        </h3>
        <span className="text-xs text-gray-500">
          {photos.length} / {MAX_PHOTOS} {photos.length === 1 ? 'foto' : 'fotos'}
        </span>
      </div>

      {/* Grid de fotos existentes */}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo, index) => (
            <div key={`${photo}_${index}`} className="relative group aspect-square">
              <button
                onClick={() => openPhotoModal(photo)}
                className="w-full h-full overflow-hidden rounded-xl border border-gray-200 hover:border-gray-400 transition-all hover:shadow-md"
              >
                <img
                  src={photo}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
              {!readOnly && (
                <button
                  onClick={() => handleDeletePhoto(photo, index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 shadow-lg"
                  title="Eliminar foto"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => openPhotoModal(photo)}
                className="absolute bottom-2 right-2 bg-black/60 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all hover:bg-black/80"
                title="Ampliar"
              >
                <ZoomIn className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Indicador de upload en progreso */}
      {uploading && Object.keys(uploadProgress).length > 0 && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="space-y-2">
            {Object.entries(uploadProgress).map(([name, status]) => (
              <div key={name} className="flex items-center justify-between text-xs">
                <span className="text-gray-600 truncate max-w-[200px]">{name}</span>
                <div className="flex items-center space-x-2">
                  {status === 'comprimiendo' && (
                    <>
                      <Loader className="w-3 h-3 animate-spin text-gray-500" />
                      <span className="text-gray-500">Comprimiendo...</span>
                    </>
                  )}
                  {status === 'subiendo' && (
                    <>
                      <Loader className="w-3 h-3 animate-spin text-blue-500" />
                      <span className="text-blue-500">Subiendo...</span>
                    </>
                  )}
                  {status === 'completado' && (
                    <>
                      <Check className="w-3 h-3 text-green-500" />
                      <span className="text-green-500">Completado</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botón de subida - solo si no es solo lectura */}
      {!readOnly && (
        <>
          {photos.length >= MAX_PHOTOS ? (
            <div className="bg-yellow-50 rounded-lg p-4 text-center border border-yellow-200">
              <AlertCircle className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
              <p className="text-sm text-yellow-700">Has alcanzado el límite máximo de {MAX_PHOTOS} fotos</p>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-gray-400 transition-all hover:bg-gray-50 cursor-pointer">
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/jpg,image/webp"
                onChange={handleFileSelect}
                className="hidden"
                id="photo-upload"
                disabled={uploading}
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mb-3"></div>
                    <span className="text-sm text-gray-600">Subiendo fotos...</span>
                    <span className="text-xs text-gray-400 mt-1">No cierres la página</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-10 h-10 text-gray-400 mb-3" />
                    <span className="text-sm font-medium text-gray-700">Haz clic para subir fotos</span>
                    <span className="text-xs text-gray-400 mt-1">
                      {ALLOWED_TYPES.map(t => t.split('/')[1].toUpperCase()).join(', ')} hasta 5MB por foto
                    </span>
                    <span className="text-xs text-gray-400">
                      Máximo {MAX_PHOTOS} fotos | Quedan {MAX_PHOTOS - photos.length}
                    </span>
                  </>
                )}
              </label>
            </div>
          )}
        </>
      )}

      {/* Mensaje informativo */}
      {photos.length === 0 && !readOnly && (
        <p className="text-xs text-gray-400 text-center">
          📸 Las fotos ayudan al taller a identificar mejor la joya
        </p>
      )}
    </div>
  );
}

export default PhotoGallery;