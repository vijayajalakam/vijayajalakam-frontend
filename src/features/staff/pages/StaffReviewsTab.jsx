import React, { useState, useEffect } from "react";
import { Star, User, MessageSquare, Trash2 } from "lucide-react";
import { useSelector, useDispatch } from "react-redux";
import { fetchShopReviews, submitReviewReply, deleteShopReview, selectShopReviews, selectReviewLoading, selectReviewSubmitting } from "../../../store/slices/reviewSlice";
import Snackbar from "../../../components/shared/Snackbar";
import ConfirmModal from "../../../components/shared/ConfirmModal";
import moment from "moment";
import { motion as Motion } from "framer-motion";

const ReviewSkeleton = () => (
  <div className="space-y-4">
    {[1, 2].map((i) => (
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

const StaffReviewsTab = ({ staffId }) => {
  const dispatch = useDispatch();
  
  const reviews = useSelector(selectShopReviews);
  const loading = useSelector(selectReviewLoading);
  const submitting = useSelector(selectReviewSubmitting);

  const [selectedReview, setSelectedReview] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [snack, setSnack] = useState({ message: "", type: "success" });
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Only fetch if we need to. This will fetch all Staff reviews.
    dispatch(fetchShopReviews({ itemType: "Staff" }));
  }, [dispatch]);

  // Filter reviews by staffId
  const filteredReviews = reviews.filter(
    (review) => review.itemId?._id === staffId || review.itemId === staffId
  );
  
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

  return (
    <Motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-5"
    >
      <Snackbar
        message={snack.message}
        type={snack.type}
        onClose={() => setSnack({ ...snack, message: "" })}
      />

      <div className="space-y-4">
        <h3 className="text-xs font-bold uppercase text-gray-400 dark:text-gray-500 tracking-widest">
          Staff Reviews
        </h3>
        
        {loading ? (
          <ReviewSkeleton />
        ) : filteredReviews.length > 0 ? (
          <div className="space-y-4">
            {displayedReviews.map((review) => (
              <Motion.div 
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
                      type="button"
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
                      type="button"
                      onClick={() => handleDelete(review._id)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl transition-all h-fit"
                    >
                      <Trash2 size={14} />
                      Delete
                    </button>
                  </div>
                </div>
              </Motion.div>
            ))}
            
            {filteredReviews.length > 5 && (
              <div className="flex justify-center mt-6">
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="px-6 py-2.5 bg-gray-100 dark:bg-dark-surface hover:bg-gray-200 dark:hover:bg-dark-border text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl transition-all"
                >
                  {isExpanded ? "Show Less" : `See All Reviews (${filteredReviews.length})`}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center border-2 border-dashed border-gray-100 dark:border-dark-border rounded-2xl bg-gray-50/50 dark:bg-dark-surface/50">
            <Star size={40} className="text-gray-200 mb-4" />
            <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400">No reviews found</h3>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">When customers leave feedback for this staff, it will appear here.</p>
          </div>
        )}
      </div>

      {/* Reply Modal */}
      {selectedReview && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <Motion.div 
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
          </Motion.div>
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
    </Motion.div>
  );
};

export default StaffReviewsTab;
