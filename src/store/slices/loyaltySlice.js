import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  formData: {
    isActive: false,
    minimumSalesAmount: 100,
    amountPerPoint: 1,
    minimumRedeemPoints: 10,
    pointValue: 5,
    isRoundOff: false,
  }
};

const loyaltySlice = createSlice({
  name: 'loyalty',
  initialState,
  reducers: {
    setLoyaltyForm(state, action) {
      state.formData = { ...state.formData, ...action.payload };
    },
    resetLoyaltyForm(state) {
      state.formData = initialState.formData;
    }
  }
});

export const { setLoyaltyForm, resetLoyaltyForm } = loyaltySlice.actions;

export const selectLoyaltyForm = (state) => state.loyalty.formData;

export default loyaltySlice.reducer;
