import React, { useState, useEffect, useCallback } from "react";
import { Search, Image as ImageIcon, X, Loader2, Check } from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import api from "../../api/axiosInstance";
import Modal from "./Modal";

const ImageGenerationModal = ({ isOpen, onClose, onSelect, searchQuery }) => {
  const [query, setQuery] = useState(searchQuery || "");
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  const searchImages = useCallback(
    async (searchQuery) => {
      if (!searchQuery) return;
      setLoading(true);
      setError(null);
      try {
        const response = await api.get("/image-generation/search", {
          params: {
            query: searchQuery,
            per_page: 20,
          },
        });
        setImages(response.data.data);
      } catch (err) {
        console.error("Image Generation API Error:", err);
        setError("Failed to fetch images. Please check your connection.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (isOpen && searchQuery) {
      setQuery(searchQuery);
      searchImages(searchQuery);
    }
    // Reset uploading state when modal opens
    if (isOpen) {
      setUploading(false);
    }
  }, [isOpen, searchQuery, searchImages]);

  const handleSearch = (e) => {
    e.preventDefault();
    searchImages(query);
  };

  const handleSelect = (img) => {
    if (uploading) return; // Prevent selection changes during upload
    setSelectedId(img.id);
  };

  const handleConfirm = async () => {
    const selectedImg = images.find((img) => img.id === selectedId);
    if (selectedImg && onSelect) {
      setUploading(true);
      try {
        await onSelect(selectedImg.urls.regular);
        // Only close after upload completes successfully
        onClose();
      } catch (err) {
        // If upload fails, stay on the modal so user can retry
        console.error("Image upload failed:", err);
        setUploading(false);
      }
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={uploading ? undefined : onClose}
      title="Auto Image Generation"
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className={`flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-all ${
              uploading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-gray-200 dark:hover:bg-dark-border dark:bg-dark-border cursor-pointer"
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedId || uploading}
            className={`flex-1 px-4 py-2.5 font-medium rounded-lg shadow-sm transition-all active:scale-95 ${
              selectedId && !uploading
                ? "bg-brand-primary hover:bg-brand-secondary text-white"
                : "bg-gray-100 dark:bg-dark-card text-gray-400 dark:text-gray-500 cursor-not-allowed"
            }`}
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Uploading...
              </span>
            ) : (
              "Use Selected Image"
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4 relative">
        {/* Upload overlay inside the modal content */}
        {uploading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-dark-card/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-xl gap-3">
            <div className="w-14 h-14 rounded-full bg-brand-primary/10 flex items-center justify-center">
              <Loader2 size={28} className="animate-spin text-brand-primary dark:text-blue-400" />
            </div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">Uploading image...</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">Please wait while we save your image</p>
          </div>
        )}

        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for images..."
            disabled={uploading}
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 dark:border-dark-border rounded-xl text-sm font-medium focus:bg-white dark:bg-dark-surface focus:border-brand-primary outline-none transition-all disabled:opacity-50"
          />
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <button
            type="submit"
            disabled={uploading}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-brand-primary text-white text-xs font-bold rounded-lg hover:bg-brand-secondary transition-all disabled:opacity-50"
          >
            Search
          </button>
        </form>

        <div className="min-h-[300px] max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {loading ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-3">
              <Loader2 className="animate-spin" size={32} />
              <p className="text-sm font-medium">Curating beautiful images...</p>
            </div>
          ) : error ? (
            <div className="h-[300px] flex flex-col items-center justify-center text-red-500 gap-3 text-center">
              <p className="text-sm font-medium">{error}</p>
            </div>
          ) : images.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 pb-2">
              <AnimatePresence>
                {images.map((img) => (
                  <Motion.div
                    key={img.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={uploading ? {} : { scale: 1.02 }}
                    onClick={() => handleSelect(img)}
                    className={`relative aspect-video rounded-xl overflow-hidden border-2 transition-all ${
                      uploading ? "pointer-events-none" : "cursor-pointer"
                    } ${
                      selectedId === img.id
                        ? "border-brand-primary ring-2 ring-brand-primary/20 shadow-lg"
                        : "border-transparent hover:border-gray-200 dark:border-dark-border"
                    }`}
                  >
                    <img
                      src={img.urls.small}
                      alt={img.alt_description}
                      className="w-full h-full object-cover"
                    />
                    {selectedId === img.id && (
                      <div className="absolute inset-0 bg-brand-primary/20 flex items-center justify-center backdrop-blur-[1px]">
                        <div className="bg-brand-primary text-white p-1 rounded-full shadow-lg">
                          <Check size={16} strokeWidth={3} />
                        </div>
                      </div>
                    )}
                    <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/60 to-transparent">
                      <p className="text-[9px] text-white font-medium truncate">
                         By {img.user.name}
                      </p>
                    </div>
                  </Motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <div className="h-[300px] flex flex-col items-center justify-center text-gray-300 gap-3">
              <ImageIcon size={48} strokeWidth={1.5} />
              <p className="text-sm font-medium">
                No images found. Try a different search.
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ImageGenerationModal;
