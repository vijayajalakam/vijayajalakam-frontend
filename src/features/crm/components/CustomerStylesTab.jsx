import React, { useState } from "react";
import {
  Scissors,
  Plus,
  Trash2,
  Calendar,
  User,
  Clock,
  Maximize2,
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
  Edit3,
} from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import moment from "moment";
import { useDeleteCustomerStyleMutation } from "../../../store/api/tenantCrudEndpoints";

const CustomerStylesTab = ({
  customer,
  onOpenUploadModal,
  onSuccess,
  showSnack,
}) => {
  const [deleteCustomerStyleMut] = useDeleteCustomerStyleMutation();
  const [lightboxData, setLightboxData] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const styles = customer?.styles || [];

  const handleDeleteStyle = async (styleId) => {
    if (!window.confirm("Are you sure you want to delete this cut style record?")) {
      return;
    }

    const previousStyles = customer?.styles || [];
    const remainingStyles = previousStyles.filter((s) => s._id !== styleId);
    onSuccess && onSuccess(remainingStyles);
    showSnack("Cut style deleted successfully", "success");

    try {
      setDeletingId(styleId);
      const res = await deleteCustomerStyleMut({
        customerId: customer._id,
        styleId,
      }).unwrap();
      if (res?.data) {
        onSuccess && onSuccess(res.data);
      }
    } catch (err) {
      showSnack(
        err?.data?.message || err?.message || "Failed to delete style",
        "error"
      );
      onSuccess && onSuccess(previousStyles);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-950/20 p-4 rounded-2xl border border-purple-100/80 dark:border-purple-900/30">
        <div>
          <h3 className="text-sm font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Scissors size={18} className="text-purple-600 dark:text-purple-400" />
            Customer Cut Styles
          </h3>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            View styles from before months so you can recreate their favorite cut
          </p>
        </div>
        <button
          type="button"
          onClick={() => onOpenUploadModal(null)}
          className="px-3.5 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all flex items-center gap-1.5 shadow-md shadow-purple-600/20 active:scale-95 cursor-pointer shrink-0"
        >
          <Plus size={15} />
          <span>Upload Style</span>
        </button>
      </div>

      {/* Empty State */}
      {styles.length === 0 ? (
        <div className="text-center py-14 bg-gray-50 dark:bg-dark-card/50 rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-border px-4">
          <div className="w-16 h-16 rounded-2xl bg-purple-50 dark:bg-purple-950/40 flex items-center justify-center mx-auto mb-3 text-purple-600 dark:text-purple-400">
            <Camera size={30} />
          </div>
          <h4 className="text-sm font-bold text-gray-800 dark:text-gray-200">
            No Cut Styles Recorded
          </h4>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Upload up to 5 photos and notes for this customer's haircut. When they visit after a month, you can easily reference their previous style.
          </p>
          <button
            type="button"
            onClick={() => onOpenUploadModal(null)}
            className="mt-4 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-purple-600/20 active:scale-95 cursor-pointer inline-flex items-center gap-2"
          >
            <Plus size={15} />
            <span>Upload First Cut Style</span>
          </button>
        </div>
      ) : (
        /* Styles Timeline */
        <div className="space-y-4">
          {styles.map((style, index) => {
            const timeAgo = moment(style.cutDate || style.createdAt).fromNow();
            const formattedDate = moment(style.cutDate || style.createdAt).format(
              "DD MMM YYYY"
            );
            const isLatest = index === 0;

            return (
              <Motion.div
                key={style._id || index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className={`p-4 md:p-5 rounded-2xl border transition-all ${
                  isLatest
                    ? "bg-white dark:bg-dark-card border-purple-200 dark:border-purple-800/60 shadow-sm"
                    : "bg-white dark:bg-dark-card border-gray-100 dark:border-dark-border hover:border-gray-200"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                        {style.title || "Cut Style"}
                      </h4>
                      {isLatest && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50">
                          Latest Cut
                        </span>
                      )}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200/50 flex items-center gap-1">
                        <Clock size={11} />
                        {timeAgo}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 font-semibold">
                        <Calendar size={13} className="text-gray-400" />
                        {formattedDate}
                      </span>
                      {style.stylist && (
                        <span className="flex items-center gap-1 font-semibold text-brand-primary dark:text-blue-400">
                          <User size={13} />
                          Stylist: {style.stylist}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onOpenUploadModal(style)}
                      className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors cursor-pointer"
                      title="Edit style"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStyle(style._id)}
                      disabled={deletingId === style._id}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      title="Delete style"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                {/* Notes */}
                {style.notes && (
                  <div className="p-3 rounded-xl bg-gray-50 dark:bg-dark-surface border border-gray-100 dark:border-dark-border text-xs text-gray-600 dark:text-gray-300 leading-relaxed mb-3">
                    <p className="font-medium">
                      <span className="font-bold text-gray-700 dark:text-gray-200">
                        Technique & Notes:{" "}
                      </span>
                      {style.notes}
                    </p>
                  </div>
                )}

                {/* Photos Grid */}
                {style.photos && style.photos.length > 0 ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider">
                        Cut Photos ({style.photos.length} / 5)
                      </span>
                      <span className="text-[10px] text-gray-400">
                        Click to enlarge
                      </span>
                    </div>
                    <div className="grid grid-cols-5 gap-2.5">
                      {style.photos.map((photo, pIdx) => (
                        <div
                          key={photo._id || pIdx}
                          onClick={() =>
                            setLightboxData({
                              photos: style.photos,
                              index: pIdx,
                              title: style.title,
                              date: formattedDate,
                            })
                          }
                          className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-surface cursor-pointer group border border-gray-200/60 dark:border-dark-border shadow-sm"
                        >
                          <img
                            src={photo.url}
                            alt={`Cut photo ${pIdx + 1}`}
                            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 size={15} className="text-white drop-shadow" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 italic">No photos attached</p>
                )}
              </Motion.div>
            );
          })}
        </div>
      )}

      {/* Lightbox Modal */}
      {lightboxData && (
        <AnimatePresence>
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxData(null)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md"
            />
            <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center z-10 w-full">
              {/* Top Bar */}
              <div className="w-full flex items-center justify-between text-white pb-3 px-2">
                <div>
                  <h3 className="font-bold text-sm">{lightboxData.title}</h3>
                  <p className="text-xs text-gray-400">{lightboxData.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 font-mono">
                    {lightboxData.index + 1} / {lightboxData.photos.length}
                  </span>
                  <button
                    onClick={() => setLightboxData(null)}
                    className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Main Photo with Navigation */}
              <div className="relative flex items-center justify-center overflow-hidden rounded-2xl">
                <img
                  src={lightboxData.photos[lightboxData.index]?.url}
                  alt={lightboxData.title}
                  className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl"
                />

                {lightboxData.photos.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setLightboxData((prev) => ({
                          ...prev,
                          index:
                            (prev.index - 1 + prev.photos.length) %
                            prev.photos.length,
                        }))
                      }
                      className="absolute left-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all cursor-pointer"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() =>
                        setLightboxData((prev) => ({
                          ...prev,
                          index: (prev.index + 1) % prev.photos.length,
                        }))
                      }
                      className="absolute right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition-all cursor-pointer"
                    >
                      <ChevronRight size={20} />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </AnimatePresence>
      )}
    </div>
  );
};

export default CustomerStylesTab;
