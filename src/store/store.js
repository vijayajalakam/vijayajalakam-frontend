import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import authReducer from './slices/authSlice';
import permissionReducer from './slices/permissionSlice';
import stockReducer from './slices/stockSlice';
import invoiceReducer from './slices/invoiceSlice';
import notificationReducer from './slices/notificationSlice';
import userAppReducer from './slices/userAppSlice';
import reviewReducer from './slices/reviewSlice';
import bannerReducer from './slices/bannerSlice';
import bookingFlowReducer from './slices/bookingFlowSlice';
import loyaltyReducer from './slices/loyaltySlice';
import bookingBadgeReducer from './slices/bookingBadgeSlice';
import payoutReducer from './slices/payoutSlice';

import { appApi } from './api/appApi';
import './api/tenantEndpoints';
import './api/tenantCrudEndpoints';
import './api/stockEndpoints';
import './api/invoiceEndpoints';
import './api/notificationEndpoints';
import './api/integrationEndpoints';
import './api/homeEndpoints';
import './api/counterSessionEndpoints';
import './api/payrollEndpoints';
import './api/accountingEndpoints';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    permissions: permissionReducer,
    stock: stockReducer,
    invoice: invoiceReducer,
    notification: notificationReducer,
    userApp: userAppReducer,
    reviews: reviewReducer,
    banners: bannerReducer,
    bookingFlow: bookingFlowReducer,
    loyalty: loyaltyReducer,
    bookingBadge: bookingBadgeReducer,
    payouts: payoutReducer,

    [appApi.reducerPath]: appApi.reducer,  //  ← RTK Query cache lives here
  },
  //💥 Without it: RTK Query = dead  
  // 🧠 What appApi.middleware does
  // 👉 It handles:
   // API calls automatically
//caching, polling, refetching, invalidation
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(appApi.middleware),
});

setupListeners(store.dispatch);

export default store;
