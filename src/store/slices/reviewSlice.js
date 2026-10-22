import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../api/axiosInstance';

// Async thunk to fetch reviews for a specific item (Service/Product)
export const fetchItemReviews = createAsyncThunk(
  'reviews/fetchItemReviews',
  async ({ itemType, itemId }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/reviews/item/${itemType}/${itemId}`);
      return response.data;
    } catch (error) {
      if (!error.response) throw error;
      return rejectWithValue(error.response.data);
    }
  }
);

// Async thunk to fetch reviews for the shop admin
export const fetchShopReviews = createAsyncThunk(
  'reviews/fetchShopReviews',
  async ({ itemType }, { rejectWithValue }) => {
    try {
      const response = await api.get(`/reviews/shop/${itemType}`);
      return response.data;
    } catch (error) {
      if (!error.response) throw error;
      return rejectWithValue(error.response.data);
    }
  }
);

// Async thunk to submit a review from a customer
export const submitReview = createAsyncThunk(
  'reviews/submitReview',
  async ({ itemId, itemType, shopId, rating, comment }, { rejectWithValue }) => {
    try {
      const response = await api.post('/reviews', { itemId, itemType, shopId, rating, comment });
      return response.data;
    } catch (error) {
      if (!error.response) throw error;
      return rejectWithValue(error.response.data);
    }
  }
);

// Async thunk to reply to a review from the shop admin
export const submitReviewReply = createAsyncThunk(
  'reviews/submitReviewReply',
  async ({ reviewId, reply }, { rejectWithValue }) => {
    try {
        const response = await api.put(`/reviews/${reviewId}/reply`, { reply });
        return response.data;
    } catch (error) {
        if (!error.response) throw error;
        return rejectWithValue(error.response.data);
    }
  }
);

// Async thunk to delete a review from the shop admin
export const deleteShopReview = createAsyncThunk(
  'reviews/deleteShopReview',
  async ({ reviewId }, { rejectWithValue }) => {
    try {
        const response = await api.delete(`/reviews/${reviewId}`);
        // Return reviewId so we can remove it from state
        return { success: true, reviewId };
    } catch (error) {
        if (!error.response) throw error;
        return rejectWithValue(error.response.data);
    }
  }
);

const initialState = {
  itemReviews: [],
  shopReviews: [],
  loading: false,
  submitting: false,
  error: null,
};

const reviewSlice = createSlice({
  name: 'reviews',
  initialState,
  reducers: {
    clearReviews: (state) => {
        state.itemReviews = [];
        state.shopReviews = [];
    },
    clearError: (state) => {
        state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // Fetch Item Reviews
      .addCase(fetchItemReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchItemReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.itemReviews = action.payload.data;
      })
      .addCase(fetchItemReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch item reviews";
      })
      
      // Fetch Shop Reviews
      .addCase(fetchShopReviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchShopReviews.fulfilled, (state, action) => {
        state.loading = false;
        state.shopReviews = action.payload.data;
      })
      .addCase(fetchShopReviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to fetch shop reviews";
      })

      // Submit Review
      .addCase(submitReview.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitReview.fulfilled, (state, action) => {
        state.submitting = false;
        // Optionally prepend new review to list
        if (action.payload.data) {
           state.itemReviews = [action.payload.data, ...state.itemReviews];
        }
      })
      .addCase(submitReview.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload?.message || "Failed to submit review";
      })

      // Submit Reply
      .addCase(submitReviewReply.pending, (state) => {
        state.submitting = true;
        state.error = null;
      })
      .addCase(submitReviewReply.fulfilled, (state, action) => {
        state.submitting = false;
        // Update review inside shopReviews list
        const updatedReview = action.payload.data;
        if (updatedReview) {
            state.shopReviews = state.shopReviews.map((r) => 
                r._id === updatedReview._id 
                  ? { ...r, reply: updatedReview.reply, replyDate: updatedReview.replyDate } 
                  : r
            );
        }
      })
      .addCase(submitReviewReply.rejected, (state, action) => {
        state.submitting = false;
        state.error = action.payload?.message || "Failed to submit reply";
      })
      
      // Delete Review
      .addCase(deleteShopReview.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteShopReview.fulfilled, (state, action) => {
        state.loading = false;
        const { reviewId } = action.payload;
        state.shopReviews = state.shopReviews.filter((r) => r._id !== reviewId);
        state.itemReviews = state.itemReviews.filter((r) => r._id !== reviewId);
      })
      .addCase(deleteShopReview.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Failed to delete review";
      });
  },
});

export const { clearReviews, clearError } = reviewSlice.actions;

export const selectItemReviews = (state) => state.reviews.itemReviews;
export const selectShopReviews = (state) => state.reviews.shopReviews;
export const selectReviewLoading = (state) => state.reviews.loading;
export const selectReviewSubmitting = (state) => state.reviews.submitting;
export const selectReviewError = (state) => state.reviews.error;

export default reviewSlice.reducer;
