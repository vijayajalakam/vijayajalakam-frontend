import React, { useState, useEffect } from "react";
import { Star, Send, User } from "lucide-react";
import { useAuth } from "../../features/auth/hooks/useAuth";
import moment from "moment";
import { useSelector, useDispatch } from "react-redux";
import { selectSelectedBranchId } from "../../store/slices/userAppSlice";
import { fetchItemReviews, submitReview, selectItemReviews, selectReviewLoading, selectReviewSubmitting } from "../../store/slices/reviewSlice";

const ReviewSection = ({ itemId, itemType }) => {
  const dispatch = useDispatch();
  const { user } = useAuth();
  const shopId = useSelector(selectSelectedBranchId);
  const reviews = useSelector(selectItemReviews);
  const loading = useSelector(selectReviewLoading);
  const submitting = useSelector(selectReviewSubmitting);
  
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [snack, setSnack] = useState({ message: "", type: "success" });

  useEffect(() => {
    if (itemId && itemType) {
      dispatch(fetchItemReviews({ itemType, itemId }));
    }
  }, [itemId, itemType, dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setSnack({ message: "Please login to submit a review", type: "error" });
      return;
    }
    if (!comment.trim()) {
      return;
    }

    try {
      const resultAction = await dispatch(submitReview({ itemId, itemType, shopId, rating, comment })).unwrap();
      
      if (resultAction.success) {
        setSnack({ message: "Review submitted successfully!", type: "success" });
        setComment("");
        setRating(5);
      }
    } catch (err) {
      setSnack({ message: err?.message || "Failed to submit review", type: "error" });
    }
  };

  return (
    <div className="mt-20">
      {/* Google Reviews Style Header */}
      <div className="flex items-center justify-between mb-10 pb-4 border-b border-gray-100 dark:border-dark-border">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Reviews</h3>
        <span className="text-sm text-gray-400 dark:text-gray-500">{reviews.length} reviews</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-16">
        {/* Simple Form */}
        <div className="md:col-span-12 lg:col-span-4 space-y-6 order-2 lg:order-1">
          <div className="bg-gray-50 dark:bg-dark-card/50 p-6 rounded-2xl border border-gray-100 dark:border-dark-border">
            <h4 className="font-semibold text-sm mb-6">Write a review</h4>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    type="button"
                    key={star}
                    onClick={() => setRating(star)}
                    className={`transition-colors ${
                      rating >= star ? "text-user-gold" : "text-gray-200"
                    }`}
                  >
                    <Star size={22} fill={rating >= star ? "currentColor" : "none"} strokeWidth={rating >= star ? 0 : 2} />
                  </button>
                ))}
              </div>
              
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with others..."
                rows={4}
                className="w-full bg-white dark:bg-dark-surface border border-gray-100 dark:border-dark-border focus:border-user-gold focus:ring-1 focus:ring-user-gold rounded-xl p-4 text-sm resize-none transition-all placeholder:text-gray-300"
              ></textarea>
              
              <button
                type="submit"
                disabled={submitting || !user || !comment.trim()}
                className="w-full flex items-center justify-center gap-2 bg-black text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black/90 transition-all disabled:bg-gray-200 dark:bg-dark-border disabled:cursor-not-allowed"
              >
                {submitting ? "Submitting..." : user ? "Post Review" : "Login to post"}
                {!submitting && <Send size={14} />}
              </button>
            </form>
          </div>
        </div>

        {/* Clean Reviews List */}
        <div className="md:col-span-12 lg:col-span-8 space-y-10 order-1 lg:order-2">
          {loading ? (
             <div className="flex justify-center py-10">
               <div className="w-6 h-6 border-2 border-user-gold border-t-transparent rounded-full animate-spin"></div>
             </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-10 divide-y divide-gray-50">
              {reviews.map((review) => (
                <div key={review._id} className="pt-0 first:pt-0 animate-fade-in group">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-50 dark:bg-dark-card flex items-center justify-center shrink-0">
                      {review.user?.profileImage ? (
                        <img src={review.user.profileImage} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        <User size={18} className="text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{review.user?.name || "Anonymous User"}</p>
                        <span className="text-[10px] text-gray-400 dark:text-gray-500 font-medium uppercase tracking-wider">{moment(review.createdAt).fromNow()}</span>
                      </div>
                      
                      <div className="flex gap-0.5 text-user-gold mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star key={star} size={12} fill={review.rating >= star ? "currentColor" : "none"} strokeWidth={review.rating >= star ? 0 : 2} />
                        ))}
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed font-light">{review.comment}</p>
                      
                      {review.reply && (
                        <div className="mt-4 bg-gray-50 dark:bg-dark-card p-4 rounded-xl border-l-2 border-user-gold animate-slide-right">
                           <p className="text-[10px] font-bold uppercase tracking-widest text-user-gold mb-1">Response from owner</p>
                           <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{review.reply}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center border-2 border-dashed border-gray-50 rounded-[2rem]">
              <Star size={32} className="text-gray-100 mb-4" />
              <p className="text-sm text-gray-400 dark:text-gray-500">No reviews found for this item.</p>
            </div>
          )}
        </div>
      </div>
      
      {snack.message && (
        <div className={`fixed bottom-6 right-6 px-6 py-3 rounded-xl shadow-2xl z-50 animate-fade-in ${snack.type === 'error' ? 'bg-red-500 text-white' : 'bg-black text-white'}`}>
          <div className="flex items-center gap-4">
            <p className="text-xs font-bold tracking-widest uppercase">{snack.message}</p>
            <button onClick={() => setSnack({ message: "", type: "success" })} className="text-xs opacity-50 hover:opacity-100">CLOSE</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewSection;
