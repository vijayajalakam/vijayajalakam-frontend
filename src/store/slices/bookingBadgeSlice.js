import { createSlice } from "@reduxjs/toolkit";

const getInitialBadgeCount = () => {
  const val = parseInt(localStorage.getItem("bookingBadgeCount"), 10);
  return isNaN(val) ? 0 : val;
};

const initialState = {
  badgeCount: getInitialBadgeCount(),
};

const bookingBadgeSlice = createSlice({
  name: "bookingBadge",
  initialState,
  reducers: {
    incrementBadgeCount: (state, action) => {
      const amount = typeof action.payload === 'number' ? action.payload : 1;
      if (isNaN(state.badgeCount)) state.badgeCount = 0;
      state.badgeCount += amount;
      localStorage.setItem("bookingBadgeCount", state.badgeCount.toString());
    },
    decrementBadgeCount: (state) => {
      if (state.badgeCount > 0) {
        state.badgeCount -= 1;
        localStorage.setItem("bookingBadgeCount", state.badgeCount.toString());
      }
    },
    clearBadgeCount: (state) => {
      state.badgeCount = 0;
      localStorage.setItem("bookingBadgeCount", "0");
    },
    setBadgeCount: (state, action) => {
      state.badgeCount = action.payload;
      localStorage.setItem("bookingBadgeCount", state.badgeCount.toString());
    },
  },
});

export const {
  incrementBadgeCount,
  decrementBadgeCount,
  clearBadgeCount,
  setBadgeCount,
} = bookingBadgeSlice.actions;

export const selectBookingBadgeCount = (state) => state.bookingBadge.badgeCount;

export default bookingBadgeSlice.reducer;
