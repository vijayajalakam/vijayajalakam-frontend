import { createSlice } from "@reduxjs/toolkit";

/**
 * Stock UI State Slice
 * Manages UI state for stock-related screens
 * - Filters, search, pagination
 * - Selected items for bulk operations
 * - Modal states
 * - Form states
 */

const initialState = {
  // Products
  products: {
    filters: {
      search: "",
      category: "",
      branch: "",
      status: "all",
      isSale: "all",
    },
    pagination: {
      page: 1,
      limit: 50,
    },
    selectedIds: [],
    sortBy: "name",
    sortOrder: "asc",
  },

  // Purchase Orders
  purchaseOrders: {
    filters: {
      search: "",
      supplier: "",
      status: "all",
      branch: "",
      dateRange: { start: null, end: null },
    },
    pagination: {
      page: 1,
      limit: 50,
    },
    selectedIds: [],
  },

  // Purchase Entries
  purchaseEntries: {
    filters: {
      search: "",
      supplier: "",
      branch: "",
      paymentStatus: "all",
      dateRange: { start: null, end: null },
    },
    pagination: {
      page: 1,
      limit: 50,
    },
    selectedIds: [],
  },

  // Purchase Returns
  purchaseReturns: {
    filters: {
      search: "",
      supplier: "",
      branch: "",
      dateRange: { start: null, end: null },
    },
    pagination: {
      page: 1,
      limit: 50,
    },
    selectedIds: [],
  },

  // Stock Transfers
  stockTransfers: {
    filters: {
      search: "",
      fromBranch: "",
      toBranch: "",
      status: "all",
      dateRange: { start: null, end: null },
    },
    pagination: {
      page: 1,
      limit: 50,
    },
    selectedIds: [],
  },

  // Damage Entries
  damageEntries: {
    filters: {
      search: "",
      branch: "",
      dateRange: { start: null, end: null },
    },
    pagination: {
      page: 1,
      limit: 50,
    },
    selectedIds: [],
  },

  // Consumption Entries
  consumptionEntries: {
    filters: {
      search: "",
      branch: "",
      dateRange: { start: null, end: null },
    },
    pagination: {
      page: 1,
      limit: 50,
    },
    selectedIds: [],
  },

  // UI State
  ui: {
    activeModal: null, // 'add', 'edit', 'delete', 'bulkDelete', etc.
    isLoading: false,
    error: null,
  },
};

