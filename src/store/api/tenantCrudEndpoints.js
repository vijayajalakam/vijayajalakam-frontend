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
  useUpdateBusinessProfileMutation,
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
  useUpdateBusinessProfileWithImageMutation,
} = appApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getDepartmentsAll: builder.query({
      queryFn: () => ({ data: [] }),
      providesTags: ["Department"],
    }),

    getServiceCategories: builder.query({
      queryFn: () => ({ data: [] }),
      providesTags: ["Category"],
    }),

    getProductCategoriesList: builder.query({
      queryFn: () => ({ data: [] }),
      providesTags: ["ProductCategory"],
    }),

    getUnitsList: builder.query({
      queryFn: () => ({ data: [] }),
      providesTags: ["Unit"],
    }),

    getVariantsList: builder.query({
      queryFn: () => ({ data: [] }),
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
      providesTags: ["Profile", "BusinessProfile"],
    }),

    createTax: builder.mutation({ queryFn: () => ({ data: { success: true } }) }),
    updateTax: builder.mutation({ queryFn: () => ({ data: { success: true } }) }),
    deleteTax: builder.mutation({ queryFn: () => ({ data: { success: true } }) }),
    createUnit: builder.mutation({ queryFn: () => ({ data: { success: true } }) }),
    updateUnit: builder.mutation({ queryFn: () => ({ data: { success: true } }) }),
    deleteUnit: builder.mutation({ queryFn: () => ({ data: { success: true } }) }),
    createVariant: builder.mutation({ queryFn: () => ({ data: { success: true } }) }),
    updateVariant: builder.mutation({ queryFn: () => ({ data: { success: true } }) }),
    deleteVariant: builder.mutation({ queryFn: () => ({ data: { success: true } }) }),
    createDepartment: builder.mutation({ queryFn: () => ({ data: { success: true } }) }),
    updateDepartment: builder.mutation({ queryFn: () => ({ data: { success: true } }) }),
    deleteDepartment: builder.mutation({ queryFn: () => ({ data: { success: true } }) }),
    createServiceCategory: builder.mutation({ queryFn: () => ({ data: { success: true } }) }),
    updateServiceCategory: builder.mutation({ queryFn: () => ({ data: { success: true } }) }),
    deleteServiceCategory: builder.mutation({ queryFn: () => ({ data: { success: true } }) }),
    createProductCategory: builder.mutation({ queryFn: () => ({ data: { success: true } }) }),
    updateProductCategory: builder.mutation({ queryFn: () => ({ data: { success: true } }) }),
    deleteProductCategory: builder.mutation({ queryFn: () => ({ data: { success: true } }) }),

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

    updateBusinessProfile: builder.mutation({
      query: (data) => ({
        url: "/admin/profile",
        method: "PUT",
        data,
      }),
      transformResponse: passthrough,
      invalidatesTags: [
        "Profile",
        "BusinessProfile",
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
      invalidatesTags: ["Profile", "BusinessProfile"],
    }),

    addUnsplashImage: builder.mutation({
      query: (body) => ({
        url: "/admin/gallery/unsplash",
        method: "POST",
        data: body,
      }),
      transformResponse: asData,
      invalidatesTags: ["Profile", "BusinessProfile"],
    }),

    deleteGalleryImage: builder.mutation({
      query: (imageId) => ({
        url: `/admin/gallery/${imageId}`,
        method: "DELETE",
      }),
      transformResponse: asData,
      invalidatesTags: ["Profile", "BusinessProfile"],
    }),

    setPrimaryGalleryImage: builder.mutation({
      query: (imageId) => ({
        url: `/admin/gallery/${imageId}/primary`,
        method: "PUT",
      }),
      transformResponse: asData,
      invalidatesTags: ["Profile", "BusinessProfile"],
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
      invalidatesTags: ["Profile", "BusinessProfile"],
    }),

    deletePortfolioImage: builder.mutation({
      query: (imageUrl) => ({
        url: "/admin/profile/portfolio",
        method: "DELETE",
        data: { imageUrl },
      }),
      invalidatesTags: ["Profile", "BusinessProfile"],
    }),

    getLoyaltySettings: builder.query({
      query: () => ({ url: "/admin/loyalty-settings" }),
      transformResponse: asData,
      providesTags: ["BusinessProfile"],
    }),

    updateLoyaltySettings: builder.mutation({
      query: (body) => ({
        url: "/admin/loyalty-settings",
        method: "PUT",
        data: body,
      }),
      transformResponse: asData,
      invalidatesTags: ["BusinessProfile"],
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
      invalidatesTags: ["BusinessProfile"],
    }),

    /** Settings — Profile update with image (FormData) */
    updateBusinessProfileWithImage: builder.mutation({
      query: (formData) => ({
        url: "/admin/profile",
        method: "PUT",
        data: formData,
        headers: { "Content-Type": "multipart/form-data" },
      }),
      transformResponse: passthrough,
      invalidatesTags: [
        "Profile",
        "BusinessProfile",
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
