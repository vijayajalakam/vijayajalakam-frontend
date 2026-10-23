import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { QRCodeCanvas } from "qrcode.react";
import {
  Globe,
  Clock,
  Download,
  Share2,
  Copy,
  Star,
  MapPin,
  ExternalLink,
  Check,
  ClipboardPaste,
  X,
  Layers,
  Save,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  useGetAdminProfileQuery,
  useUpdateBusinessProfileMutation,
} from "../../../store/api/tenantCrudEndpoints";

const QrCodePage = () => {
  const { shopSlug } = useParams();

  // Active view tab: "all" | "website" | "google-review"
  const [activeTab, setActiveTab] = useState("all");

  // Share dropdown states
  const [isShareWebsiteOpen, setIsShareWebsiteOpen] = useState(false);
  const [isShareReviewOpen, setIsShareReviewOpen] = useState(false);

  // Profile data & mutations
  const { data: profileData } = useGetAdminProfileQuery();
  const [updateBusinessProfile, { isLoading: isSavingProfile }] =
    useUpdateBusinessProfileMutation();

  // Shop website URL
  const baseUrl = "https://vijayajalakam.com";
  const shopUrl = `${baseUrl}/${shopSlug}`;

  // Google Review / Map Link state
  const storageKey = `google_review_url_${shopSlug}`;
  const savedUrl =
    profileData?.salon?.googleReviewUrl ||
    profileData?.data?.salon?.googleReviewUrl ||
    (typeof window !== "undefined"
      ? localStorage.getItem(storageKey) || ""
      : "");

  const [userInputUrl, setUserInputUrl] = useState(null);
  const reviewUrl = userInputUrl !== null ? userInputUrl : savedUrl;

  // Download QR Code as PNG
  const downloadQR = (id, fileName) => {
    const canvas = document.getElementById(id);
    if (!canvas) {
      toast.error("QR Code canvas not found");
      return;
    }
    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fileName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("QR Code downloaded successfully!");
  };

  // Share QR Code Image or Link
  const shareQR = async (id, fileName, url, title) => {
    try {
      const canvas = document.getElementById(id);
      let sharedFile = false;

      if (canvas && navigator.canShare) {
        const blob = await new Promise((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        const file = new File([blob], `${fileName}.png`, {
          type: "image/png",
        });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title,
            text: `Scan to visit: ${title}`,
          });
          sharedFile = true;
        }
      }

      if (!sharedFile) {
        if (navigator.share) {
          await navigator.share({ title, url });
        } else {
          navigator.clipboard.writeText(url);
          toast.success("Link copied to clipboard!", {
            position: "bottom-center",
          });
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error sharing:", err);
      }
    }
  };

  // Save Review / Map link to backend & localStorage
  const handleSaveReviewLink = async (e) => {
    if (e) e.preventDefault();
    const cleanUrl = reviewUrl.trim();
    if (!cleanUrl) {
      toast.error("Please enter a valid Google Review or Map URL");
      return;
    }

    try {
      await updateBusinessProfile({
        googleReviewUrl: cleanUrl,
      }).unwrap();

      localStorage.setItem(storageKey, cleanUrl);
      setUserInputUrl(cleanUrl);
      toast.success("Google Review & Map link saved!");
    } catch {
      // Fallback save to localStorage if backend profile endpoint is pending
      localStorage.setItem(storageKey, cleanUrl);
      setUserInputUrl(cleanUrl);
      toast.success("Google Review link saved!");
    }
  };

  // Paste from clipboard helper
  const handlePasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUserInputUrl(text.trim());
        toast.success("Link pasted from clipboard!");
      }
    } catch {
      toast.error("Unable to read clipboard. Please paste directly.");
    }
  };

  const hasUnsavedReviewChanges =
    reviewUrl.trim() !== (savedUrl || "").trim() && reviewUrl.trim().length > 0;

  return (
    <div className="max-w-5xl animate-in fade-in duration-500 space-y-5">
      {/* Top Filter Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-gray-100/80 dark:bg-dark-surface border border-gray-200/60 dark:border-dark-border rounded-2xl w-fit flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === "all"
              ? "bg-white dark:bg-dark-card text-brand-primary dark:text-blue-400 border border-gray-200/80 dark:border-dark-border shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Layers size={14} />
          <span>All QR Codes</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("website")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === "website"
              ? "bg-white dark:bg-dark-card text-brand-primary dark:text-blue-400 border border-gray-200/80 dark:border-dark-border shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Globe size={14} />
          <span>Shop Website QR</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("google-review")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-all cursor-pointer ${
            activeTab === "google-review"
              ? "bg-white dark:bg-dark-card text-amber-600 dark:text-amber-400 border border-gray-200/80 dark:border-dark-border shadow-sm"
              : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Star size={14} className="text-amber-500 fill-amber-500" />
          <span>Google Review & Map QR</span>
          {reviewUrl.trim() && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          )}
        </button>
      </div>

      {/* QR Codes Grid Container - Same Row, Same Height, Same Width */}
      <div
        className={`grid gap-5 items-stretch ${
          activeTab === "all"
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1 max-w-lg mx-auto"
        }`}
      >
        {/* CARD 1: Shop Website QR */}
        {(activeTab === "all" || activeTab === "website") && (
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5 flex flex-col justify-between h-full space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100 dark:border-dark-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary dark:text-blue-400 shrink-0">
                  <Globe size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                    Shop Website QR
                  </h3>
                  <p className="text-[11px] text-gray-400 font-medium">
                    Main customer landing page & service catalogue
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
                Live
              </span>
            </div>

            {/* URL Display Pill */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                  <Globe size={12} className="text-brand-primary" />
                  <span>Public Shop URL</span>
                </span>
                <span className="text-[10px] text-gray-400">vijayajalakam.com</span>
              </div>
              <div className="flex items-center justify-between h-9 px-3 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-xs font-mono text-gray-700 dark:text-gray-300 overflow-hidden">
                <span className="truncate">{shopUrl}</span>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(shopUrl);
                      toast.success("Shop link copied!");
                    }}
                    title="Copy Link"
                    className="p-1 text-gray-400 hover:text-brand-primary transition-colors cursor-pointer"
                  >
                    <Copy size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open(shopUrl, "_blank")}
                    title="Open Website"
                    className="p-1 text-gray-400 hover:text-brand-primary transition-colors cursor-pointer"
                  >
                    <ExternalLink size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Centered QR Canvas Box */}
            <div className="flex flex-col items-center justify-center py-2 my-auto">
              <div className="w-[188px] h-[188px] p-3.5 bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border flex items-center justify-center">
                <QRCodeCanvas
                  id="qr-website"
                  value={shopUrl}
                  size={160}
                  level={"H"}
                  includeMargin={false}
                />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-2.5">
                Scan to browse shop
              </span>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => downloadQR("qr-website", `${shopSlug}-website`)}
                className="flex-1 h-10 flex items-center justify-center gap-1.5 px-3 bg-gray-50 dark:bg-dark-surface hover:bg-gray-100 dark:hover:bg-dark-border text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl transition-all cursor-pointer border border-gray-200/80 dark:border-dark-border"
              >
                <Download size={15} />
                <span>Download</span>
              </button>

              <div className="relative flex-1">
                <button
                  type="button"
                  onClick={() => setIsShareWebsiteOpen((prev) => !prev)}
                  className="w-full h-10 flex items-center justify-center gap-1.5 px-3 bg-brand-primary text-white font-bold text-xs rounded-xl hover:bg-brand-primary/90 transition-all cursor-pointer"
                >
                  <Share2 size={15} />
                  <span>Share</span>
                </button>

                <AnimatePresence>
                  {isShareWebsiteOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsShareWebsiteOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border p-1 z-50 flex flex-col gap-0.5 shadow-lg"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsShareWebsiteOpen(false);
                            shareQR(
                              "qr-website",
                              `${shopSlug}-website`,
                              shopUrl,
                              "My Shop Website"
                            );
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card text-left transition-colors cursor-pointer border-none"
                        >
                          <Share2
                            size={14}
                            className="text-brand-primary dark:text-blue-400"
                          />
                          <span>Share Image</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsShareWebsiteOpen(false);
                            navigator.clipboard.writeText(shopUrl);
                            toast.success("Link copied to clipboard!", {
                              position: "bottom-center",
                            });
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card text-left transition-colors cursor-pointer border-none"
                        >
                          <Copy size={14} className="text-emerald-600" />
                          <span>Copy Link</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsShareWebsiteOpen(false);
                            window.open(shopUrl, "_blank");
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card text-left transition-colors cursor-pointer border-none"
                        >
                          <ExternalLink size={14} className="text-blue-500" />
                          <span>Open Website</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* CARD 2: Google Review & Map QR */}
        {(activeTab === "all" || activeTab === "google-review") && (
          <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-dark-border rounded-2xl p-5 flex flex-col justify-between h-full space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100 dark:border-dark-border">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400 shrink-0">
                  <Star size={18} className="fill-amber-500 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                    Google Review & Map QR
                  </h3>
                  <p className="text-[11px] text-gray-400 font-medium">
                    Collect customer reviews & Google Maps directions
                  </p>
                </div>
              </div>
              {reviewUrl.trim() ? (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/40 shrink-0">
                  Active
                </span>
              ) : (
                <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-dark-surface px-2 py-0.5 rounded-full border border-gray-200 dark:border-dark-border shrink-0">
                  Not Set
                </span>
              )}
            </div>

            {/* Input Form Area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold text-gray-600 dark:text-gray-300 flex items-center gap-1">
                  <MapPin size={12} className="text-red-500" />
                  <span>Google Link (Review or Maps)</span>
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePasteFromClipboard}
                    className="text-[10px] font-bold text-brand-primary dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                    title="Paste from clipboard"
                  >
                    <ClipboardPaste size={11} />
                    <span>Paste</span>
                  </button>
                  {reviewUrl && (
                    <button
                      type="button"
                      onClick={() => setUserInputUrl("")}
                      className="text-[10px] font-semibold text-gray-400 hover:text-red-500 flex items-center gap-0.5 cursor-pointer"
                      title="Clear field"
                    >
                      <X size={11} />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type="url"
                    placeholder="https://g.page/r/... or maps link"
                    value={reviewUrl}
                    onChange={(e) => setUserInputUrl(e.target.value)}
                    className="w-full h-9 px-3 pr-7 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-brand-primary font-mono"
                  />
                  {reviewUrl && (
                    <button
                      type="button"
                      onClick={() => window.open(reviewUrl, "_blank")}
                      title="Test Link in new tab"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-primary cursor-pointer p-0.5"
                    >
                      <ExternalLink size={13} />
                    </button>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleSaveReviewLink}
                  disabled={isSavingProfile || !reviewUrl.trim()}
                  className={`h-9 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-all cursor-pointer shrink-0 ${
                    hasUnsavedReviewChanges
                      ? "bg-amber-500 hover:bg-amber-600 text-white"
                      : "bg-brand-primary hover:bg-brand-primary/90 text-white"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="Save Link"
                >
                  {isSavingProfile ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : hasUnsavedReviewChanges ? (
                    <>
                      <Save size={13} />
                      <span>Save</span>
                    </>
                  ) : (
                    <>
                      <Check size={13} />
                      <span>Saved</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Centered QR Canvas Box or Matched Placeholder */}
            <div className="flex flex-col items-center justify-center py-2 my-auto">
              {reviewUrl.trim() ? (
                <>
                  <div className="w-[188px] h-[188px] p-3.5 bg-white dark:bg-dark-surface rounded-xl border border-gray-200 dark:border-dark-border flex items-center justify-center">
                    <QRCodeCanvas
                      id="qr-google-review"
                      value={reviewUrl.trim()}
                      size={160}
                      level={"H"}
                      includeMargin={false}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider mt-2.5 flex items-center gap-1">
                    <Star size={11} className="fill-amber-500 text-amber-500" />
                    <span>Scan for Google Reviews</span>
                  </span>
                </>
              ) : (
                <>
                  <div className="w-[188px] h-[188px] p-3.5 rounded-xl border-2 border-dashed border-gray-200 dark:border-dark-border flex flex-col items-center justify-center text-center bg-gray-50/50 dark:bg-dark-surface/50">
                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/30 text-amber-500 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/40 mb-2">
                      <Star size={18} className="fill-amber-500 text-amber-500" />
                    </div>
                    <p className="text-[11px] font-bold text-gray-700 dark:text-gray-300 leading-tight">
                      Paste Link Above
                    </p>
                    <p className="text-[9px] text-gray-400 mt-1 max-w-[130px] leading-snug">
                      QR updates live once link is entered
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-2.5">
                    Awaiting Google Link
                  </span>
                </>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={!reviewUrl.trim()}
                onClick={() =>
                  downloadQR("qr-google-review", `${shopSlug}-google-review`)
                }
                className="flex-1 h-10 flex items-center justify-center gap-1.5 px-3 bg-gray-50 dark:bg-dark-surface hover:bg-gray-100 dark:hover:bg-dark-border text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl transition-all cursor-pointer border border-gray-200/80 dark:border-dark-border disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={15} />
                <span>Download</span>
              </button>

              <div className="relative flex-1">
                <button
                  type="button"
                  disabled={!reviewUrl.trim()}
                  onClick={() => setIsShareReviewOpen((prev) => !prev)}
                  className="w-full h-10 flex items-center justify-center gap-1.5 px-3 bg-brand-primary text-white font-bold text-xs rounded-xl hover:bg-brand-primary/90 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Share2 size={15} />
                  <span>Share</span>
                </button>

                <AnimatePresence>
                  {isShareReviewOpen && reviewUrl.trim() && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setIsShareReviewOpen(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute bottom-full left-0 right-0 mb-2 rounded-xl bg-white dark:bg-dark-surface border border-gray-200 dark:border-dark-border p-1 z-50 flex flex-col gap-0.5 shadow-lg"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setIsShareReviewOpen(false);
                            shareQR(
                              "qr-google-review",
                              `${shopSlug}-google-review`,
                              reviewUrl.trim(),
                              "Google Review & Map Link"
                            );
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card text-left transition-colors cursor-pointer border-none"
                        >
                          <Share2
                            size={14}
                            className="text-brand-primary dark:text-blue-400"
                          />
                          <span>Share Image</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsShareReviewOpen(false);
                            navigator.clipboard.writeText(reviewUrl.trim());
                            toast.success("Link copied to clipboard!", {
                              position: "bottom-center",
                            });
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card text-left transition-colors cursor-pointer border-none"
                        >
                          <Copy size={14} className="text-emerald-600" />
                          <span>Copy Link</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsShareReviewOpen(false);
                            window.open(reviewUrl.trim(), "_blank");
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-dark-card text-left transition-colors cursor-pointer border-none"
                        >
                          <ExternalLink size={14} className="text-blue-500" />
                          <span>Open Link</span>
                        </button>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-center gap-2 py-4 text-gray-400 dark:text-gray-600">
        <Clock size={13} />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
          Live QR Generation Engine | Hosted on vijayajalakam.com
        </span>
      </div>
    </div>
  );
};

export default QrCodePage;
