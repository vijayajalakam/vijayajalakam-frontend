import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axiosInstance";

// Fetch payouts
export const fetchPayouts = createAsyncThunk(
  "payouts/fetchPayouts",
  async ({ startDate, endDate, staffId } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (staffId && staffId !== "all") params.append("staffId", staffId);

      const response = await api.get(`/invoices/payouts?${params.toString()}`);
      return response.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// Delete payout
export const deletePayout = createAsyncThunk(
  "payouts/deletePayout",
  async (id, { rejectWithValue }) => {
    try {
      const response = await api.delete(`/invoices/payouts/${id}`);
      return { id, message: response.data.message };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

const payoutSlice = createSlice({
  name: "payouts",
  initialState: {
    payouts: [],
    loading: false,
    error: null,
    deleteLoading: false,
    deleteError: null,
    deleteSuccess: false,
  },
  reducers: {
    resetDeleteState: (state) => {
      state.deleteLoading = false;
      state.deleteError = null;
      state.deleteSuccess = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch
      .addCase(fetchPayouts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPayouts.fulfilled, (state, action) => {
        state.loading = false;
        state.payouts = action.payload.data || [];
      })
      .addCase(fetchPayouts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Delete
      .addCase(deletePayout.pending, (state) => {
        state.deleteLoading = true;
        state.deleteError = null;
        state.deleteSuccess = false;
      })
      .addCase(deletePayout.fulfilled, (state, action) => {
        state.deleteLoading = false;
        state.deleteSuccess = true;
        state.payouts = state.payouts.filter((p) => p._id !== action.payload.id);
      })
      .addCase(deletePayout.rejected, (state, action) => {
        state.deleteLoading = false;
        state.deleteError = action.payload;
      });
  },
});

export const { resetDeleteState } = payoutSlice.actions;
export default payoutSlice.reducer;
