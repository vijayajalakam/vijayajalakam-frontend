import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import api from "../../../api/axiosInstance";
import Snackbar from "../../../components/shared/Snackbar";
import {
  Globe,
  Smartphone,
  Monitor,
  ExternalLink,
  RotateCcw,
  Palette,
  Layout,
  Eye,
  CheckCircle2,
  Menu,
  Home,
  Users,
  Settings,
  ShoppingBag,
  Layers,
  Save,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  AlignJustify,
  Grid,
  Package,
  ClipboardList,
  CreditCard,
  BarChart3,
  FileText,
  Truck,
  AlertTriangle,
  MinusCircle,
  Scissors,
  Plus,
  Minus,
  Heart,
  UserRound,
  ImagePlus,
  Trash2,
  Star,
  Search,
  X,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../../auth/hooks/useAuth";
import { toast } from "react-hot-toast";
import CustomDropdown from "../../../components/shared/CustomDropdown";

const PREVIEW_TABS = [
  { id: "appearance", label: "Shop Appearance", icon: Palette },
  { id: "sidebar", label: "Sidebar", icon: Layout },
  { id: "button-design", label: "Button Design", icon: AlignJustify },
  { id: "user-side", label: "User Side", icon: UserRound },
];

// Unsplash API - uses backend proxy
const GalleryManager = () => {
  const [galleryImages, setGalleryImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [unsplashQuery, setUnsplashQuery] = useState("");
  const [unsplashResults, setUnsplashResults] = useState([]);
  const [unsplashLoading, setUnsplashLoading] = useState(false);
  const [showUnsplash, setShowUnsplash] = useState(false);
  const [snack, setSnack] = useState({ show: false, message: "", type: "success" });
  const fileInputRef = useRef(null);

  // Fetch gallery images
  const fetchGallery = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/profile");
      if (res.data.success) {
        setGalleryImages(res.data.data?.businessProfile?.galleryImages || res.data.data?.business?.galleryImages || []);
      }
    } catch (err) {
      console.error("Failed to fetch gallery:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGallery(); }, [fetchGallery]);

  // Upload images
  const handleUpload = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (galleryImages.length + files.length > 10) {
      setSnack({ show: true, message: `Maximum 10 images allowed. You have ${galleryImages.length}.`, type: "error" });
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("images", files[i]);
    }

    try {
      setUploading(true);
      const res = await api.post("/admin/gallery", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data.success) {
        setGalleryImages(res.data.data);
        setSnack({ show: true, message: "Images uploaded successfully", type: "success" });
      }
    } catch (err) {
      setSnack({ show: true, message: err.response?.data?.message || "Upload failed", type: "error" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Delete image
  const handleDelete = async (imageId) => {
    try {
      const res = await api.delete(`/admin/gallery/${imageId}`);
      if (res.data.success) {
        setGalleryImages(res.data.data);
        setSnack({ show: true, message: "Image deleted", type: "success" });
      }
    } catch (err) {
      setSnack({ show: true, message: "Failed to delete image", type: "error" });
    }
  };

  // Set primary
  const handleSetPrimary = async (imageId) => {
    try {
      const res = await api.put(`/admin/gallery/${imageId}/primary`);
      if (res.data.success) {
        setGalleryImages(res.data.data);
        setSnack({ show: true, message: "Primary image updated", type: "success" });
      }
    } catch (err) {
      setSnack({ show: true, message: "Failed to set primary", type: "error" });
    }
  };

  // Unsplash search
  const searchUnsplash = async () => {
    if (!unsplashQuery.trim()) return;
    try {
      setUnsplashLoading(true);
      const res = await api.get(`/admin/gallery/unsplash/search?query=${encodeURIComponent(unsplashQuery)}`);
      if (res.data.success) {
        setUnsplashResults(res.data.data);
      }
    } catch (err) {
      setSnack({ show: true, message: "Failed to search Unsplash", type: "error" });
    } finally {
      setUnsplashLoading(false);
    }
  };

  // Add unsplash image
  const handleAddUnsplash = async (imageUrl) => {
    if (galleryImages.length >= 10) {
      setSnack({ show: true, message: "Maximum 10 images allowed", type: "error" });
      return;
    }
    try {
      const res = await api.post("/admin/gallery/unsplash", { url: imageUrl });
      if (res.data.success) {
        setGalleryImages(res.data.data);
        setSnack({ show: true, message: "Image added from Unsplash", type: "success" });
      }
    } catch (err) {
      setSnack({ show: true, message: err.response?.data?.message || "Failed to add image", type: "error" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-dark-card rounded-[1.5rem] border border-gray-100 dark:border-dark-border p-6 mb-6 shadow-none"
    >
      <div className="flex items-center justify-between gap-3 mb-6 border-b border-gray-100 dark:border-dark-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary dark:text-blue-400">
            <ImagePlus size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Shop Gallery</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">Upload up to 10 images for your shop page ({galleryImages.length}/10)</p>
          </div>
        </div>
      </div>

      {/* Snackbar */}
      {snack.show && (
        <Snackbar
          message={snack.message}
          type={snack.type}
          onClose={() => setSnack({ ...snack, show: false })}
        />
      )}

      {/* Upload Button */}
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || galleryImages.length >= 10}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-xl text-sm font-semibold hover:bg-brand-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
          {uploading ? "Uploading..." : "Upload Images"}
        </button>
        <button
          onClick={() => setShowUnsplash(!showUnsplash)}
          disabled={galleryImages.length >= 10}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-dark-border text-gray-700 dark:text-gray-300 rounded-xl text-sm font-semibold hover:bg-gray-50 dark:bg-dark-card dark:hover:bg-dark-surface transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Search size={16} />
          Browse Unsplash
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
      </div>

      {/* Unsplash Search Panel */}
      {showUnsplash && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-dark-surface rounded-2xl border border-gray-100 dark:border-dark-border">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              value={unsplashQuery}
              onChange={(e) => setUnsplashQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && searchUnsplash()}
              placeholder="Search Unsplash (e.g. books, education, stationery)"
              className="flex-1 px-4 py-2.5 bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
            <button
              onClick={searchUnsplash}
              disabled={unsplashLoading}
              className="px-4 py-2.5 bg-brand-primary text-white rounded-xl text-sm font-semibold hover:bg-brand-primary/90 transition-all disabled:opacity-50"
            >
              {unsplashLoading ? <Loader2 size={16} className="animate-spin" /> : "Search"}
            </button>
            <button
              onClick={() => { setShowUnsplash(false); setUnsplashResults([]); setUnsplashQuery(""); }}
              className="p-2.5 text-gray-400 hover:text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-100 dark:bg-dark-card dark:hover:bg-dark-border transition-all"
            >
              <X size={16} />
            </button>
          </div>
          {unsplashResults.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[300px] overflow-y-auto">
              {unsplashResults.map((photo) => (
                <div
                  key={photo.id}
                  className="relative aspect-square rounded-xl overflow-hidden cursor-pointer group border border-gray-200 dark:border-dark-border hover:ring-2 hover:ring-brand-primary/40 transition-all"
                  onClick={() => handleAddUnsplash(photo.urls?.regular || photo.urls?.small)}
                >
                  <img
                    src={photo.urls?.small || photo.urls?.thumb}
                    alt={photo.alt_description || "Unsplash"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center">
                    <span className="text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity">+ Add</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {unsplashResults.length === 0 && unsplashQuery && !unsplashLoading && (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No results found. Try a different search term.</p>
          )}
        </div>
      )}

      {/* Gallery Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-gray-100 dark:bg-dark-border animate-pulse" />
          ))}
        </div>
      ) : galleryImages.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {galleryImages.sort((a, b) => a.order - b.order).map((img) => (
            <div
              key={img._id}
              className={`relative aspect-square rounded-2xl overflow-hidden border-2 group transition-all ${img.isPrimary ? "border-brand-primary ring-2 ring-brand-primary/20" : "border-gray-200 dark:border-dark-border"
                }`}
            >
              <img src={img.url} alt="Gallery" className="w-full h-full object-cover" />

              {/* Primary Badge */}
              {img.isPrimary && (
                <div className="absolute top-2 left-2 bg-brand-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Star size={10} fill="currentColor" /> Cover
                </div>
              )}

              {/* Hover Actions */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                {!img.isPrimary && (
                  <button
                    onClick={() => handleSetPrimary(img._id)}
                    className="p-2 bg-white dark:bg-dark-surface rounded-full text-brand-primary dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-dark-card transition-all shadow-lg"
                    title="Set as cover image"
                  >
                    <Star size={14} />
                  </button>
                )}
                <button
                  onClick={() => handleDelete(img._id)}
                  className="p-2 bg-white dark:bg-dark-surface rounded-full text-red-500 hover:bg-red-50 transition-all shadow-lg"
                  title="Delete image"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Source badge */}
              {img.source === "unsplash" && (
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[9px] font-medium px-1.5 py-0.5 rounded">
                  Unsplash
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-dark-border flex items-center justify-center mb-4">
            <ImagePlus size={28} className="text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">No gallery images yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Upload images or browse Unsplash to showcase your shop</p>
        </div>
      )}
    </motion.div>
  );
};

// Portfolio Manager component — shown below GalleryManager in User Side tab
const PortfolioManager = () => {
  const [portfolioImages, setPortfolioImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [snack, setSnack] = useState({ show: false, message: "", type: "success" });
  const fileInputRef = useRef(null);

  const fetchPortfolio = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get("/admin/profile");
      if (res.data.success) {
        const raw = res.data.data?.businessProfile?.portfolioImages || res.data.data?.business?.portfolioImages || [];
        setPortfolioImages(
          raw.map(img => (typeof img === "string" ? img : img?.url || "")).filter(Boolean)
        );
      }
    } catch (err) {
      console.error("Failed to fetch portfolio:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPortfolio(); }, [fetchPortfolio]);

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    if (portfolioImages.length + files.length > 10) {
      setSnack({ show: true, message: `Maximum 10 portfolio images allowed. You have ${portfolioImages.length}.`, type: "error" });
      return;
    }
    try {
      setUploading(true);
      const uploaded = [];
      for (const file of files) {
        const fd = new FormData();
        fd.append("portfolio", file);
        const res = await api.post("/admin/profile/portfolio", fd, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (res.data.success) uploaded.push(res.data.data.url);
      }
      setPortfolioImages(prev => [...prev, ...uploaded]);
      setSnack({ show: true, message: `${uploaded.length} image(s) uploaded`, type: "success" });
    } catch (err) {
      setSnack({ show: true, message: err.response?.data?.message || "Upload failed", type: "error" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (imageUrl, index) => {
    try {
      await api.delete("/admin/profile/portfolio", { data: { imageUrl } });
      setPortfolioImages(prev => prev.filter((_, i) => i !== index));
      setSnack({ show: true, message: "Portfolio image deleted", type: "success" });
    } catch (err) {
      setSnack({ show: true, message: "Failed to delete image", type: "error" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-dark-card rounded-[1.5rem] border border-gray-100 dark:border-dark-border p-6 mb-6 shadow-none"
    >
      <div className="flex items-center justify-between gap-3 mb-6 border-b border-gray-100 dark:border-dark-border pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary dark:text-blue-400">
            <ImagePlus size={20} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">Portfolio Gallery</h3>
            <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">Showcase your work with professional portfolio images ({portfolioImages.length}/10)</p>
          </div>
        </div>
      </div>

      {snack.show && (
        <Snackbar
          message={snack.message}
          type={snack.type}
          onClose={() => setSnack({ ...snack, show: false })}
        />
      )}

      {/* Upload Area */}
      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleUpload}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || portfolioImages.length >= 10}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-primary text-white rounded-xl text-sm font-semibold hover:bg-brand-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
          {uploading ? "Uploading..." : "Upload Portfolio Images"}
        </button>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">Max 10 images • PNG, JPG up to 5MB</p>
      </div>

      {/* Portfolio Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="aspect-square rounded-2xl bg-gray-100 dark:bg-dark-border animate-pulse" />
          ))}
        </div>
      ) : portfolioImages.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {portfolioImages.map((image, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative group aspect-square rounded-2xl overflow-hidden border-2 border-gray-200 dark:border-dark-border"
            >
              <img src={image} alt={`Portfolio ${index + 1}`} className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                {index + 1}
              </div>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => handleDelete(image, index)}
                  className="p-2 bg-white dark:bg-dark-surface rounded-full text-red-500 hover:bg-red-50 transition-all shadow-lg"
                  title="Delete image"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-dark-border flex items-center justify-center mb-4">
            <ImagePlus size={28} className="text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-1">No portfolio images yet</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">Upload images to showcase your best work to customers</p>
        </div>
      )}

    </motion.div>
  );
};

const SIDEBAR_STYLES = [
  {
    id: "classic",
    name: "Classic White",
    description: "Secondary background with primary accents",
    bg: "bg-white dark:bg-dark-surface",
    text: "text-gray-600 dark:text-gray-400",
    active: "bg-brand-secondary/10 text-brand-primary",
    border: "border-gray-100 dark:border-dark-border",
    indicator: true
  },
  {
    id: "dark",
    name: "Sleek Dark",
    description: "Deep dark theme with primary indicators",
    bg: "bg-[#0f172a]",
    text: "text-gray-400 dark:text-gray-500",
    active: "bg-white dark:bg-dark-surface/10 text-white",
    border: "border-gray-800",
    indicator: true
  },
  {
    id: "navy",
    name: "Navy Executive",
    description: "Deep dark sidebar with primary buttons",
    bg: "bg-[#0f172a]",
    text: "text-white/60",
    active: "bg-brand-primary text-white shadow-lg",
    border: "border-white/5",
    indicator: false
  },
  {
    id: "solid",
    name: "Primary Solid",
    description: "Bold primary background with white text",
    bg: "bg-white dark:bg-dark-surface",
    text: "text-gray-600 dark:text-gray-400",
    active: "bg-brand-primary text-white shadow-md",
    border: "border-gray-100 dark:border-dark-border",
    indicator: false
  },
  {
    id: "glass",
    name: "Glassmorphism",
    description: "Elegant translucent blurred background",
    bg: "bg-white dark:bg-dark-surface/70 backdrop-blur-md",
    text: "text-gray-700 dark:text-gray-300",
    active: "bg-brand-primary/20 text-brand-primary border-brand-primary/20",
    border: "border-white/20",
    indicator: false
  },
  {
    id: "gradient",
    name: "Brand Gradient",
    description: "Vibrant gradient using brand colors",
    bg: "bg-gradient-to-b from-brand-primary to-brand-secondary",
    text: "text-white/70",
    active: "bg-white dark:bg-dark-surface/20 text-white",
    border: "border-white/10",
    indicator: false
  }
];

const Section = ({ title, icon: Icon, subtitle, actions, children }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-dark-card rounded-[1.5rem] border border-gray-100 dark:border-dark-border p-6 mb-6 shadow-none"
  >
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-gray-100 dark:border-dark-border pb-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-brand-primary/10 rounded-lg text-brand-primary dark:text-blue-400">
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">{title}</h3>
          {subtitle && <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
    <div className="w-full">{children}</div>
  </motion.div>
);

const PreviewsPage = () => {
  const { shopSlug } = useParams();
  const {
    sidebarStyle: currentSavedStyle,
    sidebarDefaultExpanded: currentSavedExpanded,
    sidebarItemOrientation: currentSavedOrientation,
    stockButtonsView: currentSavedStockView,
    invoiceServiceCardView: currentSavedServiceCardView,
    invoiceProductCardView: currentSavedProductCardView,
    refreshConfig,
    currencySymbol
  } = useAuth();

  const location = useLocation();
  const navigate = useNavigate();

  const [activeMainTab, setActiveMainTab] = useState(() => {
    const hash = location.hash.replace("#", "");
    if (hash && PREVIEW_TABS.find((t) => t.id === hash)) {
      return hash;
    }
    return "appearance";
  });

  useEffect(() => {
    const hash = location.hash.replace("#", "");
    if (hash && PREVIEW_TABS.find((t) => t.id === hash)) {
      setActiveMainTab((prev) => (prev !== hash ? hash : prev));
    } else if (PREVIEW_TABS.length > 0) {
      setActiveMainTab((prev) => {
        if (!PREVIEW_TABS.find((t) => t.id === prev)) return PREVIEW_TABS[0].id;
        return prev;
      });
    }
  }, [location.hash]);

  useEffect(() => {
    if (activeMainTab && location.hash.replace("#", "") !== activeMainTab) {
      navigate(`#${activeMainTab}`, { replace: true });
    }
  }, [activeMainTab, navigate]);
  const [viewMode, setViewMode] = useState("mobile");
  const [key, setKey] = useState(0);

  const [selectedSidebar, setSelectedSidebar] = useState(currentSavedStyle || "classic");
  const [isDefaultExpanded, setIsDefaultExpanded] = useState(currentSavedExpanded !== undefined ? currentSavedExpanded : true);
  const [itemOrientation, setItemOrientation] = useState(currentSavedOrientation || "row");
  const [stockButtonsView, setStockButtonsView] = useState(currentSavedStockView || "row");
  const [invoiceServiceCardView, setInvoiceServiceCardView] = useState(currentSavedServiceCardView || "image-details");
  const [invoiceProductCardView, setInvoiceProductCardView] = useState(currentSavedProductCardView || "image-details");

  const [isSaving, setIsSaving] = useState(false);
  const isFirstRender = useRef(true);

  // Interactive mock button states
  const [mockActiveTab, setMockActiveTab] = useState("products");
  const [mockActiveSub, setMockActiveSub] = useState("main");

  const MOCK_PREVIEW_TABS = [
    {
      id: "products",
      label: "Products",
      icon: Package,
      reportLabel: "Stock Report"
    },
    {
      id: "purchase-order",
      label: "Purchase Orders",
      icon: ClipboardList,
      reportLabel: "Purchase Report"
    },
    {
      id: "purchase-entry",
      label: "Purchase Entry",
      icon: FileText,
      reportLabel: "Purchase Report"
    },
    {
      id: "purchase-return",
      label: "Purchase Returns",
      icon: RotateCcw,
      reportLabel: "Return Report"
    },
    {
      id: "stock-transfer",
      label: "Stock Transfer",
      icon: Truck,
      reportLabel: "Transfer Report"
    },
    {
      id: "damage-entry",
      label: "Damage Entry",
      icon: AlertTriangle,
      reportLabel: "Damage Report"
    },
    {
      id: "consumption-entry",
      label: "Consumption Entry",
      icon: MinusCircle,
      reportLabel: "Consumption Report"
    },
    {
      id: "stock-adjustment",
      label: "Stock Adjustment",
      icon: CheckCircle2,
      reportLabel: "Stock Report"
    },
  ];

  // Sync with auth state when it loads
  useEffect(() => {
    if (currentSavedStyle) setSelectedSidebar(currentSavedStyle);
    if (currentSavedExpanded !== undefined) setIsDefaultExpanded(currentSavedExpanded);
    if (currentSavedOrientation) setItemOrientation(currentSavedOrientation);
    if (currentSavedStockView) setStockButtonsView(currentSavedStockView);
    if (currentSavedServiceCardView) setInvoiceServiceCardView(currentSavedServiceCardView);
    if (currentSavedProductCardView) setInvoiceProductCardView(currentSavedProductCardView);
  }, [currentSavedStyle, currentSavedExpanded, currentSavedOrientation, currentSavedStockView, currentSavedServiceCardView, currentSavedProductCardView]);

  // Auto-save logic
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(async () => {
      // Only save if different from current saved values
      if (
        selectedSidebar !== currentSavedStyle ||
        isDefaultExpanded !== currentSavedExpanded ||
        itemOrientation !== currentSavedOrientation ||
        stockButtonsView !== currentSavedStockView ||
        invoiceServiceCardView !== currentSavedServiceCardView ||
        invoiceProductCardView !== currentSavedProductCardView
      ) {
        try {
          setIsSaving(true);
          const res = await api.put("/admin/profile", {
            sidebarStyle: selectedSidebar,
            sidebarDefaultExpanded: isDefaultExpanded,
            sidebarItemOrientation: itemOrientation,
            stockButtonsView: stockButtonsView,
            invoiceServiceCardView,
            invoiceProductCardView
          });
          if (res.data.success) {
            toast.success("Settings updated", { id: 'auto-save' });
            await refreshConfig();
          }
        } catch (err) {
          console.error("Auto-save failed:", err);
        } finally {
          setIsSaving(false);
        }
      }
    }, 500); // Small debounce

    return () => clearTimeout(timer);
  }, [selectedSidebar, isDefaultExpanded, itemOrientation, stockButtonsView, invoiceServiceCardView, invoiceProductCardView, currentSavedStyle, currentSavedExpanded, currentSavedOrientation, currentSavedStockView, currentSavedServiceCardView, currentSavedProductCardView, refreshConfig]);

  const baseUrl = window.location.origin;
  const shopUrl = `${baseUrl}/${shopSlug}`;

  const handleReload = () => setKey(prev => prev + 1);

  const headerActions = activeMainTab === "appearance" ? (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-1 bg-gray-50 dark:bg-dark-surface p-1 rounded-xl border border-gray-100 dark:border-dark-border">
        <button
          onClick={() => setViewMode("mobile")}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${viewMode === "mobile"
              ? "bg-brand-primary text-white shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
        >
          <Smartphone size={18} />
        </button>
        <button
          onClick={() => setViewMode("desktop")}
          className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all ${viewMode === "desktop"
              ? "bg-brand-primary text-white shadow-sm"
              : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
            }`}
        >
          <Monitor size={18} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={handleReload}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-gray-50 dark:bg-dark-surface border border-gray-100 dark:border-dark-border text-gray-500 hover:text-brand-primary dark:text-blue-400 transition-all shadow-sm"
        >
          <RotateCcw size={16} />
        </button>
        <a
          href={shopUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-brand-primary text-white shadow-sm hover:brightness-110 transition-all"
        >
          <ExternalLink size={16} />
        </a>
      </div>
    </div>
  ) : (
    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
      {isSaving ? (
        <>
          <Loader2 size={12} className="animate-spin text-brand-primary dark:text-blue-400" />
          <span>Saving...</span>
        </>
      ) : (
        <>
          <CheckCircle2 size={12} className="text-green-500" />
          <span>Auto-saved</span>
        </>
      )}
    </div>
  );

  const currentSidebar = SIDEBAR_STYLES.find(s => s.id === selectedSidebar);

  return (
    <div className="w-full animate-in fade-in duration-500 space-y-6">

      {/* Main Tab Navigation */}
      <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-2">
        {PREVIEW_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeMainTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveMainTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-all text-sm font-semibold border ${isActive
                  ? "bg-brand-primary text-white border-brand-primary"
                  : "bg-white text-gray-500 hover:bg-gray-50 border-gray-100 dark:bg-dark-card dark:border-dark-border dark:text-gray-400 dark:hover:bg-dark-border"
                }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="w-full">
        <AnimatePresence mode="wait">
          {activeMainTab === "appearance" && (
            <Section
              title="Shop Appearance"
              icon={Eye}
              subtitle="Preview how your customers see your shop website"
              actions={headerActions}
            >
              <div className="space-y-6">
                <div className="flex items-center justify-center bg-gray-50/50 dark:bg-dark-surface/30 rounded-3xl p-6 border border-dashed border-gray-200 dark:border-dark-border overflow-hidden">
                  <div
                    className={`relative bg-white dark:bg-dark-card shadow-xl transition-all duration-500 ease-in-out overflow-hidden border border-gray-200 dark:border-dark-border ${viewMode === "mobile"
                        ? "w-[320px] h-[568px] rounded-[2.5rem] border-[10px] border-gray-900 dark:border-black"
                        : "w-full h-[500px] rounded-2xl"
                      }`}
                  >
                    <iframe key={key} src={shopUrl} className="w-full h-full border-none" title="Shop Preview" />
                  </div>
                </div>
              </div>
            </Section>
          )}

          {activeMainTab === "sidebar" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Sidebar Style Selection */}
              <div className="lg:col-span-1 space-y-6">

                {/* Configuration Panel */}
                <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 space-y-6 shadow-sm">

                  {/* Expand Toggle */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layout size={18} className="text-brand-primary dark:text-blue-400" />
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Default Expanded</span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isDefaultExpanded}
                          onChange={(e) => setIsDefaultExpanded(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-dark-border peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-brand-primary"></div>
                      </label>
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium leading-relaxed italic">
                      Initial sidebar state when landing on dashboard.
                    </p>
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-dark-border w-full" />

                  {/* Orientation Toggle */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Grid size={18} className="text-brand-primary dark:text-blue-400" />
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Item Orientation</span>
                      </div>
                      <div className="flex items-center gap-1 bg-gray-50 dark:bg-dark-surface p-1 rounded-lg border border-gray-100 dark:border-dark-border">
                        <button
                          onClick={() => setItemOrientation("row")}
                          className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${itemOrientation === "row"
                              ? "bg-brand-primary text-white shadow-sm"
                              : "text-gray-400 hover:text-gray-600 dark:text-gray-400"
                            }`}
                        >
                          <AlignJustify size={14} />
                        </button>
                        <button
                          onClick={() => setItemOrientation("column")}
                          className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${itemOrientation === "column"
                              ? "bg-brand-primary text-white shadow-sm"
                              : "text-gray-400 hover:text-gray-600 dark:text-gray-400"
                            }`}
                        >
                          <Layout size={14} className="rotate-90" />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium leading-relaxed italic">
                      {itemOrientation === "row" ? "Items listed horizontally (Row)" : "Items stacked vertically (Column)"}
                    </p>
                  </div>

                  <div className="h-px bg-gray-100 dark:bg-dark-border w-full" />

                  {/* Stock/Accounts Buttons View Toggle */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Grid size={18} className="text-brand-primary dark:text-blue-400" />
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-200">Stock & Accounts Buttons</span>
                      </div>
                      <div className="flex items-center gap-1 bg-gray-50 dark:bg-dark-surface p-1 rounded-lg border border-gray-100 dark:border-dark-border">
                        <button
                          onClick={() => setStockButtonsView("row")}
                          className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${stockButtonsView === "row"
                              ? "bg-brand-primary text-white shadow-sm"
                              : "text-gray-400 hover:text-gray-600 dark:text-gray-400"
                            }`}
                          title="Row Wise (Side-by-side Split)"
                        >
                          <AlignJustify size={14} />
                        </button>
                        <button
                          onClick={() => setStockButtonsView("column")}
                          className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${stockButtonsView === "column"
                              ? "bg-brand-primary text-white shadow-sm"
                              : "text-gray-400 hover:text-gray-600 dark:text-gray-400"
                            }`}
                          title="Column Wise (Stacked Vertical)"
                        >
                          <Layout size={14} />
                        </button>
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium leading-relaxed italic">
                      {stockButtonsView === "row" ? "Row Wise (Side-by-side Split)" : "Column Wise (Stacked Vertical)"}
                    </p>
                  </div>
                </div>

                {/* Sidebar Themes */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest ml-1">Sidebar Themes</h3>
                  {SIDEBAR_STYLES.map((style) => (
                    <button
                      key={style.id}
                      onClick={() => setSelectedSidebar(style.id)}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 group ${selectedSidebar === style.id
                          ? "bg-brand-primary/5 border-brand-primary shadow-sm ring-1 ring-brand-primary/10"
                          : "bg-white dark:bg-dark-card border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-dark-border"
                        }`}
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${style.bg} ${style.border}`}>
                        <Menu size={20} className={style.text.split(' ')[0]} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold truncate ${selectedSidebar === style.id ? "text-brand-primary" : "text-gray-700 dark:text-gray-200"}`}>
                          {style.name}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium truncate">{style.description}</div>
                      </div>
                      {selectedSidebar === style.id && <CheckCircle2 size={16} className="text-brand-primary dark:text-blue-400 shrink-0" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sidebar Preview Display */}
              <div className="lg:col-span-2">
                <Section
                  title="Layout Preview"
                  icon={Layout}
                  subtitle={`Visualizing ${currentSidebar.name} style`}
                  actions={headerActions}
                >
                  <div className="bg-gray-100 dark:bg-dark-surface/50 rounded-2xl p-4 md:p-8 border border-dashed border-gray-200 dark:border-dark-border h-[500px] flex items-center justify-center">
                    {/* Mock Dashboard Frame */}
                    <div className="w-full h-full bg-white dark:bg-dark-card rounded-xl shadow-2xl border border-gray-100 dark:border-dark-border overflow-hidden flex">

                      {/* Dynamic Sidebar Simulation */}
                      <div className={`${isDefaultExpanded ? (itemOrientation === 'column' ? 'w-24' : 'w-48') : 'w-20'} h-full border-r ${currentSidebar.bg} ${currentSidebar.border} p-4 flex flex-col transition-all duration-500`}>

                        {/* Mock Header Logic */}
                        <div className={`flex items-center mb-8 h-10 ${(!isDefaultExpanded || itemOrientation === 'column') ? 'justify-center' : 'justify-between'}`}>
                          {!isDefaultExpanded || itemOrientation === 'column' ? (
                            <div className={`w-8 h-8 rounded-lg flex-shrink-0 ${selectedSidebar === 'gradient' || selectedSidebar === 'navy' ? 'bg-white dark:bg-dark-surface/20' : 'bg-brand-primary'} flex items-center justify-center text-white font-black italic shadow-sm`}>S</div>
                          ) : (
                            <>
                              <div className="flex items-center gap-2 min-w-0 animate-in fade-in slide-in-from-left-2 duration-300">
                                <div className={`w-6 h-6 rounded flex-shrink-0 ${selectedSidebar === 'gradient' || selectedSidebar === 'navy' ? 'bg-white dark:bg-dark-surface/20' : 'bg-brand-primary'} flex items-center justify-center text-white font-black text-[10px]`}>S</div>
                                <div className="flex flex-col min-w-0">
                                  <div className={`text-[9px] font-black uppercase tracking-tighter truncate ${currentSidebar.text.replace('text-white/60', 'text-white')}`}>Vijayajalakam</div>
                                  <div className="text-[7px] text-gray-400 dark:text-gray-500 uppercase font-bold truncate">Shop Admin</div>
                                </div>
                              </div>
                              <div className={`p-1 rounded-md border ${currentSidebar.border} ${currentSidebar.text.replace('text-white/60', 'text-white')} opacity-60`}>
                                <PanelLeftClose size={10} />
                              </div>
                            </>
                          )}
                        </div>

                        {/* Mock Nav with Orientation Support */}
                        <div className="space-y-1">
                          {[
                            { icon: Home, label: "Dashboard", active: true },
                            { icon: ShoppingBag, label: "Orders", active: false },
                            { icon: Users, label: "Customers", active: false },
                            { icon: Layers, label: "Inventory", active: false },
                            { icon: Settings, label: "Settings", active: false },
                          ].map((item, idx) => (
                            <div
                              key={idx}
                              className={`flex transition-all relative ${isDefaultExpanded
                                  ? (itemOrientation === "column"
                                    ? "flex-col items-center justify-center py-2.5 px-1 gap-1 text-center"
                                    : "flex-row items-center px-3 py-2 gap-3")
                                  : "w-10 h-10 mx-auto justify-center items-center"
                                } rounded-lg font-bold ${item.active ? currentSidebar.active : currentSidebar.text
                                }`}
                            >
                              <item.icon size={isDefaultExpanded && itemOrientation === "column" ? 16 : 14} className={item.active && (selectedSidebar === 'classic' || selectedSidebar === 'dark') ? 'text-brand-primary' : ''} />
                              {isDefaultExpanded && (
                                <span className={`truncate ${itemOrientation === "column" ? "text-[8px] uppercase tracking-wider" : "text-[10px]"}`}>
                                  {item.label}
                                </span>
                              )}
                              {item.active && currentSidebar.indicator && isDefaultExpanded && itemOrientation === "row" && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-brand-primary rounded-r-full" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Mock Content */}
                      <div className="flex-1 p-6 bg-gray-50/50 dark:bg-dark-surface/30">
                        <div className="h-6 w-32 bg-gray-200 dark:bg-dark-border rounded mb-6" />
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="h-20 bg-white dark:bg-dark-card rounded-lg border border-gray-100 dark:border-dark-border shadow-sm" />
                          <div className="h-20 bg-white dark:bg-dark-card rounded-lg border border-gray-100 dark:border-dark-border shadow-sm" />
                          <div className="h-20 bg-white dark:bg-dark-card rounded-lg border border-gray-100 dark:border-dark-border shadow-sm" />
                        </div>
                        <div className="h-40 bg-white dark:bg-dark-card rounded-lg border border-gray-100 dark:border-dark-border shadow-sm" />
                      </div>

                    </div>
                  </div>
                </Section>
              </div>
            </div>
          )}

          {activeMainTab === "button-design" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-300">
              {/* Button Design Layout Selector */}
              <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 space-y-6 shadow-sm">
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Stock & Accounts Buttons</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium leading-relaxed">
                      Choose the default layout for the sub-navigation headers in Stock and Accounts modules.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Row Wise Option */}
                    <button
                      onClick={() => setStockButtonsView("row")}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-3 group relative ${stockButtonsView === "row"
                          ? "bg-brand-primary/5 border-brand-primary shadow-sm ring-1 ring-brand-primary/10"
                          : "bg-white dark:bg-dark-card border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-dark-border"
                        }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl border ${stockButtonsView === "row" ? "bg-brand-primary/10 border-brand-primary/20 text-brand-primary dark:text-blue-400" : "bg-gray-50 dark:bg-dark-surface border-gray-100 dark:border-dark-border text-gray-400"}`}>
                            <AlignJustify size={18} />
                          </div>
                          <div>
                            <div className={`text-sm font-bold ${stockButtonsView === "row" ? "text-brand-primary" : "text-gray-700 dark:text-gray-200"}`}>
                              Row Wise Layout
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Horizontal Side-by-side Split</div>
                          </div>
                        </div>
                        {stockButtonsView === "row" && <CheckCircle2 size={16} className="text-brand-primary dark:text-blue-400 shrink-0" />}
                      </div>

                      {/* Mini visual mockup */}
                      <div className="w-full bg-gray-50 dark:bg-dark-surface p-2 rounded-xl flex items-center justify-center gap-1.5 border border-gray-100 dark:border-dark-border">
                        <div className="flex items-stretch rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card overflow-hidden">
                          <div className="px-2 py-1 text-[8px] font-bold text-gray-400 dark:text-gray-500">Products</div>
                          <div className="w-[1px] self-stretch my-1 bg-gray-200 dark:bg-dark-border" />
                          <div className="px-2 py-1 text-[8px] font-bold text-gray-400 dark:text-gray-500">Reports</div>
                        </div>
                        <div className="flex items-stretch rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card overflow-hidden">
                          <div className="px-2 py-1 text-[8px] font-bold text-gray-400 dark:text-gray-500">Payments</div>
                          <div className="w-[1px] self-stretch my-1 bg-gray-200 dark:bg-dark-border" />
                          <div className="px-2 py-1 text-[8px] font-bold text-gray-400 dark:text-gray-500">Reports</div>
                        </div>
                      </div>
                    </button>

                    {/* Column Wise Option */}
                    <button
                      onClick={() => setStockButtonsView("column")}
                      className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-3 group relative ${stockButtonsView === "column"
                          ? "bg-brand-primary/5 border-brand-primary shadow-sm ring-1 ring-brand-primary/10"
                          : "bg-white dark:bg-dark-card border-gray-100 dark:border-dark-border hover:border-gray-200 dark:hover:border-dark-border"
                        }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl border ${stockButtonsView === "column" ? "bg-brand-primary/10 border-brand-primary/20 text-brand-primary dark:text-blue-400" : "bg-gray-50 dark:bg-dark-surface border-gray-100 dark:border-dark-border text-gray-400"}`}>
                            <Layout size={18} />
                          </div>
                          <div>
                            <div className={`text-sm font-bold ${stockButtonsView === "column" ? "text-brand-primary" : "text-gray-700 dark:text-gray-200"}`}>
                              Column Wise Layout
                            </div>
                            <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">Vertical Stacked Split</div>
                          </div>
                        </div>
                        {stockButtonsView === "column" && <CheckCircle2 size={16} className="text-brand-primary dark:text-blue-400 shrink-0" />}
                      </div>

                      {/* Mini visual mockup */}
                      <div className="w-full bg-gray-50 dark:bg-dark-surface p-2 rounded-xl flex items-center justify-center gap-4 border border-gray-100 dark:border-dark-border">
                        <div className="flex flex-col items-center rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card overflow-hidden">
                          <div className="px-2 py-0.5 text-[8px] font-bold text-gray-400 dark:text-gray-500">Products</div>
                          <div className="h-[1px] w-full bg-gray-200 dark:bg-dark-border" />
                          <div className="px-2 py-0.5 text-[8px] font-bold text-gray-400 dark:text-gray-500">Reports</div>
                        </div>
                        <div className="flex flex-col items-center rounded-lg border border-gray-200 dark:border-dark-border bg-white dark:bg-dark-card overflow-hidden">
                          <div className="px-2 py-0.5 text-[8px] font-bold text-gray-400 dark:text-gray-500">Payments</div>
                          <div className="h-[1px] w-full bg-gray-200 dark:bg-dark-border" />
                          <div className="px-2 py-0.5 text-[8px] font-bold text-gray-400 dark:text-gray-500">Reports</div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div className="bg-white dark:bg-dark-card rounded-2xl border border-gray-100 dark:border-dark-border p-5 space-y-6 shadow-sm">
                  <div className="space-y-2">
                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200">Invoice Card Views</h3>
                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium leading-relaxed">
                      Choose how services and products are displayed in the unified invoice entry screen grid.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <CustomDropdown
                      label="Services Card Style"
                      icon={FileText}
                      value={invoiceServiceCardView}
                      onChange={(e) => setInvoiceServiceCardView(e.target.value)}
                      options={[
                        { value: "image-details", label: "1. Image with Details (Default)" },
                        { value: "details-only", label: "2. Details Only (No Image)" },
                        { value: "details-qty", label: "3. Details Only + Qty Controls" },
                        { value: "image-details-add", label: "4. Image + Details + Add Button" }
                      ]}
                    />
                  </div>

                  <div className="space-y-3">
                    <CustomDropdown
                      label="Products Card Style"
                      icon={Package}
                      value={invoiceProductCardView}
                      onChange={(e) => setInvoiceProductCardView(e.target.value)}
                      options={[
                        { value: "image-details", label: "1. Image with Details (Default)" },
                        { value: "details-only", label: "2. Details Only (No Image)" },
                        { value: "details-qty", label: "3. Details Only + Qty Controls" },
                        { value: "image-details-add", label: "4. Image + Details + Add Button" }
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Live Preview Display */}
              <div className="lg:col-span-2">
                <Section
                  title="Interactive Button Preview"
                  icon={AlignJustify}
                  subtitle="Live rendering of Stock & Accounts sub-navigation buttons"
                  actions={headerActions}
                >
                  <div className="bg-gray-50 dark:bg-dark-surface/50 rounded-2xl p-6 border border-dashed border-gray-200 dark:border-dark-border flex flex-col justify-between h-[360px]">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-dark-border pb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Module Header Simulation</span>
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-dark-surface px-2 py-0.5 rounded-full text-[9px] font-bold text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-dark-border">
                          Active: {stockButtonsView === "row" ? "Row Wise" : "Column Wise"}
                        </div>
                      </div>

                      {/* Mock Navigation Container */}
                      <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border flex items-center gap-3 p-4 rounded-xl overflow-x-auto scrollbar-hide shadow-sm transition-all duration-300">
                        {MOCK_PREVIEW_TABS.map((tab) => {
                          const isActive = mockActiveTab === tab.id;
                          const isReportActive = isActive && mockActiveSub === "report";
                          const isMainActive = isActive && mockActiveSub === "main";

                          return (
                            <div
                              key={tab.id}
                              className={`
                                flex ${stockButtonsView === "column" ? "flex-col items-stretch" : "items-stretch"} rounded-xl border transition-all duration-200 shrink-0 overflow-hidden cursor-pointer
                                ${isActive
                                  ? "bg-brand-primary text-white border-transparent"
                                  : "bg-white dark:bg-dark-card border-gray-200 dark:border-dark-border text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-surface hover:border-gray-300"
                                }
                              `}
                            >
                              {/* Main Action Button */}
                              <button
                                onClick={() => {
                                  setMockActiveTab(tab.id);
                                  setMockActiveSub("main");
                                }}
                                className={`
                                  flex ${stockButtonsView === "column" ? "flex-row items-center justify-center gap-1.5 py-1 px-3.5 min-w-[100px] w-full" : "flex-col items-center justify-center gap-1 py-1.5 px-3 min-w-[80px]"} transition-all duration-200
                                  ${isMainActive
                                    ? "text-white font-extrabold"
                                    : isActive
                                      ? "text-white/50 hover:text-white"
                                      : "hover:text-gray-900 dark:text-white dark:hover:text-white"
                                  }
                                `}
                              >
                                <tab.icon size={16} strokeWidth={isMainActive ? 2.5 : 2} />
                                <span className="text-[10px] font-bold tracking-tight">{tab.label}</span>
                              </button>

                              {/* Divider Line */}
                              <div
                                className={`
                                  ${stockButtonsView === "column" ? "h-[1px] w-full" : "w-[1px] self-stretch my-2"}
                                  ${isActive ? "bg-white/20" : "bg-gray-200 dark:bg-dark-border"}
                                `}
                              />

                              {/* Reports Button */}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMockActiveTab(tab.id);
                                  setMockActiveSub("report");
                                }}
                                className={`
                                  flex ${stockButtonsView === "column" ? "flex-row items-center justify-center gap-1.5 py-1 px-3.5 min-w-[100px] w-full" : "flex-col items-center justify-center gap-1 py-1.5 px-3 min-w-[80px]"} transition-all duration-200
                                  ${isReportActive
                                    ? "text-white font-extrabold"
                                    : isActive
                                      ? "text-white/50 hover:text-white"
                                      : "hover:text-gray-900 dark:text-white dark:hover:text-white"
                                  }
                                `}
                              >
                                <BarChart3 size={16} strokeWidth={isReportActive ? 2.5 : 2} />
                                <span className="text-[10px] font-bold tracking-tight">Reports</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Description and Action Callout */}
                    <div className="bg-brand-primary/5 border border-brand-primary/10 rounded-xl p-3.5 flex items-start gap-3">
                      <div className="p-1.5 bg-brand-primary/10 rounded-lg text-brand-primary dark:text-blue-400 shrink-0 mt-0.5">
                        <Eye size={14} />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">Interactive Preview Guidance</h4>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 leading-relaxed">
                          Click either segment of the buttons above (the primary tab label or the <strong>Reports</strong> tab label) to view how active highlighting matches layout constraints dynamically inside the actual application.
                        </p>
                      </div>
                    </div>
                  </div>
                </Section>

                <div className="mt-6">
                  <Section
                    title="Invoice Card Preview"
                    icon={FileText}
                    subtitle="Live rendering of your selected Service and Product card styles"
                    actions={headerActions}
                  >
                    <div className="bg-gray-50 dark:bg-dark-surface/50 rounded-2xl p-6 border border-dashed border-gray-200 dark:border-dark-border flex items-center justify-center min-h-[360px]">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
                        {/* Service Card Mock */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Service Preview</span>
                            <div className="bg-gray-100 dark:bg-dark-surface px-2 py-0.5 rounded-full text-[9px] font-bold text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-dark-border">
                              {invoiceServiceCardView}
                            </div>
                          </div>

                          {/* Mock Card */}
                          <div className={`rounded-2xl overflow-hidden flex flex-col h-[260px] border bg-white dark:bg-dark-card border-gray-100 dark:border-dark-border shadow-sm mx-auto w-full max-w-[240px]`}>
                            {(invoiceServiceCardView === 'image-details' || invoiceServiceCardView === 'image-details-add') && (
                              <div className="h-32 w-full bg-gray-50 dark:bg-dark-surface relative overflow-hidden flex items-center justify-center shrink-0">
                                <Scissors size={32} strokeWidth={1.5} className="text-gray-200 dark:text-gray-700" />
                              </div>
                            )}
                            <div className="flex-1 flex flex-col p-4">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-bold text-gray-800 dark:text-gray-200 text-[14px] mb-1.5 leading-tight">
                                  Premium Haircut
                                </h4>
                              </div>
                              <div className="mt-auto flex items-end justify-between gap-2">
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest px-0.5">
                                    Service
                                  </span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <div className="font-black text-[15px] text-brand-primary dark:text-blue-400 translate-y-0.5">{currencySymbol || "₹"}280.00</div>
                                </div>
                              </div>
                              {(invoiceServiceCardView === 'details-qty' || invoiceServiceCardView === 'image-details-add') && (
                                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-border w-full flex items-center justify-between">
                                  <button className="w-full bg-brand-primary text-white font-bold text-[11px] uppercase tracking-wider py-2 rounded-lg shadow-sm flex items-center justify-center gap-1">
                                    <Plus size={14} /> Add
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Product Card Mock */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">Product Preview</span>
                            <div className="bg-gray-100 dark:bg-dark-surface px-2 py-0.5 rounded-full text-[9px] font-bold text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-dark-border">
                              {invoiceProductCardView}
                            </div>
                          </div>

                          {/* Mock Card */}
                          <div className={`rounded-2xl overflow-hidden flex flex-col h-[260px] border bg-white dark:bg-dark-card border-gray-100 dark:border-dark-border shadow-sm mx-auto w-full max-w-[240px]`}>
                            {(invoiceProductCardView === 'image-details' || invoiceProductCardView === 'image-details-add') && (
                              <div className="h-32 w-full bg-gray-50 dark:bg-dark-surface relative overflow-hidden flex items-center justify-center shrink-0">
                                <Package size={32} strokeWidth={1.5} className="text-gray-200 dark:text-gray-700" />
                              </div>
                            )}
                            <div className="flex-1 flex flex-col p-4">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-bold text-gray-800 dark:text-gray-200 text-[14px] mb-1.5 leading-tight">
                                  Styling Gel
                                </h4>
                                {(invoiceProductCardView === 'details-only' || invoiceProductCardView === 'details-qty') && (
                                  <button className="p-1 shrink-0 rounded-full text-gray-300 bg-gray-50 dark:bg-dark-card">
                                    <Heart size={14} fill="none" />
                                  </button>
                                )}
                              </div>
                              <div className="mt-auto flex items-end justify-between gap-2">
                                <div className="flex flex-col gap-1.5">
                                  <span className="text-[10px] font-black uppercase tracking-tight px-2 py-0.5 rounded-lg border w-fit bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-100">
                                    15 Stock
                                  </span>
                                </div>
                                <div className="flex flex-col items-end">
                                  <div className="font-black text-[15px] text-brand-primary dark:text-blue-400 translate-y-0.5">{currencySymbol || "₹"}150.00</div>
                                </div>
                              </div>
                              {(invoiceProductCardView === 'details-qty' || invoiceProductCardView === 'image-details-add') && (
                                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-border w-full flex items-center justify-between">
                                  <button className="w-full bg-brand-primary text-white font-bold text-[11px] uppercase tracking-wider py-2 rounded-lg shadow-sm flex items-center justify-center gap-1">
                                    <Plus size={14} /> Add
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Section>
                </div>
              </div>
            </div>
          )}

          {activeMainTab === "user-side" && (
            <div className="animate-in fade-in duration-300">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GalleryManager />
                <PortfolioManager />
              </div>
            </div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-10 mb-20 flex items-center justify-center gap-2 text-gray-400/60 dark:text-gray-500/40">
        <Layout className="w-3 h-3" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Global Preview System | v1.3</span>
      </div>
    </div>
  );
};

export default PreviewsPage;
