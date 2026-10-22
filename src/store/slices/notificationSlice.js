import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isDropdownOpen: false,
  lastViewedAt: localStorage.getItem('lastNotificationViewedAt') || null,
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: 'notification',
  initialState,
  reducers: {
    toggleDropdown: (state) => {
      state.isDropdownOpen = !state.isDropdownOpen;
      if (state.isDropdownOpen) {
        state.lastViewedAt = new Date().toISOString();
        localStorage.setItem('lastNotificationViewedAt', state.lastViewedAt);
      }
    },
    closeDropdown: (state) => {
      state.isDropdownOpen = false;
    },
    setUnreadCount: (state, action) => {
      state.unreadCount = action.payload;
    },
    markRead: (state) => {
      state.unreadCount = 0;
      state.lastViewedAt = new Date().toISOString();
      localStorage.setItem('lastNotificationViewedAt', state.lastViewedAt);
    }
  },
});

export const { toggleDropdown, closeDropdown, setUnreadCount, markRead } = notificationSlice.actions;

export const selectNotificationState = (state) => state.notification;

export default notificationSlice.reducer;
