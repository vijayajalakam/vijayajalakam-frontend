import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  searchQuery: "",
  activeServiceCategory: null,
  activeProductCategory: null,
  // Branch state
  selectedBranchId: localStorage.getItem("selectedBranchId") || null,
  selectedBranchName: localStorage.getItem("selectedBranchName") || null,
  selectedBranchAddress: localStorage.getItem("selectedBranchAddress") || null,
  // Customer-side cart
  cart: [],
  cartOpen: false,
  // Current Booking State (Checkout)
  currentBooking: {
    service: null,
    variantId: null,
    departmentId: null,
    date: null,
    slot: null,
    staff: null,
  },
};

const userAppSlice = createSlice({
  name: "userApp",
  initialState,
  reducers: {
    setBranch(state, { payload }) {
      state.selectedBranchId = payload.id;
      state.selectedBranchName = payload.name;
      state.selectedBranchAddress = payload.address;
      localStorage.setItem("selectedBranchId", payload.id);
      localStorage.setItem("selectedBranchName", payload.name);
      localStorage.setItem("selectedBranchAddress", payload.address || "");
      // Also store per-shop branch selection so home page cards can show correct branch
      if (payload.shopSlug) {
        try {
          const perShop = JSON.parse(localStorage.getItem("selectedBranches") || "{}");
          perShop[payload.shopSlug] = { id: payload.id, name: payload.name, address: payload.address || "" };
          localStorage.setItem("selectedBranches", JSON.stringify(perShop));
        } catch {
          // ignore error reading or parsing localStorage
        }
      }
    },
    clearBranch(state) {
      state.selectedBranchId = null;
      state.selectedBranchName = null;
      state.selectedBranchAddress = null;
      localStorage.removeItem("selectedBranchId");
      localStorage.removeItem("selectedBranchName");
      localStorage.removeItem("selectedBranchAddress");
    },
    setSearchQuery(state, { payload }) {
      state.searchQuery = payload;
    },
    setActiveServiceCategory(state, { payload }) {
      state.activeServiceCategory = payload;
    },
    setActiveProductCategory(state, { payload }) {
      state.activeProductCategory = payload;
    },
    setCartOpen(state, { payload }) {
      state.cartOpen = payload;
    },
    
    // Cart Actions
    addToUserCart(state, { payload: item }) {
      const qtyToAdd = Number(item.qty) || 1;
      const existing = state.cart.find(
        (c) => c._id === item._id && c.itemType === item.itemType && 
        (item.variantId ? c.variantId === item.variantId : !c.variantId)
      );
      
      if (existing) {
        existing.qty += qtyToAdd;
      } else {
        state.cart.push({
          ...item,
          qty: qtyToAdd,
        });
      }
    },
    removeFromUserCart(state, { payload: { id, itemType, variantId } }) {
      state.cart = state.cart.filter(
        (c) => !(c._id === id && c.itemType === itemType && (variantId ? c.variantId === variantId : !c.variantId))
      );
    },
    updateUserCartQty(state, { payload: { id, itemType, variantId, qty } }) {
      const item = state.cart.find(
        (c) => c._id === id && c.itemType === itemType && (variantId ? c.variantId === variantId : !c.variantId)
      );
      if (item) {
        item.qty = Math.max(0, qty);
        if (item.qty === 0) {
          state.cart = state.cart.filter(
            (c) => !(c._id === id && c.itemType === itemType && (variantId ? c.variantId === variantId : !c.variantId))
          );
        }
      }
    },
    clearUserCart(state) {
      state.cart = [];
    },
    // Booking Actions
    setCurrentBooking(state, { payload }) {
      state.currentBooking = {
        ...initialState.currentBooking,
        service: payload,
      };
    },
    updateBookingField(state, { payload: { field, value } }) {
      state.currentBooking[field] = value;
    },
    clearCurrentBooking(state) {
      state.currentBooking = initialState.currentBooking;
    },
  },
});

export const {
  setBranch,
  clearBranch,
  setSearchQuery,
  setActiveServiceCategory,
  setActiveProductCategory,
  setCartOpen,
  addToUserCart,
  removeFromUserCart,
  updateUserCartQty,
  clearUserCart,
  setCurrentBooking,
  updateBookingField,
  clearCurrentBooking,
} = userAppSlice.actions;

export default userAppSlice.reducer;

// Selectors
export const selectUserSearchQuery = (state) => state.userApp.searchQuery;
export const selectActiveServiceCategory = (state) => state.userApp.activeServiceCategory;
export const selectActiveProductCategory = (state) => state.userApp.activeProductCategory;
export const selectSelectedBranchId = (state) => state.userApp.selectedBranchId;
export const selectSelectedBranchName = (state) => state.userApp.selectedBranchName;
export const selectSelectedBranchAddress = (state) => state.userApp.selectedBranchAddress;
export const selectUserCart = (state) => state.userApp.cart;
export const selectUserCartCount = (state) => state.userApp.cart.reduce((total, item) => total + item.qty, 0);
export const selectIsCartOpen = (state) => state.userApp.cartOpen;
export const selectCurrentBooking = (state) => state.userApp.currentBooking;
