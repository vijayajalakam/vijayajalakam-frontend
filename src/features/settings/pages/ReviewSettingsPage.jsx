import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Star, User, Search, Store, Scissors, ShoppingBag, MessageSquare, Users, Trash2 } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { fetchShopReviews, submitReviewReply, deleteShopReview, selectShopReviews, selectReviewLoading, selectReviewSubmitting } from "../../../store/slices/reviewSlice";
import Snackbar from "../../../components/shared/Snackbar";
import SettingsSection from "../../../components/shared/SettingsSection";
import CustomDropdown from "../../../components/shared/CustomDropdown";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import moment from "moment";
import { motion } from "framer-motion";

const ALL_TABS = [
  { id: "Shop", label: "Shop", icon: Store },
  { id: "Service", label: "Service", icon: Scissors },
  { id: "Product", label: "Product", icon: ShoppingBag },
  { id: "Staff", label: "Staff", icon: Users },
];

const ReviewSkeleton = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="p-5 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl flex flex-col sm:flex-row gap-4 shadow-sm animate-pulse">
        <div className="flex gap-4 flex-1">
          <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-dark-surface shrink-0" />
          <div className="flex-1 space-y-3 py-1">
            <div className="h-4 bg-gray-200 dark:bg-dark-surface rounded w-1/3" />
            <div className="h-3 bg-gray-200 dark:bg-dark-surface rounded w-1/4" />
            <div className="h-3 bg-gray-200 dark:bg-dark-surface rounded w-full" />
            <div className="h-3 bg-gray-200 dark:bg-dark-surface rounded w-5/6" />
          </div>
        </div>
        <div className="sm:text-right mt-2 sm:mt-0 flex gap-2 justify-end sm:flex-col sm:justify-start shrink-0">
          <div className="w-24 h-8 bg-gray-200 dark:bg-dark-surface rounded-xl" />
          <div className="w-24 h-8 bg-gray-200 dark:bg-dark-surface rounded-xl" />
        </div>
      </div>
    ))}
  </div>
);

