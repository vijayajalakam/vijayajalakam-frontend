import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Save,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import api from "../../api/axiosInstance";
import Modal from "./Modal";

const BulkImageProgressModal = ({
  isOpen,
  onClose,
  items,
  onComplete,
  type = "product", // "product" or "service"
}) => {
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState(0);


  const handleInitialSearch = useCallback(async () => {
    setIsSearching(true);
    const initialResults = items.map((item) => ({
      ...item,
      status: "searching",
      imageUrl: null,
      error: null,
    }));
    setResults(initialResults);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        const res = await api.get("/image-generation/search", {
          params: {
            query: item.name,
            per_page: 10,
          },
        });

        const images = res.data?.data || [];
        const imageUrl = images[0]?.urls?.regular;

        if (imageUrl) {
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? {
                    ...r,
                    status: "ready",
                    imageUrl: imageUrl,
                    images: images,
                    currentImageIndex: 0,
                  }
                : r,
            ),
          );
        } else {
          setResults((prev) =>
            prev.map((r, idx) =>
              idx === i
                ? { ...r, status: "not_found", error: "No image found" }
                : r,
            ),
          );
        }
      } catch (err) {
        console.error(`Search failed for ${item.name}:`, err);
        setResults((prev) =>
          prev.map((r, idx) =>
            idx === i ? { ...r, status: "error", error: "Search failed" } : r,
          ),
        );
      }
    }
    setIsSearching(false);
  }, [items]);

  const handleRefreshImage = (itemId) => {
    setResults((prev) =>
      prev.map((r) => {
        if (r._id === itemId && r.images && r.images.length > 1) {
          const nextIndex = (r.currentImageIndex + 1) % r.images.length;
          return {
            ...r,
            currentImageIndex: nextIndex,
            imageUrl: r.images[nextIndex].urls.regular,
          };
        }
        return r;
      }),
    );
  };

  useEffect(() => {
    if (isOpen && items.length > 0) {
      handleInitialSearch();
    } else {
      setResults([]);
      setSaveProgress(0);
      setIsSaving(false);
    }
  }, [isOpen, items, handleInitialSearch]);

  const handleSaveAll = async () => {
    setIsSaving(true);
    const readyItems = results.filter(
      (r) => r.status === "ready" && r.imageUrl,
    );

    for (let i = 0; i < readyItems.length; i++) {
      const item = readyItems[i];
      try {
        setResults((prev) =>
          prev.map((r) =>
            r._id === item._id ? { ...r, status: "saving" } : r,
          ),
        );

        const response = await fetch(item.imageUrl);
        const blob = await response.blob();
        const filename = `${item.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.jpg`;
        const file = new File([blob], filename, { type: "image/jpeg" });

        const formData = new FormData();
        formData.append("image", file);
        const config = { headers: { "Content-Type": "multipart/form-data" } };

        const endpoint =
          type === "product"
            ? `/products/${item._id}`
            : `/services/${item._id}`;
        await api.put(endpoint, formData, config);

        setResults((prev) =>
          prev.map((r) =>
            r._id === item._id ? { ...r, status: "completed" } : r,
          ),
        );
        setSaveProgress(i + 1);
      } catch (err) {
        console.error(`Save failed for ${item.name}:`, err);
        setResults((prev) =>
          prev.map((r) =>
            r._id === item._id
              ? { ...r, status: "error", error: "Save failed" }
              : r,
          ),
        );
      }
    }

    setIsSaving(false);
    setTimeout(() => {
      onComplete();
      onClose();
    }, 1000);
  };

  const readyCount = results.filter(
    (r) => r.status === "ready" || r.status === "completed",
  ).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={isSaving ? undefined : onClose}
      title="Bulk Image Generation"
      size="lg"
      footer={
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-2.5 bg-gray-100 dark:bg-dark-card text-gray-700 dark:text-gray-300 font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-gray-200 dark:hover:bg-dark-border transition-all disabled:opacity-50"
          >
            {isSaving ? "Wait..." : "Cancel"}
          </button>
          <button
            onClick={handleSaveAll}
            disabled={isSearching || isSaving || readyCount === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-primary text-white font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-brand-primary-dark transition-all active:scale-95 disabled:opacity-50 shadow-lg shadow-brand-primary/20"
          >
            {isSaving ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                <span>
                  Saving {saveProgress}/{readyCount}
                </span>
              </>
            ) : (
              <>
                <Save size={14} />
                <span>Save {readyCount} Images</span>
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="bg-blue-50 dark:bg-blue-900/20/50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3">
          <div className="bg-blue-100 p-2 rounded-xl text-blue-600">
            <Sparkles size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-1">
              AI Image Curation
            </h4>
            <p className="text-[11px] text-blue-700 font-medium leading-relaxed">
              We are automatically finding relevant images for your
              selected items. Review the previews below and click save to apply
              them.
            </p>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
          <AnimatePresence mode="popLayout">
            {results.map((item) => (
              <motion.div
                key={item._id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 p-3 bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border rounded-2xl hover:border-brand-primary/30 transition-all group"
              >
                <div className="w-14 h-14 rounded-xl bg-gray-50 dark:bg-dark-card border border-gray-100 dark:border-dark-border overflow-hidden flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : item.status === "searching" ||
                    item.status === "saving" ? (
                    <Loader2
                      size={18}
                      className="text-brand-primary dark:text-blue-400 animate-spin"
                    />
                  ) : item.status === "error" || item.status === "not_found" ? (
                    <AlertCircle size={18} className="text-red-400" />
                  ) : (
                    <ImageIcon size={18} className="text-gray-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <h5 className="text-[13px] font-bold text-gray-900 dark:text-white truncate mb-0.5">
                    {item.name}
                  </h5>
                  <div className="flex items-center gap-1.5">
                    {item.status === "searching" && (
                      <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">
                        Searching...
                      </span>
                    )}
                    {item.status === "ready" && (
                      <span className="text-[10px] font-bold text-green-500 uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 size={10} /> Image Found
                      </span>
                    )}
                    {item.status === "saving" && (
                      <span className="text-[10px] font-bold text-brand-primary dark:text-blue-400 uppercase tracking-widest animate-pulse">
                        Saving to database...
                      </span>
                    )}
                    {item.status === "completed" && (
                      <span className="text-[10px] font-bold text-brand-primary dark:text-blue-400 uppercase tracking-widest flex items-center gap-1">
                        <CheckCircle2 size={10} /> Successfully Saved
                      </span>
                    )}
                    {item.status === "not_found" && (
                      <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest">
                        No results found
                      </span>
                    )}
                    {item.status === "error" && (
                      <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                        {item.error}
                      </span>
                    )}
                  </div>
                </div>

                {item.status === "completed" && (
                  <div className="bg-green-50 text-green-600 p-2 rounded-full">
                    <CheckCircle2 size={16} />
                  </div>
                )}
                {item.status === "ready" &&
                  item.images &&
                  item.images.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRefreshImage(item._id)}
                      className="p-2 text-gray-400 hover:text-brand-primary dark:text-blue-400 hover:bg-brand-primary/10 rounded-full transition-all"
                      title="Get a different image"
                    >
                      <RefreshCw size={16} />
                    </button>
                  )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
};

export default BulkImageProgressModal;
