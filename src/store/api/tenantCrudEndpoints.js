import { appApi } from "./appApi";
import { asList, asData, passthrough } from "./rtkUtils";

/**
 * Tenant CRUD + reference lists. Import once from `store.js`.
 * Mutations invalidate tags so list queries refetch once and stay cached (keepUnusedDataFor on appApi).
 */
export const {
  useGetDepartmentsAllQuery,
  useGetServiceCategoriesQuery,
  useGetProductCategoriesListQuery,
  useGetUnitsListQuery,
  useGetVariantsListQuery,
  useGetChartOfAccountsQuery,
  useGetAdminProfileQuery,
  useLazyGetAdminProfileQuery,
  useCreateTaxMutation,
  useUpdateTaxMutation,
  useDeleteTaxMutation,
  useCreateUnitMutation,
  useUpdateUnitMutation,
  useDeleteUnitMutation,
  useCreateVariantMutation,
  useUpdateVariantMutation,
  useDeleteVariantMutation,
  useCreateDepartmentMutation,
  useUpdateDepartmentMutation,
  useDeleteDepartmentMutation,
  useCreateServiceCategoryMutation,
  useUpdateServiceCategoryMutation,
  useDeleteServiceCategoryMutation,
  useCreateProductCategoryMutation,
  useUpdateProductCategoryMutation,
  useDeleteProductCategoryMutation,
  useCreatePaymentMethodMutation,
  useUpdatePaymentMethodMutation,
  useDeletePaymentMethodMutation,
  useUpdateSalonProfileMutation,
  useUpdateUserThemeMutation,
  useUpdateUserPrimaryColorMutation,
  useGetAdminCustomersQuery,
  useUpdateAdminCustomerMutation,
  useDeleteAdminCustomerMutation,
  useBulkDeleteAdminCustomersMutation,
  useGetCustomerStylesQuery,
  useLazyGetCustomerStylesQuery,
  useUploadCustomerStyleMutation,
  useUpdateCustomerStyleMutation,
  useDeleteCustomerStyleMutation,
  useGetSuppliersQuery,
  useLazyGetSuppliersQuery,
  useCreateSupplierMutation,
  useUpdateSupplierMutation,
  useDeleteSupplierMutation,
  useBulkDeleteSuppliersMutation,
  useGetAttendanceQuery,
  useGetStaffAttendanceQuery,
  useGetAttendanceReportQuery,
  useGetLeaveStatementReportQuery,
  useSaveAttendanceMutation,
  useUpdateStaffLeaveQuotaMutation,
  useGetAdminStaffQuery,
  useGetNextEmployeeIdQuery,
  useGetAdminServicesQuery,
  useGetPrivilegesListQuery,
  useCreateAdminStaffMutation,
  useUpdateAdminStaffMutation,
  useDeleteAdminStaffMutation,
  useBulkDeleteAdminStaffMutation,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
  useBulkDeleteServicesMutation,
  useUpdateSlotSettingsMutation,
  useUpdateBlockSlotsMutation,
  useGetDesignationsQuery,
  useCreateDesignationMutation,
  useDeleteDesignationMutation,
  useUploadGalleryImagesMutation,
  useAddUnsplashImageMutation,
  useDeleteGalleryImageMutation,
  useSetPrimaryGalleryImageMutation,
  useLazySearchUnsplashQuery,
  useUploadPortfolioImageMutation,
  useDeletePortfolioImageMutation,
  useGetLoyaltySettingsQuery,
  useUpdateLoyaltySettingsMutation,
  useRedeemLoyaltyPointsMutation,
  useGetShopsListQuery,
  useCreateShopMutation,
  useUpdateShopMutation,
  useDeleteShopMutation,
  useUpdateReceiptSettingsMutation,
  useUpdateSalonProfileWithImageMutation,
} = appApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getDepartmentsAll: builder.query({
      query: () => ({ url: "/departments", params: { all: "true" } }),
      transformResponse: asList,
      providesTags: ["Department"],
    }),

    getServiceCategories: builder.query({
      query: (slug) => ({ url: "/categories", params: { slug } }), // slug as cache key
      transformResponse: asList,
      providesTags: ["Category"],
    }),

    getProductCategoriesList: builder.query({
      query: (slug) => ({ url: "/product-categories", params: { slug } }), // slug as cache key
      transformResponse: asList,
      providesTags: ["ProductCategory"],
    }),

    getUnitsList: builder.query({
      query: () => ({ url: "/units" }),
      transformResponse: asList,
      providesTags: ["Unit"],
    }),

    getVariantsList: builder.query({
      query: () => ({ url: "/variants" }),
      transformResponse: asList,
      providesTags: ["Variant"],
    }),

    getChartOfAccounts: builder.query({
      query: () => ({ url: "/chart-of-accounts" }),
      transformResponse: asList,
      providesTags: ["ChartAccount"],
    }),

    getAdminProfile: builder.query({
      query: () => ({ url: "/admin/profile" }),
      transformResponse: asData,
      providesTags: ["Profile", "SalonProfile"],
    }),

    createTax: builder.mutation({
      query: (body) => ({ url: "/taxes", method: "POST", data: body }),
      invalidatesTags: ["Tax"],
    }),

    updateTax: builder.mutation({
      query: ({ id, body }) => ({
        url: `/taxes/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Tax"],
    }),

    deleteTax: builder.mutation({
      query: (id) => ({ url: `/taxes/${id}`, method: "DELETE" }),
      invalidatesTags: ["Tax"],
    }),

    createUnit: builder.mutation({
      query: (body) => ({ url: "/units", method: "POST", data: body }),
      invalidatesTags: ["Unit"],
    }),

    updateUnit: builder.mutation({
      query: ({ id, body }) => ({
        url: `/units/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Unit"],
    }),

    deleteUnit: builder.mutation({
      query: (id) => ({ url: `/units/${id}`, method: "DELETE" }),
      invalidatesTags: ["Unit"],
    }),

    createVariant: builder.mutation({
      query: (body) => ({ url: "/variants", method: "POST", data: body }),
      invalidatesTags: ["Variant"],
    }),

    updateVariant: builder.mutation({
      query: ({ id, body }) => ({
        url: `/variants/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Variant"],
    }),

    deleteVariant: builder.mutation({
      query: (id) => ({ url: `/variants/${id}`, method: "DELETE" }),
      invalidatesTags: ["Variant"],
    }),

    createDepartment: builder.mutation({
      query: (body) => ({ url: "/departments", method: "POST", data: body }),
      invalidatesTags: ["Department", "Service", "InvoiceMetadata"],
    }),

    updateDepartment: builder.mutation({
      query: ({ id, body }) => ({
        url: `/departments/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Department", "Service", "InvoiceMetadata"],
    }),

    deleteDepartment: builder.mutation({
      query: (id) => ({ url: `/departments/${id}`, method: "DELETE" }),
      invalidatesTags: ["Department", "Service", "InvoiceMetadata"],
    }),

    createServiceCategory: builder.mutation({
      query: (body) => ({ url: "/categories", method: "POST", data: body }),
      invalidatesTags: ["Category", "Service", "InvoiceMetadata"],
    }),

    updateServiceCategory: builder.mutation({
      query: ({ id, body }) => ({
        url: `/categories/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Category", "Service", "InvoiceMetadata"],
    }),

    deleteServiceCategory: builder.mutation({
      query: (id) => ({ url: `/categories/${id}`, method: "DELETE" }),
      invalidatesTags: ["Category", "Service", "InvoiceMetadata"],
    }),

    createProductCategory: builder.mutation({
      query: (body) => ({
        url: "/product-categories",
        method: "POST",
        data: body,
      }),
      invalidatesTags: ["ProductCategory", "Product", "InvoiceMetadata"],
    }),

    updateProductCategory: builder.mutation({
      query: ({ id, body }) => ({
        url: `/product-categories/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["ProductCategory", "Product", "InvoiceMetadata"],
    }),

    deleteProductCategory: builder.mutation({
      query: (id) => ({ url: `/product-categories/${id}`, method: "DELETE" }),
      invalidatesTags: ["ProductCategory", "Product", "InvoiceMetadata"],
    }),

    createPaymentMethod: builder.mutation({
      query: (body) => ({
        url: "/payment-methods",
        method: "POST",
        data: body,
      }),
      invalidatesTags: ["PaymentMethod"],
    }),

    updatePaymentMethod: builder.mutation({
      query: ({ id, body }) => ({
        url: `/payment-methods/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["PaymentMethod"],
    }),

    deletePaymentMethod: builder.mutation({
      query: (id) => ({ url: `/payment-methods/${id}`, method: "DELETE" }),
      invalidatesTags: ["PaymentMethod"],
    }),

    updateSalonProfile: builder.mutation({
      query: (data) => ({
        url: "/admin/profile",
        method: "PUT",
        data,
      }),
      transformResponse: passthrough,
      invalidatesTags: [
        "Profile",
        "SalonProfile",
        "PublicConfig",
        "InvoiceMetadata",
      ],
    }),

    updateUserTheme: builder.mutation({
      query: (body) => ({ url: "/user/profile", method: "PUT", data: body }),
      invalidatesTags: ["Profile"],
    }),

    updateUserPrimaryColor: builder.mutation({
      query: (body) => ({ url: "/user/profile", method: "PUT", data: body }),
      invalidatesTags: ["Profile"],
    }),

    /** CRM — /admin/customers */
    getAdminCustomers: builder.query({
      query: (queryString = "") => ({ url: queryString ? `/admin/customers?${queryString}` : "/admin/customers" }),
      transformResponse: asList,
      providesTags: ["Customer"],
    }),

    updateAdminCustomer: builder.mutation({
      query: ({ id, body }) => ({
        url: `/admin/customers/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Customer", "InvoiceMetadata"],
    }),

    deleteAdminCustomer: builder.mutation({
      query: (id) => ({ url: `/admin/customers/${id}`, method: "DELETE" }),
      invalidatesTags: ["Customer", "InvoiceMetadata"],
    }),

    bulkDeleteAdminCustomers: builder.mutation({
      query: (ids) => ({
        url: `/admin/customers/bulk`,
        method: "DELETE",
        data: { ids },
      }),
      invalidatesTags: ["Customer", "InvoiceMetadata"],
    }),

    /** Customer Cut Styles */
    getCustomerStyles: builder.query({
      query: (id) => ({ url: `/admin/customers/${id}/styles` }),
      transformResponse: asData,
      providesTags: (result, error, id) => [{ type: "Customer", id }],
    }),

    uploadCustomerStyle: builder.mutation({
      query: ({ customerId, body }) => ({
        url: `/admin/customers/${customerId}/styles`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: ["Customer"],
    }),

    updateCustomerStyle: builder.mutation({
      query: ({ customerId, styleId, body }) => ({
        url: `/admin/customers/${customerId}/styles/${styleId}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Customer"],
    }),

    deleteCustomerStyle: builder.mutation({
      query: ({ customerId, styleId }) => ({
        url: `/admin/customers/${customerId}/styles/${styleId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Customer"],
    }),

    /** SRM — suppliers */
    getSuppliers: builder.query({
      query: (queryString) => ({
        url: queryString ? `/suppliers?${queryString}` : "/suppliers",
      }),
      transformResponse: asList,
      providesTags: ["Supplier"],
    }),

    createSupplier: builder.mutation({
      query: (body) => ({ url: "/suppliers", method: "POST", data: body }),
      invalidatesTags: ["Supplier"],
    }),

    updateSupplier: builder.mutation({
      query: ({ id, body }) => ({
        url: `/suppliers/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Supplier"],
    }),

    deleteSupplier: builder.mutation({
      query: (id) => ({ url: `/suppliers/${id}`, method: "DELETE" }),
      invalidatesTags: ["Supplier"],
    }),

    bulkDeleteSuppliers: builder.mutation({
      query: (ids) => ({
        url: `/suppliers/bulk`,
        method: "DELETE",
        data: { ids },
      }),
      invalidatesTags: ["Supplier"],
    }),

    /** HRM — staff + shared lookups */
    getAttendance: builder.query({
      query: ({ date }) => ({ url: `/attendance`, params: { date } }),
      transformResponse: asData,
      providesTags: ["Attendance"],
    }),

    getStaffAttendance: builder.query({
      query: ({ date }) => ({ url: `/attendance/me`, params: { date } }),
      transformResponse: asData,
      providesTags: ["Attendance"],
    }),

    getAttendanceReport: builder.query({
      query: ({ startDate, endDate }) => ({ 
        url: `/attendance/report`, 
        params: { startDate, endDate } 
      }),
      transformResponse: asData,
      providesTags: ["Attendance"],
    }),

    saveAttendance: builder.mutation({
      query: (body) => ({ 
        url: "/attendance", 
        method: "POST", 
        data: body 
      }),
      invalidatesTags: ["Attendance"],
    }),

    getLeaveStatementReport: builder.query({
      query: (params = {}) => ({
        url: "/attendance/leave-statement",
        params,
      }),
      transformResponse: asData,
      providesTags: ["Attendance", "Staff"],
    }),

    updateStaffLeaveQuota: builder.mutation({
      query: (body) => ({
        url: "/attendance/leave-statement/quota",
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Staff", "Attendance"],
    }),

    getAdminStaff: builder.query({
      query: (queryString = "") => ({ url: queryString ? `/admin/staff?${queryString}` : "/admin/staff" }),
      transformResponse: asList,
      providesTags: ["Staff"],
    }),

    getNextEmployeeId: builder.query({
      query: () => ({ url: "/admin/staff/next-employee-id" }),
      transformResponse: asData,
    }),

    getAdminServices: builder.query({
      query: () => ({ url: "/admin/services" }),
      transformResponse: asList,
      providesTags: ["Service"],
    }),

    getPrivilegesList: builder.query({
      query: () => ({ url: "/privileges" }),
      transformResponse: asList,
      providesTags: ["Privilege"],
    }),

    createAdminStaff: builder.mutation({
      query: (body) => ({ url: "/admin/staff", method: "POST", data: body }),
      invalidatesTags: ["Staff", "Appointment", "Dashboard", "InvoiceMetadata"],
    }),

    updateAdminStaff: builder.mutation({
      query: ({ id, body }) => ({
        url: `/admin/staff/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Staff", "Appointment", "Dashboard", "InvoiceMetadata"],
    }),

    deleteAdminStaff: builder.mutation({
      query: (id) => ({ url: `/admin/staff/${id}`, method: "DELETE" }),
      invalidatesTags: ["Staff", "Appointment", "Dashboard", "InvoiceMetadata"],
    }),

    bulkDeleteAdminStaff: builder.mutation({
      query: (ids) => ({
        url: `/admin/staff/bulk`,
        method: "DELETE",
        data: { ids },
      }),
      invalidatesTags: ["Staff", "Appointment", "Dashboard", "InvoiceMetadata"],
    }),

    // Services CRUD (Query is in tenantEndpoints as getServices)
    createService: builder.mutation({
      query: (body) => ({
        url: "/services",
        method: "POST",
        data: body,
        // Using body as it might be FormData or JSON based on caller. 
        // Axios instance inside axiosBaseQuery usually handles FormData nicely.
      }),
      invalidatesTags: ["Service"],
    }),

    updateService: builder.mutation({
      query: ({ id, body }) => ({
        url: `/services/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["Service", "InvoiceMetadata"],
    }),

    deleteService: builder.mutation({
      query: (id) => ({ url: `/services/${id}`, method: "DELETE" }),
      invalidatesTags: ["Service", "InvoiceMetadata"],
    }),

    bulkDeleteServices: builder.mutation({
      query: (ids) => ({
        url: `/services/bulk`,
        method: "DELETE",
        data: { ids },
      }),
      invalidatesTags: ["Service", "InvoiceMetadata"],
    }),

    // Slot Management
    updateSlotSettings: builder.mutation({
      query: (body) => ({
        url: "/admin/slot-settings",
        method: "PUT",
        data: body,
      }),
      invalidatesTags: ["SlotSettings"],
    }),

    updateBlockSlots: builder.mutation({
      query: (body) => ({
        url: "/admin/block-slots",
        method: "POST",
        data: body,
      }),
      invalidatesTags: ["BlockSlots"],
    }),

    // Designations (Staff Positions)
    getDesignations: builder.query({
      query: () => ({ url: "/designations" }),
      transformResponse: asList,
      providesTags: ["Designation"],
    }),

    createDesignation: builder.mutation({
      query: (body) => ({ url: "/designations", method: "POST", data: body }),
      invalidatesTags: ["Designation"],
    }),

    deleteDesignation: builder.mutation({
      query: (id) => ({ url: `/designations/${id}`, method: "DELETE" }),
      invalidatesTags: ["Designation"],
    }),

    // Gallery Management
    uploadGalleryImages: builder.mutation({
      query: (formData) => ({
        url: "/admin/gallery",
        method: "POST",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      }),
      transformResponse: asData,
      invalidatesTags: ["Profile", "SalonProfile"],
    }),

    addUnsplashImage: builder.mutation({
      query: (body) => ({
        url: "/admin/gallery/unsplash",
        method: "POST",
        data: body,
      }),
      transformResponse: asData,
      invalidatesTags: ["Profile", "SalonProfile"],
    }),

    deleteGalleryImage: builder.mutation({
      query: (imageId) => ({
        url: `/admin/gallery/${imageId}`,
        method: "DELETE",
      }),
      transformResponse: asData,
      invalidatesTags: ["Profile", "SalonProfile"],
    }),

    setPrimaryGalleryImage: builder.mutation({
      query: (imageId) => ({
        url: `/admin/gallery/${imageId}/primary`,
        method: "PUT",
      }),
      transformResponse: asData,
      invalidatesTags: ["Profile", "SalonProfile"],
    }),

    searchUnsplash: builder.query({
      query: (query) => ({
        url: "/admin/gallery/unsplash/search",
        params: { query },
      }),
      transformResponse: asData,
    }),

    // Portfolio Management
    uploadPortfolioImage: builder.mutation({
      query: (formData) => ({
        url: "/admin/profile/portfolio",
        method: "POST",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      }),
      transformResponse: asData,
      invalidatesTags: ["Profile", "SalonProfile"],
    }),

    deletePortfolioImage: builder.mutation({
      query: (imageUrl) => ({
        url: "/admin/profile/portfolio",
        method: "DELETE",
        data: { imageUrl },
      }),
      invalidatesTags: ["Profile", "SalonProfile"],
    }),

    getLoyaltySettings: builder.query({
      query: () => ({ url: "/admin/loyalty-settings" }),
      transformResponse: asData,
      providesTags: ["SalonProfile"],
    }),

    updateLoyaltySettings: builder.mutation({
      query: (body) => ({
        url: "/admin/loyalty-settings",
        method: "PUT",
        data: body,
      }),
      transformResponse: asData,
      invalidatesTags: ["SalonProfile"],
    }),

    /** Settings — Shops / Branches (admin, no slug) */
    getShopsList: builder.query({
      query: () => ({ url: "/shops" }),
      transformResponse: asList,
      providesTags: ["Shop"],
    }),

    createShop: builder.mutation({
      query: (formData) => ({
        url: "/shops",
        method: "POST",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      }),
      invalidatesTags: ["Shop"],
    }),

    updateShop: builder.mutation({
      query: ({ id, formData }) => ({
        url: `/shops/${id}`,
        method: "PUT",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      }),
      invalidatesTags: ["Shop"],
    }),

    deleteShop: builder.mutation({
      query: (id) => ({ url: `/shops/${id}`, method: "DELETE" }),
      invalidatesTags: ["Shop"],
    }),

    /** Settings — Receipt settings sync */
    updateReceiptSettings: builder.mutation({
      query: (data) => ({
        url: "/admin/receipt-settings",
        method: "PUT",
        data,
      }),
      invalidatesTags: ["SalonProfile"],
    }),

    /** Settings — Profile update with image (FormData) */
    updateSalonProfileWithImage: builder.mutation({
      query: (formData) => ({
        url: "/admin/profile",
        method: "PUT",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      }),
      transformResponse: passthrough,
      invalidatesTags: [
        "Profile",
        "SalonProfile",
        "PublicConfig",
        "InvoiceMetadata",
      ],
    }),

    redeemLoyaltyPoints: builder.mutation({
      query: ({ customerId, pointsToRedeem }) => ({
        url: `/admin/customers/${customerId}/redeem-loyalty`,
        method: "POST",
        data: { pointsToRedeem },
      }),
      invalidatesTags: ["Customer"],
    }),
  }),
});
