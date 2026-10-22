import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  shopSlug: null,
  shopName: null,
  shopImage: null,
  // Selected services: [{ _id, name, price, duration, variantId, variantName, originalPrice }]
  selectedServices: [],
  // Staff: { _id, name, photo, role } or null for "No preference"
  selectedStaff: null,
  // Per-service staff overrides: { "<serviceId>:<variantId|>" : { _id, name, photo, role } | null }
  // null/missing means "No preference" for that service
  perServiceStaff: {},
  // Date as ISO string and slot times array
  selectedDate: null,
  selectedSlotTimes: [],
  // Payment
  paymentMethod: "PAY_LATER", // 'PAY_NOW' or 'PAY_LATER'
  departmentId: null,
};

const bookingFlowSlice = createSlice({
  name: "bookingFlow",
  initialState,
  reducers: {
    setShopContext(state, { payload }) {
      state.shopSlug = payload.shopSlug;
      state.shopName = payload.shopName;
      state.shopImage = payload.shopImage;
    },
    setBookingDepartmentId(state, { payload }) {
      state.departmentId = payload;
    },
    addSelectedService(state, { payload }) {
      // payload: { _id, name, price, duration, variantId?, variantName?, originalPrice?, departmentId?, isTaxInclusive?, taxPercentage?, taxAmount?, basePrice? }
      const exists = state.selectedServices.find(
        (s) => s._id === payload._id && s.variantId === payload.variantId
      );
      if (!exists) {
        state.selectedServices.push(payload);
      }
    },
    removeSelectedService(state, { payload }) {
      // payload: { _id, variantId? }
      state.selectedServices = state.selectedServices.filter(
        (s) => !(s._id === payload._id && (s.variantId || null) === (payload.variantId || null))
      );
    },
    updateSelectedServices(state, { payload }) {
      state.selectedServices = payload;
    },
    setSelectedStaff(state, { payload }) {
      state.selectedStaff = payload;
    },
    setPerServiceStaff(state, { payload }) {
      // payload: { key, staff }  where key = "<serviceId>:<variantId|>"
      if (payload.staff === null) {
        delete state.perServiceStaff[payload.key];
      } else {
        state.perServiceStaff[payload.key] = payload.staff;
      }
    },
    clearPerServiceStaff(state) {
      state.perServiceStaff = {};
    },
    setSelectedDateTime(state, { payload }) {
      state.selectedDate = payload.date;
      state.selectedSlotTimes = payload.slotTimes;
    },
    setPaymentMethod(state, { payload }) {
      state.paymentMethod = payload;
    },
    clearBookingFlow(state) {
      Object.assign(state, initialState);
    },
  },
});

export const {
  setShopContext,
  setBookingDepartmentId,
  addSelectedService,
  removeSelectedService,
  updateSelectedServices,
  setSelectedStaff,
  setPerServiceStaff,
  clearPerServiceStaff,
  setSelectedDateTime,
  setPaymentMethod,
  clearBookingFlow,
} = bookingFlowSlice.actions;

export default bookingFlowSlice.reducer;

// Selectors
export const selectBookingFlow = (state) => state.bookingFlow;
export const selectBookingDepartmentId = (state) => state.bookingFlow.departmentId;
export const selectSelectedServices = (state) => state.bookingFlow.selectedServices;
export const selectBookingTotal = (state) =>
  state.bookingFlow.selectedServices.reduce((sum, s) => sum + (s.price || 0), 0);
export const selectBookingBaseTotal = (state) =>
  state.bookingFlow.selectedServices.reduce((sum, s) => sum + (s.basePrice || s.price || 0), 0);
export const selectBookingTaxTotal = (state) =>
  state.bookingFlow.selectedServices.reduce((sum, s) => sum + (s.taxAmount || 0), 0);
export const selectBookingDuration = (state) =>
  state.bookingFlow.selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0);