const stockSlice = createSlice({
  name: "stock",
  initialState,
  reducers: {
    // ==================== PRODUCTS ====================
    setProductFilters: (state, action) => {
      state.products.filters = { ...state.products.filters, ...action.payload };
      state.products.pagination.page = 1; // Reset to first page on filter change
    },

    setProductSearch: (state, action) => {
      state.products.filters.search = action.payload;
      state.products.pagination.page = 1;
    },

    setProductPagination: (state, action) => {
      state.products.pagination = {
        ...state.products.pagination,
        ...action.payload,
      };
    },

    setProductSelectedIds: (state, action) => {
      state.products.selectedIds = action.payload;
    },

    toggleProductSelection: (state, action) => {
      const id = action.payload;
      const index = state.products.selectedIds.indexOf(id);
      if (index > -1) {
        state.products.selectedIds.splice(index, 1);
      } else {
        state.products.selectedIds.push(id);
      }
    },

    clearProductSelection: (state) => {
      state.products.selectedIds = [];
    },

    setProductSort: (state, action) => {
      state.products.sortBy = action.payload.sortBy;
      state.products.sortOrder = action.payload.sortOrder;
    },

    resetProductFilters: (state) => {
      state.products.filters = initialState.products.filters;
      state.products.pagination.page = 1;
    },

    // ==================== PURCHASE ORDERS ====================
    setPurchaseOrderFilters: (state, action) => {
      state.purchaseOrders.filters = {
        ...state.purchaseOrders.filters,
        ...action.payload,
      };
      state.purchaseOrders.pagination.page = 1;
    },

    setPurchaseOrderSearch: (state, action) => {
      state.purchaseOrders.filters.search = action.payload;
      state.purchaseOrders.pagination.page = 1;
    },

    setPurchaseOrderPagination: (state, action) => {
      state.purchaseOrders.pagination = {
        ...state.purchaseOrders.pagination,
        ...action.payload,
      };
    },

    setPurchaseOrderSelectedIds: (state, action) => {
      state.purchaseOrders.selectedIds = action.payload;
    },

    clearPurchaseOrderSelection: (state) => {
      state.purchaseOrders.selectedIds = [];
    },

    resetPurchaseOrderFilters: (state) => {
      state.purchaseOrders.filters = initialState.purchaseOrders.filters;
      state.purchaseOrders.pagination.page = 1;
    },

    // ==================== PURCHASE ENTRIES ====================
    setPurchaseEntryFilters: (state, action) => {
      state.purchaseEntries.filters = {
        ...state.purchaseEntries.filters,
        ...action.payload,
      };
      state.purchaseEntries.pagination.page = 1;
    },

    setPurchaseEntrySearch: (state, action) => {
      state.purchaseEntries.filters.search = action.payload;
      state.purchaseEntries.pagination.page = 1;
    },

    setPurchaseEntryPagination: (state, action) => {
      state.purchaseEntries.pagination = {
        ...state.purchaseEntries.pagination,
        ...action.payload,
      };
    },

    resetPurchaseEntryFilters: (state) => {
      state.purchaseEntries.filters = initialState.purchaseEntries.filters;
      state.purchaseEntries.pagination.page = 1;
    },

    // ==================== PURCHASE RETURNS ====================
    setPurchaseReturnFilters: (state, action) => {
      state.purchaseReturns.filters = {
        ...state.purchaseReturns.filters,
        ...action.payload,
      };
      state.purchaseReturns.pagination.page = 1;
    },

    setPurchaseReturnSearch: (state, action) => {
      state.purchaseReturns.filters.search = action.payload;
      state.purchaseReturns.pagination.page = 1;
    },

    setPurchaseReturnPagination: (state, action) => {
      state.purchaseReturns.pagination = {
        ...state.purchaseReturns.pagination,
        ...action.payload,
      };
    },

    resetPurchaseReturnFilters: (state) => {
      state.purchaseReturns.filters = initialState.purchaseReturns.filters;
      state.purchaseReturns.pagination.page = 1;
    },

    // ==================== STOCK TRANSFERS ====================
    setStockTransferFilters: (state, action) => {
      state.stockTransfers.filters = {
        ...state.stockTransfers.filters,
        ...action.payload,
      };
      state.stockTransfers.pagination.page = 1;
    },

    setStockTransferSearch: (state, action) => {
      state.stockTransfers.filters.search = action.payload;
      state.stockTransfers.pagination.page = 1;
    },

    setStockTransferPagination: (state, action) => {
      state.stockTransfers.pagination = {
        ...state.stockTransfers.pagination,
        ...action.payload,
      };
    },

    setStockTransferSelectedIds: (state, action) => {
      state.stockTransfers.selectedIds = action.payload;
    },

    clearStockTransferSelection: (state) => {
      state.stockTransfers.selectedIds = [];
    },

    resetStockTransferFilters: (state) => {
      state.stockTransfers.filters = initialState.stockTransfers.filters;
      state.stockTransfers.pagination.page = 1;
    },

    // ==================== DAMAGE ENTRIES ====================
    setDamageEntryFilters: (state, action) => {
      state.damageEntries.filters = {
        ...state.damageEntries.filters,
        ...action.payload,
      };
      state.damageEntries.pagination.page = 1;
    },

    setDamageEntrySearch: (state, action) => {
      state.damageEntries.filters.search = action.payload;
      state.damageEntries.pagination.page = 1;
    },

    setDamageEntryPagination: (state, action) => {
      state.damageEntries.pagination = {
        ...state.damageEntries.pagination,
        ...action.payload,
      };
    },

    resetDamageEntryFilters: (state) => {
      state.damageEntries.filters = initialState.damageEntries.filters;
      state.damageEntries.pagination.page = 1;
    },

    // ==================== CONSUMPTION ENTRIES ====================
    setConsumptionEntryFilters: (state, action) => {
      state.consumptionEntries.filters = {
        ...state.consumptionEntries.filters,
        ...action.payload,
      };
      state.consumptionEntries.pagination.page = 1;
    },

    setConsumptionEntrySearch: (state, action) => {
      state.consumptionEntries.filters.search = action.payload;
      state.consumptionEntries.pagination.page = 1;
    },

    setConsumptionEntryPagination: (state, action) => {
      state.consumptionEntries.pagination = {
        ...state.consumptionEntries.pagination,
        ...action.payload,
      };
    },

    resetConsumptionEntryFilters: (state) => {
      state.consumptionEntries.filters = initialState.consumptionEntries.filters;
      state.consumptionEntries.pagination.page = 1;
    },

    // ==================== UI STATE ====================
    setActiveModal: (state, action) => {
      state.ui.activeModal = action.payload;
    },

    closeModal: (state) => {
      state.ui.activeModal = null;
    },

    setLoading: (state, action) => {
      state.ui.isLoading = action.payload;
    },

    setError: (state, action) => {
      state.ui.error = action.payload;
    },

    clearError: (state) => {
      state.ui.error = null;
    },

    // ==================== RESET ALL ====================
    resetStockState: () => initialState,
  },
});

