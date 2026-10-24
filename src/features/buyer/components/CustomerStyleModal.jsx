import React, { useState, useEffect } from "react";
import {
  X,
  Scissors,
  Camera,
  Calendar,
  User,
  Plus,
  Trash2,
  Clock,
  Upload,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Check,
} from "lucide-react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import moment from "moment";
import {
  useUploadCustomerStyleMutation,
  useUpdateCustomerStyleMutation,
  useDeleteCustomerStyleMutation,
} from "../../../store/api/tenantCrudEndpoints";
import {
  validateFileSize,
  getFileSizeHint,
  compressImages,
} from "../../../utils/fileUploadUtils";

const QUICK_STYLE_SUGGESTIONS = [
  "Skin Fade",
  "Low Fade",
  "Mid Fade",
  "Taper Fade",
  "Beard Trim & Shape",
  "Textured Crop",
  "Classic Scissor Cut",
  "Layered Cut",
  "Buzz Cut",
  "Hair Coloring",
];

const CustomerStyleModal = ({
  isOpen,
  onClose,
  customer,
  editingStyle = null,
  onSuccess,
  showSnack,
}) => {
  const [uploadCustomerStyle] = useUploadCustomerStyleMutation();
  const [updateCustomerStyle] = useUpdateCustomerStyleMutation();
  const [deleteCustomerStyleMut] = useDeleteCustomerStyleMutation();

  const [activeView, setActiveView] = useState("upload"); // "upload" | "history"
  const [title, setTitle] = useState("");
  const [cutDate, setCutDate] = useState(moment().format("YYYY-MM-DD"));
  const [stylist, setStylist] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [filePreviews, setFilePreviews] = useState([]);
  const [existingPhotos, setExistingPhotos] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [activeEditStyleId, setActiveEditStyleId] = useState(null);

  // Lightbox state
  const [lightboxData, setLightboxData] = useState(null);

  // Sync state when modal opens or editingStyle changes
  useEffect(() => {
    if (!isOpen) return;

    if (editingStyle) {
      setActiveEditStyleId(editingStyle._id);
      setTitle(editingStyle.title || "");
      setCutDate(
        editingStyle.cutDate
          ? moment(editingStyle.cutDate).format("YYYY-MM-DD")
          : moment().format("YYYY-MM-DD")
      );
      setStylist(editingStyle.stylist || "");
      setNotes(editingStyle.notes || "");
      setExistingPhotos(editingStyle.photos || []);
      setSelectedFiles([]);
      setFilePreviews([]);
      setActiveView("upload");
    } else {
      setActiveEditStyleId(null);
      setTitle("");
      setCutDate(moment().format("YYYY-MM-DD"));
      setStylist("");
      setNotes("");
      setExistingPhotos([]);
      setSelectedFiles([]);
      setFilePreviews([]);
      setActiveView("upload");
    }
  }, [isOpen, editingStyle, customer]);

  const [displayCustomer, setDisplayCustomer] = useState(customer);
  useEffect(() => {
    if (customer) setDisplayCustomer(customer);
  }, [customer]);

  const targetCustomer = customer || displayCustomer;
  const currentTotalPhotos = existingPhotos.length + selectedFiles.length;

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const availableSlots = 5 - currentTotalPhotos;
    if (availableSlots <= 0) {
      showSnack("Maximum 5 photos allowed per cut style", "warning");
      e.target.value = "";
      return;
    }

    const filesToAdd = files.slice(0, availableSlots);
    if (files.length > availableSlots) {
      showSnack(
        `Only ${availableSlots} more photo${availableSlots > 1 ? "s" : ""} can be added (Maximum 5 total).`,
        "warning"
      );
    }

    const validFiles = [];
    const newPreviews = [];

    for (const file of filesToAdd) {
      const validation = validateFileSize(file, 10);
      if (!validation.isValid) {
        showSnack(validation.message, "error");
        continue;
      }
      validFiles.push(file);
      newPreviews.push(URL.createObjectURL(file));
    }

    // Instantly show previews without waiting
    setSelectedFiles((prev) => [...prev, ...validFiles]);
    setFilePreviews((prev) => [...prev, ...newPreviews]);
    e.target.value = "";

    // Fast background compression in parallel (reduces MBs to KBs)
    try {
      const compressed = await compressImages(validFiles);
      setSelectedFiles((prev) => {
        const updated = [...prev];
        const startIdx = updated.length - validFiles.length;
        compressed.forEach((cf, idx) => {
          if (updated[startIdx + idx]) {
            updated[startIdx + idx] = cf;
          }
        });
        return updated;
      });
    } catch (err) {
      console.warn("Background compression error, falling back to original:", err);
    }
  };

  const handleRemoveNewPhoto = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setFilePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleRemoveExistingPhoto = (index) => {
    setExistingPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer?._id) {
      showSnack("Customer profile not found", "error");
      return;
    }

    if (!title.trim()) {
      showSnack("Please provide a style title (e.g. Skin Fade, Beard Trim)", "warning");
      return;
    }

    if (currentTotalPhotos === 0) {
      showSnack("Please upload at least 1 photo of the cut style", "warning");
      return;
    }

    setIsSaving(true);

    try {
      // 1. Fast parallel compression for any selected file
      const finalFiles = await compressImages(selectedFiles);

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("cutDate", cutDate);
      if (stylist.trim()) formData.append("stylist", stylist.trim());
      if (notes.trim()) formData.append("notes", notes.trim());

      if (activeEditStyleId) {
        formData.append("existingPhotos", JSON.stringify(existingPhotos));
      }

      finalFiles.forEach((file) => {
        formData.append("photos", file);
      });

      // 2. Optimistic instant UI update (Zero-lag experience!)
      const tempPhotos = [
        ...existingPhotos,
        ...filePreviews.map((url, i) => ({ url, _id: `temp-${Date.now()}-${i}` })),
      ];

      const optimisticStyle = {
        _id: activeEditStyleId || `temp-style-${Date.now()}`,
        title: title.trim(),
        cutDate: cutDate ? new Date(cutDate) : new Date(),
        stylist: stylist.trim(),
        notes: notes.trim(),
        photos: tempPhotos,
        createdAt: new Date(),
      };

      const currentStyles = customer?.styles || [];
      const optimisticStyles = activeEditStyleId
        ? currentStyles.map((s) => (s._id === activeEditStyleId ? optimisticStyle : s))
        : [optimisticStyle, ...currentStyles];

      // Immediately notify parent so sidesheet & table update instantly!
      onSuccess && onSuccess(optimisticStyles);
      showSnack(
        activeEditStyleId ? "Cut style updated successfully" : "Cut style saved successfully",
        "success"
      );
      onClose();

      // 3. Fast Redux RTK Query mutation in background
      if (activeEditStyleId) {
        const res = await updateCustomerStyle({
          customerId: customer._id,
          styleId: activeEditStyleId,
          body: formData,
        }).unwrap();
        if (res?.data) onSuccess && onSuccess(res.data);
      } else {
        const res = await uploadCustomerStyle({
          customerId: customer._id,
          body: formData,
        }).unwrap();
        if (res?.data) onSuccess && onSuccess(res.data);
      }
    } catch (err) {
      console.error("Error saving style:", err);
      showSnack(
        err?.data?.message || err?.message || "Failed to save cut style",
        "error"
      );
      // Revert optimistic update
      onSuccess && onSuccess(customer?.styles || []);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEditFromHistory = (style) => {
    setActiveEditStyleId(style._id);
    setTitle(style.title || "");
    setCutDate(
      style.cutDate
        ? moment(style.cutDate).format("YYYY-MM-DD")
        : moment().format("YYYY-MM-DD")
    );
    setStylist(style.stylist || "");
    setNotes(style.notes || "");
    setExistingPhotos(style.photos || []);
    setSelectedFiles([]);
    setFilePreviews([]);
    setActiveView("upload");
  };

  const handleDeleteStyle = async (styleId) => {
    if (!window.confirm("Are you sure you want to delete this cut style record?")) {
      return;
    }
    const previousStyles = customer?.styles || [];
    const remainingStyles = previousStyles.filter((s) => s._id !== styleId);
    onSuccess && onSuccess(remainingStyles);
    showSnack("Cut style deleted successfully", "success");

    try {
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
    }
  };

  const customerStyles = targetCustomer?.styles || [];

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            />

            {/* Sidesheet Container (Full Screen on Mobile, Sliding Drawer on Desktop) */}
            <Motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed top-0 right-0 h-full w-full sm:max-w-[650px] md:max-w-[700px] bg-white dark:bg-dark-surface shadow-2xl z-50 flex flex-col"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-200/50 dark:border-purple-800/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <Scissors size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base md:text-lg font-bold text-gray-900 dark:text-white">
                        {activeEditStyleId ? "Edit Cut Style" : "Upload Customer Cut Style"}
                      </h2>
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary dark:text-blue-400">
                        {targetCustomer?.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      Save up to 5 photos & haircut notes for 1-month return reference
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors bg-gray-100 dark:bg-dark-card text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-hover cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Navigation Tabs (Upload vs History) */}
              <div className="flex border-b border-gray-200 dark:border-dark-border px-4 md:px-6 bg-white dark:bg-dark-surface shrink-0 overflow-x-auto scrollbar-hide">
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("upload");
                  }}
                  className={`py-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
                    activeView === "upload"
                      ? "text-purple-600 dark:text-purple-400"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <Upload size={14} />
                  <span>{activeEditStyleId ? "Edit Style Details" : "Upload New Cut"}</span>
                  {activeView === "upload" && (
                    <Motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400"
                    />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveView("history")}
                  className={`py-3 px-4 text-xs font-bold transition-all relative flex items-center gap-2 ${
                    activeView === "history"
                      ? "text-purple-600 dark:text-purple-400"
                      : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white"
                  }`}
                >
                  <Clock size={14} />
                  <span>Cut History</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-gray-100 dark:bg-dark-card font-black">
                    {customerStyles.length}
                  </span>
                  {activeView === "history" && (
                    <Motion.div
                      layoutId="activeTabUnderline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-600 dark:bg-purple-400"
                    />
                  )}
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
              {activeView === "upload" ? (
                <form id="style-cut-form" onSubmit={handleSubmit} className="space-y-5">
                  {/* Photo Upload Area */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                        <Camera size={14} className="text-purple-600 dark:text-purple-400" />
                        <span>Cut Style Photos (Max 5)</span>
                        <span className="text-red-500">*</span>
                      </label>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          currentTotalPhotos === 5
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                        }`}
                      >
                        {currentTotalPhotos} / 5 photos
                      </span>
                    </div>

                    {/* Photo Thumbnails Grid */}
                    <div className="grid grid-cols-5 gap-2.5 mb-3">
                      {/* Existing Photos (when editing) */}
                      {existingPhotos.map((photo, index) => (
                        <div
                          key={`existing-${index}`}
                          className="relative aspect-square rounded-xl overflow-hidden border border-purple-200 dark:border-purple-800/60 group bg-gray-100 dark:bg-dark-card shadow-sm"
                        >
                          <img
                            src={photo.url}
                            alt={`Cut photo ${index + 1}`}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveExistingPhoto(index)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/70 text-white flex items-center justify-center opacity-90 hover:bg-red-600 transition-colors cursor-pointer"
                            title="Remove photo"
                          >
                            <X size={12} />
                          </button>
                          <span className="absolute bottom-1 left-1 text-[8px] font-black uppercase px-1 py-0.5 rounded bg-black/60 text-white">
                            Saved
                          </span>
                        </div>
                      ))}

                      {/* Newly Selected Previews */}
                      {filePreviews.map((preview, index) => (
                        <div
                          key={`new-${index}`}
                          className="relative aspect-square rounded-xl overflow-hidden border-2 border-purple-500 group bg-gray-100 dark:bg-dark-card shadow-sm"
                        >
                          <img
                            src={preview}
                            alt={`New preview ${index + 1}`}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveNewPhoto(index)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-md hover:bg-red-700 transition-colors cursor-pointer"
                            title="Remove photo"
                          >
                            <X size={12} />
                          </button>
                          <span className="absolute bottom-1 left-1 text-[8px] font-black uppercase px-1 py-0.5 rounded bg-purple-600 text-white">
                            New
                          </span>
                        </div>
                      ))}

                      {/* Add Slot Button if < 5 */}
                      {currentTotalPhotos < 5 && (
                        <label className="aspect-square rounded-xl border-2 border-dashed border-gray-300 dark:border-dark-border hover:border-purple-500 dark:hover:border-purple-400 bg-gray-50/50 dark:bg-dark-card/50 flex flex-col items-center justify-center gap-1 cursor-pointer transition-all hover:bg-purple-50/30">
                          <Plus size={20} className="text-gray-400 group-hover:text-purple-600" />
                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                            Add Photo
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleFileSelect}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500">
                      Upload front, sides, and back angles ({getFileSizeHint()})
                    </p>
                  </div>

                  {/* Title & Date */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        Style Name / Cut Type <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Low Skin Fade + Textured Top"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                        Cut Date
                      </label>
                      <div className="relative">
                        <input
                          type="date"
                          value={cutDate}
                          onChange={(e) => setCutDate(e.target.value)}
                          className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                        />
                        <Calendar
                          size={15}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Quick Suggestions Chips */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 dark:text-gray-500 tracking-wider mb-1.5">
                      Quick Suggestions
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_STYLE_SUGGESTIONS.map((sug) => (
                        <button
                          key={sug}
                          type="button"
                          onClick={() => setTitle(sug)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                            title === sug
                              ? "bg-purple-600 text-white shadow-sm"
                              : "bg-gray-100 dark:bg-dark-card text-gray-600 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-purple-950/40 hover:text-purple-600"
                          }`}
                        >
                          {sug}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stylist Name */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Stylist / Barber Name
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. Alex, Sam (optional)"
                        value={stylist}
                        onChange={(e) => setStylist(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all"
                      />
                      <User
                        size={15}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Notes / Instructions */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1.5">
                      Technique Notes & Cutting Preferences
                    </label>
                    <textarea
                      rows={3}
                      placeholder="e.g. Clipper guard #1.5 on sides, scissor blend on crown, parted on left, styled with matte clay..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full p-3 rounded-xl border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-surface text-gray-900 dark:text-white text-xs font-semibold focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none transition-all resize-none"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">
                      💡 When the customer returns next month, you can view these exact notes and photos.
                    </p>
                  </div>
                </form>
              ) : (
                /* History View */
                <div className="space-y-4">
                  {customerStyles.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-dark-card rounded-2xl border-2 border-dashed border-gray-200 dark:border-dark-border">
                      <Scissors size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                      <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300">
                        No Cut Styles Recorded Yet
                      </h4>
                      <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                        Switch to the "Upload New Cut" tab to add the customer's first haircut photos.
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveView("upload")}
                        className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-xl text-xs font-bold hover:bg-purple-700 transition-all shadow-sm"
                      >
                        + Upload First Cut Style
                      </button>
                    </div>
                  ) : (
                    customerStyles.map((item, idx) => {
                      const timeAgo = moment(item.cutDate || item.createdAt).fromNow();
                      const formattedDate = moment(item.cutDate || item.createdAt).format(
                        "DD MMM YYYY"
                      );
                      return (
                        <div
                          key={item._id || idx}
                          className="p-4 rounded-2xl border border-gray-100 dark:border-dark-border bg-white dark:bg-dark-card hover:shadow-md transition-all space-y-3"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                                  {item.title || "Cut Style"}
                                </h4>
                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 border border-purple-200/50">
                                  {timeAgo}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <span className="flex items-center gap-1 font-semibold">
                                  <Calendar size={13} className="text-gray-400" />
                                  {formattedDate}
                                </span>
                                {item.stylist && (
                                  <span className="flex items-center gap-1 font-semibold text-brand-primary dark:text-blue-400">
                                    <User size={13} />
                                    By {item.stylist}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleStartEditFromHistory(item)}
                                className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Edit style"
                              >
                                <Scissors size={15} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStyle(item._id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Delete style"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </div>

                          {item.notes && (
                            <p className="text-xs text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-dark-surface p-2.5 rounded-xl border border-gray-100 dark:border-dark-border italic">
                              "{item.notes}"
                            </p>
                          )}

                          {/* Photos Grid */}
                          {item.photos && item.photos.length > 0 && (
                            <div className="grid grid-cols-5 gap-2 pt-1">
                              {item.photos.map((photo, pIdx) => (
                                <div
                                  key={photo._id || pIdx}
                                  onClick={() =>
                                    setLightboxData({
                                      photos: item.photos,
                                      index: pIdx,
                                      title: item.title,
                                      date: formattedDate,
                                    })
                                  }
                                  className="relative aspect-square rounded-xl overflow-hidden bg-gray-100 dark:bg-dark-surface cursor-pointer group border border-gray-200/60 dark:border-dark-border"
                                >
                                  <img
                                    src={photo.url}
                                    alt={`Style view ${pIdx + 1}`}
                                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                                  />
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Maximize2 size={14} className="text-white" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-4 md:px-6 py-4 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-card shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="flex-1 px-4 py-2.5 bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-dark-card transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed text-xs"
              >
                Close
              </button>

              {activeView === "upload" && (
                <button
                  type="submit"
                  form="style-cut-form"
                  disabled={isSaving}
                  className="flex-1 px-5 py-2.5 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 active:scale-95 rounded-lg transition-all shadow-md shadow-purple-600/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Saving Cut Style...</span>
                    </>
                  ) : (
                    <>
                      <Scissors size={15} />
                      <span>{activeEditStyleId ? "Update Cut Style" : "Save Cut Style"}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </Motion.div>
        </>
      )}
    </AnimatePresence>

      {/* Lightbox Modal */}
      {lightboxData && (
        <AnimatePresence>
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <Motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLightboxData(null)}
              className="fixed inset-0 bg-black/90 backdrop-blur-md"
            />
            <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center z-10">
              {/* Header */}
              <div className="w-full flex items-center justify-between text-white pb-3 px-2">
                <div>
                  <h3 className="font-bold text-sm">{lightboxData.title}</h3>
                  <p className="text-xs text-gray-400">{lightboxData.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
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

              {/* Main Photo with Controls */}
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
    </>
  );
};

export default CustomerStyleModal;
