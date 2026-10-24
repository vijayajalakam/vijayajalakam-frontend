import { appApi } from "./appApi";
import { asList, asData, passthrough } from "./rtkUtils";

/**
 * Stock Module RTK Query Endpoints
 * Handles Products, Purchase Orders, Purchase Entries, Purchase Returns,
 * Stock Transfers, Damage Entries, and Consumption Entries
 * 
 * Features:
 * - Automatic caching with tag invalidation
 * - Optimistic updates for better UX
 * - Normalized data structure
 * - Automatic refetching on mutations
 */

export const {
  // Products
  useGetProductsQuery,
  useLazyGetProductsQuery,
  useGetProductByIdQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useBulkDeleteProductsMutation,
  useToggleProductStatusMutation,
  useToggleProductSaleStatusMutation,
  useToggleProductFavouriteMutation,
  useGenerateProductImageMutation,
  useBulkGenerateProductImagesMutation,
  useUploadProductsMutation,
  
  // Purchase Orders
  useGetPurchaseOrdersQuery,
  useLazyGetPurchaseOrdersQuery,
  useGetPurchaseOrderByIdQuery,
  useCreatePurchaseOrderMutation,
  useUpdatePurchaseOrderMutation,
  useDeletePurchaseOrderMutation,
  useConvertPurchaseOrderMutation,
  
  // Purchase Entries (Invoices)
  useGetPurchaseEntriesQuery,
  useLazyGetPurchaseEntriesQuery,
  useGetPurchaseEntryByIdQuery,
  useCreatePurchaseEntryMutation,
  useUpdatePurchaseEntryMutation,
  useDeletePurchaseEntryMutation,
  useRecordPurchasePaymentMutation,
  
  // Purchase Returns
  useGetPurchaseReturnsQuery,
  useLazyGetPurchaseReturnsQuery,
  useGetPurchaseReturnByIdQuery,
  useCreatePurchaseReturnMutation,
  useUpdatePurchaseReturnMutation,
  useDeletePurchaseReturnMutation,
  
  // Stock Transfers
  useGetStockTransfersQuery,
  useLazyGetStockTransfersQuery,
  useGetStockTransferByIdQuery,
  useCreateStockTransferMutation,
  useUpdateStockTransferMutation,
  useDeleteStockTransferMutation,
  useApproveStockTransferMutation,
  
  // Damage Entries
  useGetDamageEntriesQuery,
  useLazyGetDamageEntriesQuery,
  useGetDamageEntryByIdQuery,
  useCreateDamageEntryMutation,
  useUpdateDamageEntryMutation,
  useDeleteDamageEntryMutation,
  
  // Consumption Entries
  useGetConsumptionEntriesQuery,
  useLazyGetConsumptionEntriesQuery,
  useGetConsumptionEntryByIdQuery,
  useCreateConsumptionEntryMutation,
  useUpdateConsumptionEntryMutation,
  useDeleteConsumptionEntryMutation,
  
  // Stock Reports & Analytics
  useGetStockSummaryQuery,
  useGetLowStockProductsQuery,
  useGetStockValueQuery,
} = appApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    // ==================== PRODUCTS ====================
    getProducts: builder.query({
      query: (params = {}) => ({
        url: "/products",
        params: {
          page: params.page || 1,
          limit: params.limit || 50,
          search: params.search,
          category: params.category,
          branch: params.branch,
          status: params.status,
          isSale: params.isSale,
        },
      }),
      transformResponse: (response) => {
        if (response?.success) {
          return {
            products: response.data || [],
            pagination: response.pagination || {},
            stats: response.stats || {},
          };
        }
        return { products: [], pagination: {}, stats: {} };
      },
      providesTags: (result) =>
        result?.products
          ? [
              ...result.products.map(({ _id }) => ({ type: "Product", id: _id })),
              { type: "Product", id: "LIST" },
            ]
          : [{ type: "Product", id: "LIST" }],
      keepUnusedDataFor: 300, // 5 minutes cache
    }),

    getProductById: builder.query({
      query: (id) => ({ url: `/products/${id}` }),
      transformResponse: asData,
      providesTags: (result, error, id) => [{ type: "Product", id }],
    }),

    createProduct: builder.mutation({
      query: (body) => ({
        url: "/products",
        method: "POST",
        data: body,
      }),
      transformResponse: passthrough,
      invalidatesTags: [
        { type: "Product", id: "LIST" },
        "InvoiceMetadata",
        "Dashboard",
      ],
    }),

    updateProduct: builder.mutation({
      query: ({ id, body }) => ({
        url: `/products/${id}`,
        method: "PUT",
        data: body,
      }),
      transformResponse: passthrough,
      invalidatesTags: (result, error, { id }) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
        "InvoiceMetadata",
      ],
    }),

    deleteProduct: builder.mutation({
      query: (id) => ({
        url: `/products/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Product", id: "LIST" }, "InvoiceMetadata"],
    }),

    bulkDeleteProducts: builder.mutation({
      query: (ids) => ({
        url: "/products/bulk-delete",
        method: "POST",
        data: { ids },
      }),
      invalidatesTags: [{ type: "Product", id: "LIST" }, "InvoiceMetadata"],
    }),

    toggleProductStatus: builder.mutation({
      query: ({ id, isActive }) => ({
        url: `/products/${id}/status`,
        method: "PATCH",
        data: { isActive },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
      ],
    }),

    toggleProductSaleStatus: builder.mutation({
      query: ({ id, isSale }) => ({
        url: `/products/${id}/sale-status`,
        method: "PATCH",
        data: { isSale },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
      ],
    }),

    toggleProductFavourite: builder.mutation({
      query: (id) => ({
        url: `/products/${id}/favourite`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Product", id },
        { type: "Product", id: "LIST" },
        "InvoiceMetadata",
      ],
    }),

    generateProductImage: builder.mutation({
      query: ({ id, prompt }) => ({
        url: `/products/${id}/generate-image`,
        method: "POST",
        data: { prompt },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Product", id }],
    }),

    bulkGenerateProductImages: builder.mutation({
      query: (items) => ({
        url: "/products/bulk-generate-images",
        method: "POST",
        data: { items },
      }),
      invalidatesTags: [{ type: "Product", id: "LIST" }],
    }),

    uploadProducts: builder.mutation({
      query: (formData) => ({
        url: "/products/upload",
        method: "POST",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      }),
      invalidatesTags: [{ type: "Product", id: "LIST" }, "InvoiceMetadata"],
    }),

    // ==================== PURCHASE ORDERS ====================
    getPurchaseOrders: builder.query({
      query: (params = {}) => ({
        url: "/purchase-orders",
        params: {
          page: params.page || 1,
          limit: params.limit || 50,
          search: params.search,
          supplier: params.supplier,
          status: params.status,
          branch: params.branch,
          startDate: params.startDate,
          endDate: params.endDate,
        },
      }),
      transformResponse: (response) => {
        if (response?.success) {
          return {
            orders: response.data || [],
            pagination: response.pagination || {},
            stats: response.stats || {},
          };
        }
        return { orders: [], pagination: {}, stats: {} };
      },
      providesTags: (result) =>
        result?.orders
          ? [
              ...result.orders.map(({ _id }) => ({ type: "Purchase", id: _id })),
              { type: "Purchase", id: "ORDER_LIST" },
            ]
          : [{ type: "Purchase", id: "ORDER_LIST" }],
      keepUnusedDataFor: 180,
    }),

    getPurchaseOrderById: builder.query({
      query: (id) => ({ url: `/purchase-orders/${id}` }),
      transformResponse: asData,
      providesTags: (result, error, id) => [{ type: "Purchase", id }],
    }),

    createPurchaseOrder: builder.mutation({
      query: (body) => ({
        url: "/purchase-orders",
        method: "POST",
        data: body,
      }),
      invalidatesTags: [{ type: "Purchase", id: "ORDER_LIST" }],
    }),

    updatePurchaseOrder: builder.mutation({
      query: ({ id, body }) => ({
        url: `/purchase-orders/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Purchase", id },
        { type: "Purchase", id: "ORDER_LIST" },
      ],
    }),

    deletePurchaseOrder: builder.mutation({
      query: (id) => ({
        url: `/purchase-orders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "Purchase", id: "ORDER_LIST" }],
    }),

    convertPurchaseOrder: builder.mutation({
      query: (id) => ({
        url: `/purchase-orders/${id}/convert`,
        method: "POST",
      }),
      invalidatesTags: [
        { type: "Purchase", id: "ORDER_LIST" },
        { type: "Purchase", id: "ENTRY_LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),

    // ==================== PURCHASE ENTRIES ====================
    getPurchaseEntries: builder.query({
      query: (params = {}) => ({
        url: "/purchase-invoices",
        params: {
          page: params.page || 1,
          limit: params.limit || 50,
          search: params.search,
          supplier: params.supplier,
          branch: params.branch,
          startDate: params.startDate,
          endDate: params.endDate,
          paymentStatus: params.paymentStatus,
        },
      }),
      transformResponse: (response) => {
        if (response?.success) {
          return {
            entries: response.data || [],
            pagination: response.pagination || {},
            stats: response.stats || {},
          };
        }
        return { entries: [], pagination: {}, stats: {} };
      },
      providesTags: (result) =>
        result?.entries
          ? [
              ...result.entries.map(({ _id }) => ({ type: "Purchase", id: _id })),
              { type: "Purchase", id: "ENTRY_LIST" },
            ]
          : [{ type: "Purchase", id: "ENTRY_LIST" }],
      keepUnusedDataFor: 180,
    }),

    getPurchaseEntryById: builder.query({
      query: (id) => ({ url: `/purchase-invoices/${id}` }),
      transformResponse: asData,
      providesTags: (result, error, id) => [{ type: "Purchase", id }],
    }),

    createPurchaseEntry: builder.mutation({
      query: (body) => ({
        url: "/purchase-invoices",
        method: "POST",
        data: body,
      }),
      invalidatesTags: [
        { type: "Purchase", id: "ENTRY_LIST" },
        { type: "Product", id: "LIST" },
        "Dashboard",
      ],
    }),

    updatePurchaseEntry: builder.mutation({
      query: ({ id, body }) => ({
        url: `/purchase-invoices/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Purchase", id },
        { type: "Purchase", id: "ENTRY_LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),

    deletePurchaseEntry: builder.mutation({
      query: (id) => ({
        url: `/purchase-invoices/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Purchase", id: "ENTRY_LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),

    recordPurchasePayment: builder.mutation({
      query: ({ id, body }) => ({
        url: `/purchase-invoices/${id}/payment`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Purchase", id },
        { type: "Purchase", id: "ENTRY_LIST" },
        "AccountTransaction",
      ],
    }),

    // ==================== PURCHASE RETURNS ====================
    getPurchaseReturns: builder.query({
      query: (params = {}) => ({
        url: "/purchase-returns",
        params: {
          page: params.page || 1,
          limit: params.limit || 50,
          search: params.search,
          supplier: params.supplier,
          branch: params.branch,
          startDate: params.startDate,
          endDate: params.endDate,
        },
      }),
      transformResponse: (response) => {
        if (response?.success) {
          return {
            returns: response.data || [],
            pagination: response.pagination || {},
            stats: response.stats || {},
          };
        }
        return { returns: [], pagination: {}, stats: {} };
      },
      providesTags: (result) =>
        result?.returns
          ? [
              ...result.returns.map(({ _id }) => ({ type: "Purchase", id: _id })),
              { type: "Purchase", id: "RETURN_LIST" },
            ]
          : [{ type: "Purchase", id: "RETURN_LIST" }],
      keepUnusedDataFor: 180,
    }),

    getPurchaseReturnById: builder.query({
      query: (id) => ({ url: `/purchase-returns/${id}` }),
      transformResponse: asData,
      providesTags: (result, error, id) => [{ type: "Purchase", id }],
    }),

    createPurchaseReturn: builder.mutation({
      query: (body) => ({
        url: "/purchase-returns",
        method: "POST",
        data: body,
      }),
      invalidatesTags: [
        { type: "Purchase", id: "RETURN_LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),

    updatePurchaseReturn: builder.mutation({
      query: ({ id, body }) => ({
        url: `/purchase-returns/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Purchase", id },
        { type: "Purchase", id: "RETURN_LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),

    deletePurchaseReturn: builder.mutation({
      query: (id) => ({
        url: `/purchase-returns/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Purchase", id: "RETURN_LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),

    // ==================== STOCK TRANSFERS ====================
    getStockTransfers: builder.query({
      query: (params = {}) => ({
        url: "/stock-transfers",
        params: {
          page: params.page || 1,
          limit: params.limit || 50,
          search: params.search,
          fromBranch: params.fromBranch,
          toBranch: params.toBranch,
          status: params.status,
          startDate: params.startDate,
          endDate: params.endDate,
        },
      }),
      transformResponse: (response) => {
        if (response?.success) {
          return {
            transfers: response.data || [],
            pagination: response.pagination || {},
            stats: response.stats || {},
          };
        }
        return { transfers: [], pagination: {}, stats: {} };
      },
      providesTags: (result) =>
        result?.transfers
          ? [
              ...result.transfers.map(({ _id }) => ({ type: "Product", id: _id })),
              { type: "Product", id: "TRANSFER_LIST" },
            ]
          : [{ type: "Product", id: "TRANSFER_LIST" }],
      keepUnusedDataFor: 180,
    }),

    getStockTransferById: builder.query({
      query: (id) => ({ url: `/stock-transfers/${id}` }),
      transformResponse: asData,
      providesTags: (result, error, id) => [{ type: "Product", id }],
    }),

    createStockTransfer: builder.mutation({
      query: (body) => ({
        url: "/stock-transfers",
        method: "POST",
        data: body,
      }),
      invalidatesTags: [
        { type: "Product", id: "TRANSFER_LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),

    updateStockTransfer: builder.mutation({
      query: ({ id, body }) => ({
        url: `/stock-transfers/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Product", id },
        { type: "Product", id: "TRANSFER_LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),

    deleteStockTransfer: builder.mutation({
      query: (id) => ({
        url: `/stock-transfers/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Product", id: "TRANSFER_LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),

    approveStockTransfer: builder.mutation({
      query: (id) => ({
        url: `/stock-transfers/${id}/approve`,
        method: "POST",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Product", id },
        { type: "Product", id: "TRANSFER_LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),

    // ==================== DAMAGE ENTRIES ====================
    getDamageEntries: builder.query({
      query: (params = {}) => ({
        url: "/damage-entries",
        params: {
          page: params.page || 1,
          limit: params.limit || 50,
          search: params.search,
          branch: params.branch,
          startDate: params.startDate,
          endDate: params.endDate,
        },
      }),
      transformResponse: (response) => {
        if (response?.success) {
          return {
            damages: response.data || [],
            pagination: response.pagination || {},
            stats: response.stats || {},
          };
        }
        return { damages: [], pagination: {}, stats: {} };
      },
      providesTags: (result) =>
        result?.damages
          ? [
              ...result.damages.map(({ _id }) => ({ type: "Product", id: _id })),
              { type: "Product", id: "DAMAGE_LIST" },
            ]
          : [{ type: "Product", id: "DAMAGE_LIST" }],
      keepUnusedDataFor: 180,
    }),

    getDamageEntryById: builder.query({
      query: (id) => ({ url: `/damage-entries/${id}` }),
      transformResponse: asData,
      providesTags: (result, error, id) => [{ type: "Product", id }],
    }),

    createDamageEntry: builder.mutation({
      query: (body) => ({
        url: "/damage-entries",
        method: "POST",
        data: body,
      }),
      invalidatesTags: [
        { type: "Product", id: "DAMAGE_LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),

    updateDamageEntry: builder.mutation({
      query: ({ id, body }) => ({
        url: `/damage-entries/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Product", id },
        { type: "Product", id: "DAMAGE_LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),

    deleteDamageEntry: builder.mutation({
      query: (id) => ({
        url: `/damage-entries/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Product", id: "DAMAGE_LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),

    // ==================== CONSUMPTION ENTRIES ====================
    getConsumptionEntries: builder.query({
      query: (params = {}) => ({
        url: "/consumption-entries",
        params: {
          page: params.page || 1,
          limit: params.limit || 50,
          search: params.search,
          branch: params.branch,
          startDate: params.startDate,
          endDate: params.endDate,
        },
      }),
      transformResponse: (response) => {
        if (response?.success) {
          return {
            consumptions: response.data || [],
            pagination: response.pagination || {},
            stats: response.stats || {},
          };
        }
        return { consumptions: [], pagination: {}, stats: {} };
      },
      providesTags: (result) =>
        result?.consumptions
          ? [
              ...result.consumptions.map(({ _id }) => ({ type: "Product", id: _id })),
              { type: "Product", id: "CONSUMPTION_LIST" },
            ]
          : [{ type: "Product", id: "CONSUMPTION_LIST" }],
      keepUnusedDataFor: 180,
    }),

    getConsumptionEntryById: builder.query({
      query: (id) => ({ url: `/consumption-entries/${id}` }),
      transformResponse: asData,
      providesTags: (result, error, id) => [{ type: "Product", id }],
    }),

    createConsumptionEntry: builder.mutation({
      query: (body) => ({
        url: "/consumption-entries",
        method: "POST",
        data: body,
      }),
      invalidatesTags: [
        { type: "Product", id: "CONSUMPTION_LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),

    updateConsumptionEntry: builder.mutation({
      query: ({ id, body }) => ({
        url: `/consumption-entries/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Product", id },
        { type: "Product", id: "CONSUMPTION_LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),

    deleteConsumptionEntry: builder.mutation({
      query: (id) => ({
        url: `/consumption-entries/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "Product", id: "CONSUMPTION_LIST" },
        { type: "Product", id: "LIST" },
      ],
    }),

    // ==================== ANALYTICS & REPORTS ====================
    getStockSummary: builder.query({
      query: (params = {}) => ({
        url: "/stock/summary",
        params: {
          branch: params.branch,
          startDate: params.startDate,
          endDate: params.endDate,
        },
      }),
      transformResponse: asData,
      providesTags: ["Product"],
      keepUnusedDataFor: 60, // 1 minute cache for analytics
    }),

    getLowStockProducts: builder.query({
      query: (params = {}) => ({
        url: "/stock/low-stock",
        params: {
          branch: params.branch,
          threshold: params.threshold || 10,
        },
      }),
      transformResponse: asList,
      providesTags: ["Product"],
      keepUnusedDataFor: 60,
    }),

    getStockValue: builder.query({
      query: (params = {}) => ({
        url: "/stock/value",
        params: {
          branch: params.branch,
        },
      }),
      transformResponse: asData,
      providesTags: ["Product"],
      keepUnusedDataFor: 60,
    }),
  }),
});
