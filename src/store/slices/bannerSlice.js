import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../api/axiosInstance";

export const fetchActiveBanners = createAsyncThunk(
  "banners/fetchActive",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/banners/active");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const bannerSlice = createSlice({
  name: "banners",
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchActiveBanners.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchActiveBanners.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchActiveBanners.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export default bannerSlice.reducer;