const ReviewSettingsPage = ({ itemType: propItemType }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [activeTab, setActiveTab] = useState(propItemType || "Shop");
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("");

  const reviews = useSelector(selectShopReviews);
  const loading = useSelector(selectReviewLoading);
  const submitting = useSelector(selectReviewSubmitting);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReview, setSelectedReview] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [snack, setSnack] = useState({ message: "", type: "success" });

  useEffect(() => {
    dispatch(fetchShopReviews({ itemType: activeTab }));
    setIsExpanded(false);
    setSelectedStaff("");
  }, [activeTab, dispatch]);

  const uniqueStaffList = React.useMemo(() => {
    if (activeTab !== "Staff") return [];
    const staffMap = new Map();
    reviews.forEach(r => {
      if (r.itemId && r.itemId._id && r.itemId.name) {
        staffMap.set(r.itemId._id, r.itemId.name);
      }
    });
    return Array.from(staffMap.entries()).map(([id, name]) => ({ value: id, label: name }));
  }, [reviews, activeTab]);

  const filteredReviews = reviews.filter((review) => {
    const searchStr = searchTerm.toLowerCase();
    const matchesSearch = (
      review.user?.name?.toLowerCase().includes(searchStr) ||
      review.itemId?.name?.toLowerCase().includes(searchStr) ||
      review.comment?.toLowerCase().includes(searchStr)
    );

    if (activeTab === "Staff" && selectedStaff) {
      return matchesSearch && review.itemId?._id === selectedStaff;
    }
    return matchesSearch;
  });

  const displayedReviews = isExpanded ? filteredReviews : filteredReviews.slice(0, 5);

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      const resultAction = await dispatch(
        submitReviewReply({ reviewId: selectedReview._id, reply: replyText })
      ).unwrap();

      if (resultAction.success) {
        setSnack({ message: "Reply added successfully!", type: "success" });
        setSelectedReview(null);
        setReplyText("");
      }
    } catch (error) {
      setSnack({ message: error?.message || "Failed to submit reply.", type: "error" });
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);

  const handleDelete = (reviewId) => {
    setReviewToDelete(reviewId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      const resultAction = await dispatch(deleteShopReview({ reviewId: reviewToDelete })).unwrap();
      if (resultAction.success) {
        setSnack({ message: "Review deleted successfully!", type: "success" });
      }
    } catch (error) {
      setSnack({ message: error?.message || "Failed to delete review.", type: "error" });
    } finally {
      setShowDeleteConfirm(false);
      setReviewToDelete(null);
    }
  };

  const getTabSubtitle = () => {
    switch (activeTab) {
      case "Shop": return "Manage general reviews and feedback for your shop.";
      case "Service": return "Manage reviews for specific services you offer.";
      case "Product": return "Manage reviews for products sold in your shop.";
      case "Staff": return "Manage reviews for your staff members.";
      default: return "";
    }
  };

  return (
    <div className="max-w-4xl animate-in fade-in duration-500 space-y-6">
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />



      {/* Tab Navigation */}
      <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-2">
        {ALL_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap transition-all text-sm font-semibold border ${
                isActive
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

      {/* Content Section */}
      <div className="w-full">
        <SettingsSection
          title={`${activeTab} Reviews`}
          subtitle={getTabSubtitle()}
          icon={ALL_TABS.find(t => t.id === activeTab)?.icon}
        >
          <div className="md:col-span-2">
            
            {/* Search Bar and Filter */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                <input
                  type="text"
                  placeholder="Search reviews by user, item name or comment..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all"
                />
              </div>
              
              {activeTab === "Staff" && uniqueStaffList.length > 0 && (
                <div className="sm:w-64">
                  <CustomDropdown
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    options={[
                      { value: "", label: "All Staff Members" },
                      ...uniqueStaffList
                    ]}
                    placeholder="Filter by Staff"
                    icon={Users}
                    buttonClassName="w-full flex items-center justify-between min-w-0 bg-white dark:bg-dark-surface text-gray-900 dark:text-gray-100 text-sm font-medium outline-none transition-all duration-200 px-4 py-3 rounded-xl border border-gray-200 dark:border-dark-border hover:bg-gray-50 dark:hover:bg-dark-border focus:ring-2 focus:ring-brand-primary/20"
                  />
                </div>
              )}
            </div>

            {/* Reviews List */}
            {loading ? (
              <ReviewSkeleton />
            ) : filteredReviews.length > 0 ? (
              <div className="space-y-4">
                {displayedReviews.map((review) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={review._id} 
                    className="p-5 bg-white dark:bg-dark-card border border-gray-100 dark:border-dark-border rounded-2xl hover:border-brand-primary/30 transition-all shadow-sm"
                  >
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex gap-4 flex-1">
                        <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-dark-surface border border-gray-100 dark:border-dark-border flex items-center justify-center shrink-0 overflow-hidden">
                          {review.user?.profileImage ? (
                            <img src={review.user.profileImage} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <User size={20} className="text-gray-400 dark:text-gray-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="font-bold text-gray-900 dark:text-white">{review.user?.name || "Unknown User"}</span>
                            {review.itemId?.name && (
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                                for {review.itemId.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mb-3">
                            <div className="flex gap-0.5 text-user-gold">
                              {[1, 2, 3, 4, 5].map((s) => (
                                <Star key={s} size={14} fill={review.rating >= s ? "currentColor" : "none"} strokeWidth={review.rating >= s ? 0 : 2} />
                              ))}
                            </div>
                            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-dark-surface px-2 py-0.5 rounded-full">
                              {moment(review.createdAt).fromNow()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
                            {review.comment}
                          </p>

                          {review.reply && (
                            <div className="bg-brand-primary/5 dark:bg-brand-primary/10 p-4 rounded-xl border-l-2 border-brand-primary">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-brand-primary dark:text-blue-400 mb-1">Response from owner</p>
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{review.reply}</p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="sm:text-right mt-2 sm:mt-0 flex gap-2 justify-end sm:flex-col sm:justify-start">
                        <button
                          onClick={() => {
                            setSelectedReview(review);
                            setReplyText(review.reply || "");
                          }}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-50 dark:bg-dark-surface hover:bg-gray-100 dark:hover:bg-dark-border text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl transition-all h-fit"
                        >
                          <MessageSquare size={14} />
                          {review.reply ? "Edit Reply" : "Reply"}
                        </button>
                        <button
                          onClick={() => handleDelete(review._id)}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl transition-all h-fit"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-gray-100 dark:border-dark-border rounded-2xl bg-gray-50/50 dark:bg-dark-surface/50">
                <Star size={48} className="text-gray-200 mb-4" />
                <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400">No {activeTab.toLowerCase()} reviews found</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">When customers leave feedback, it will appear here.</p>
              </div>
            )}

            {filteredReviews.length > 5 && (
              <div className="flex justify-center mt-6">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="px-6 py-2.5 bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-border text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl transition-all"
                >
                  {isExpanded ? "Show Less" : `See All Reviews (${filteredReviews.length})`}
                </button>
              </div>
            )}
          </div>
        </SettingsSection>
      </div>

      {/* Quick Footer Note */}
      <div className="mt-10 mb-20 flex items-center justify-center gap-2 text-gray-400/60 dark:text-gray-500/40">
        <Star className="w-3 h-3" />
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Customer Reviews Management</span>
      </div>

      {/* Reply Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-dark-card rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-dark-border"
          >
            <div className="flex items-center gap-3 mb-6">
               <div className="p-3 bg-brand-primary/10 rounded-xl">
                 <MessageSquare size={24} className="text-brand-primary dark:text-blue-400" />
               </div>
               <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                    {selectedReview.reply ? "Edit Reply" : "Reply to Review"}
                  </h3>
                  <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">Review by {selectedReview.user?.name}</p>
               </div>
            </div>
            
            <form onSubmit={handleReplySubmit} className="space-y-6">
              <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                rows={5}
                autoFocus
                className="w-full bg-gray-50 dark:bg-dark-surface border border-gray-200 dark:border-dark-border rounded-2xl p-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 transition-all resize-none dark:text-white"
                placeholder="Write your response here..."
              ></textarea>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedReview(null)}
                  className="px-5 py-2.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:bg-dark-card dark:hover:bg-dark-surface rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !replyText.trim()}
                  className="px-6 py-2.5 text-sm font-bold text-white bg-brand-primary rounded-xl transition-all hover:bg-brand-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {submitting ? "Saving..." : "Send Reply"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setReviewToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Review"
        message="Are you sure you want to delete this review? This action cannot be undone."
        confirmLabel="Delete Review"
      />
    </div>
  );
};

export default ReviewSettingsPage;