export const {
  // Products
  setProductFilters,
  setProductSearch,
  setProductPagination,
  setProductSelectedIds,
  toggleProductSelection,
  clearProductSelection,
  setProductSort,
  resetProductFilters,

  // Purchase Orders
  setPurchaseOrderFilters,
  setPurchaseOrderSearch,
  setPurchaseOrderPagination,
  setPurchaseOrderSelectedIds,
  clearPurchaseOrderSelection,
  resetPurchaseOrderFilters,

  // Purchase Entries
  setPurchaseEntryFilters,
  setPurchaseEntrySearch,
  setPurchaseEntryPagination,
  resetPurchaseEntryFilters,

  // Purchase Returns
  setPurchaseReturnFilters,
  setPurchaseReturnSearch,
  setPurchaseReturnPagination,
  resetPurchaseReturnFilters,

  // Stock Transfers
  setStockTransferFilters,
  setStockTransferSearch,
  setStockTransferPagination,
  setStockTransferSelectedIds,
  clearStockTransferSelection,
  resetStockTransferFilters,

  // Damage Entries
  setDamageEntryFilters,
  setDamageEntrySearch,
  setDamageEntryPagination,
  resetDamageEntryFilters,

  // Consumption Entries
  setConsumptionEntryFilters,
  setConsumptionEntrySearch,
  setConsumptionEntryPagination,
  resetConsumptionEntryFilters,

  // UI
  setActiveModal,
  closeModal,
  setLoading,
  setError,
  clearError,
  resetStockState,
} = stockSlice.actions;

// Selectors
export const selectProductFilters = (state) => state.stock.products.filters;
export const selectProductPagination = (state) => state.stock.products.pagination;
export const selectProductSelectedIds = (state) => state.stock.products.selectedIds;
export const selectProductSort = (state) => ({
  sortBy: state.stock.products.sortBy,
  sortOrder: state.stock.products.sortOrder,
});

export const selectPurchaseOrderFilters = (state) => state.stock.purchaseOrders.filters;
export const selectPurchaseOrderPagination = (state) => state.stock.purchaseOrders.pagination;

export const selectPurchaseEntryFilters = (state) => state.stock.purchaseEntries.filters;
export const selectPurchaseEntryPagination = (state) => state.stock.purchaseEntries.pagination;

export const selectPurchaseReturnFilters = (state) => state.stock.purchaseReturns.filters;
export const selectPurchaseReturnPagination = (state) => state.stock.purchaseReturns.pagination;

export const selectStockTransferFilters = (state) => state.stock.stockTransfers.filters;
export const selectStockTransferPagination = (state) => state.stock.stockTransfers.pagination;
export const selectStockTransferSelectedIds = (state) => state.stock.stockTransfers.selectedIds;

export const selectDamageEntryFilters = (state) => state.stock.damageEntries.filters;
export const selectDamageEntryPagination = (state) => state.stock.damageEntries.pagination;

export const selectConsumptionEntryFilters = (state) => state.stock.consumptionEntries.filters;
export const selectConsumptionEntryPagination = (state) => state.stock.consumptionEntries.pagination;

export const selectActiveModal = (state) => state.stock.ui.activeModal;
export const selectIsLoading = (state) => state.stock.ui.isLoading;
export const selectError = (state) => state.stock.ui.error;

export default stockSlice.reducer;
