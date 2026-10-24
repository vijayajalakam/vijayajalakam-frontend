import { appApi } from "./appApi";
import { asList, asData, passthrough } from "./rtkUtils";

/** Injected tenant REST endpoints — import this module once from `store.js` for side effects. */
export const {
  useGetAdminDashboardQuery,
  useGetAppointmentsQuery,
  useLazyGetAppointmentsQuery,
  useGetMyGlobalBookingsQuery,
  useLazyGetMyGlobalBookingsQuery,
  useGetInvoicesQuery,
  useLazyGetInvoicesQuery,
  useGetInvoiceByIdQuery,
  useLazyGetInvoiceByIdQuery,
  useGetInvoiceMetadataQuery,
  useLazyGetInvoiceMetadataQuery,
  useLazyGetAppointmentSlotsQuery,
  useGetProductsQuery,
  useLazyGetProductsQuery,
  useGetServicesQuery,
  useLazyGetServicesQuery,
  useGetPublicStaffQuery,
  useGetShopsQuery,
  useGetTaxesQuery,
  useGetPaymentMethodsQuery,
  useGetPurchaseReportQuery,
  useLazyGetPurchaseReportQuery,
  useGetValuableCustomerReportQuery,
  useLazyGetValuableCustomerReportQuery,
  useGetRegularCustomerReportQuery,
  useLazyGetRegularCustomerReportQuery,
  useGetCustomerLoyaltyBalancesQuery,
  useUpdateInvoiceMutation,
  useCancelInvoiceMutation,
  useCompleteAppointmentMutation,
  useCreateAppointmentMutation,
  useCancelAppointmentMutation,
  useCreateAdminCustomerMutation,
  useToggleProductFavouriteMutation,
  useSettleCommissionMutation,
  useCreateRazorpayOrderMutation,
  useGetOffersQuery,
  useGetSlotSettingsQuery,
  useLazyGetSlotSettingsQuery,
  useGetBlockSlotsQuery,
  useLazyGetBlockSlotsQuery,
} = appApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getAdminDashboard: builder.query({
      query: () => ({ url: "/admin/dashboard" }),
      transformResponse: asData,
      providesTags: ["Dashboard"],
    }),
    getAppointments: builder.query({
      query: (params) => {
        if (params?.my) {
          return { url: "/appointments/my" };
        }
        return { url: "/appointments" };
      },
      transformResponse: asList,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: "Appointment", id: _id })),
              { type: "Appointment", id: "LIST" },
            ]
          : [{ type: "Appointment", id: "LIST" }],
    }),

    // Global user bookings: aggregated across all shops the user has booked at
    getMyGlobalBookings: builder.query({
      query: () => ({ url: "/appointments/my/global" }),
      transformResponse: asList,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: "Appointment", id: _id })),
              { type: "Appointment", id: "GLOBAL_LIST" },
            ]
          : [{ type: "Appointment", id: "GLOBAL_LIST" }],
    }),

    getInvoices: builder.query({
      query: (queryString) => ({
        url: queryString ? `/invoices?${queryString}` : "/invoices",
      }),
      transformResponse: passthrough,
      providesTags: (res) =>
        res?.success ? [{ type: "Invoice", id: "LIST" }] : ["Invoice"],
    }),

    getInvoiceById: builder.query({
      query: (id) => ({ url: `/invoices/${id}` }),
      transformResponse: asData,
      providesTags: (r, e, id) => [{ type: "Invoice", id }],
    }),

    getInvoiceMetadata: builder.query({
      query: () => ({ url: "/invoices/metadata" }),
      transformResponse: asData,
      providesTags: ["InvoiceMetadata"],
    }),

    getAppointmentSlots: builder.query({
      query: ({ date, shopId, branchId, staffId }) => ({
        url: "/appointments/slots",
        params: { date, shopId, branchId, staffId },
      }),
      transformResponse: passthrough,
    }),

    getProducts: builder.query({
      query: (params) => {
        let q = "";
        if (typeof params === "string") {
          q = params.includes("branchId=") ? params : params.replace("branch=", "branchId=");
        } else if (params && typeof params === "object") {
          const searchParams = new URLSearchParams();
          Object.entries(params).forEach(([key, val]) => {
            if (val) searchParams.append(key === "branch" ? "branchId" : key, val);
          });
          q = searchParams.toString();
        }
        return { url: q ? `/products?${q}` : "/products" };
      },
      transformResponse: asList,
      providesTags: ["Product"],
    }),

    getServices: builder.query({
      query: (params) => {
        const q = new URLSearchParams();
        if (typeof params === "string") {
          q.append("branchId", params);
        } else if (params && typeof params === "object") {
          if (params.shopId) q.append("shopId", params.shopId);
          if (params.branchId) q.append("branchId", params.branchId);
        }
        const qs = q.toString();
        return { url: qs ? `/services?${qs}` : "/services" };
      },
      transformResponse: asList,
      providesTags: ["Service"],
    }),

    getSlotSettings: builder.query({
      query: (branchId) => ({ url: `/admin/slot-settings?branchId=${branchId}` }),
      transformResponse: asData,
      providesTags: ["SlotSettings"],
    }),

    getBlockSlots: builder.query({
      query: ({ date, branchId }) => ({ url: `/admin/block-slots?date=${date}&branchId=${branchId}` }),
      transformResponse: asData,
      providesTags: ["BlockSlots"],
    }),

    getPublicStaff: builder.query({
      query: () => ({ url: "/public/staff" }),
      transformResponse: asList,
      providesTags: ["Staff"],
    }),

    getShops: builder.query({
      query: (slug) => ({ url: "/shops", params: { slug } }), // slug used as cache key for different shops
      transformResponse: asList,
      providesTags: ["Shop"],
    }),

    getTaxes: builder.query({
      queryFn: () => ({ data: [] }),
      providesTags: ["Tax"],
    }),

    getOffers: builder.query({
      query: () => ({ url: "/offers" }),
      transformResponse: asList,
      providesTags: ["Offer"],
    }),

    getPaymentMethods: builder.query({
      query: (all) => ({
        url: all ? "/payment-methods?all=true" : "/payment-methods",
      }),
      transformResponse: (res) => {
        let list = asList(res);
        if (!list.some(p => String(p.name).toUpperCase() === "DUE")) {
          const isDisabled = localStorage.getItem("system_due_disabled") === "true";
          list.push({ _id: "system_due", name: "DUE", isActive: !isDisabled, isDefault: true, isSystem: true });
        }
        return list;
      },
      providesTags: ["PaymentMethod"],
    }),

    getPurchaseReport: builder.query({
      query: (queryString) => ({
        url: `/purchases/invoices/report?${queryString}`,
      }),
      transformResponse: passthrough,
      providesTags: [{ type: "Report", id: "purchase-invoices" }],
    }),

    getValuableCustomerReport: builder.query({
      query: ({ startDate = "", endDate = "" } = {}) => {
        const p = new URLSearchParams();
        if (startDate) p.append("startDate", startDate);
        if (endDate) p.append("endDate", endDate);
        return { url: `/admin/customers/valuable-report?${p.toString()}` };
      },
      transformResponse: passthrough,
      providesTags: [{ type: "Report", id: "valuable-customers" }],
    }),

    getRegularCustomerReport: builder.query({
      query: ({ startDate = "", endDate = "" } = {}) => {
        const p = new URLSearchParams();
        if (startDate) p.append("startDate", startDate);
        if (endDate) p.append("endDate", endDate);
        return { url: `/admin/customers/regular-report?${p.toString()}` };
      },
      transformResponse: passthrough,
      providesTags: [{ type: "Report", id: "regular-customers" }],
    }),

    getCustomerLoyaltyBalances: builder.query({
      query: () => ({ url: "/admin/customers/loyalty-balances" }),
      transformResponse: passthrough,
      providesTags: [{ type: "Report", id: "loyalty-balances" }, "Customer"],
    }),

    updateInvoice: builder.mutation({
      query: ({ id, body }) => ({
        url: `/invoices/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (r, e, { id }) => [
        { type: "Invoice", id },
        { type: "Invoice", id: "LIST" },
        "InvoiceMetadata",
        "Product",
        "Appointment",
        "Dashboard",
        "Staff",
        "CounterSession",
      ],
    }),

    cancelInvoice: builder.mutation({
      query: (id) => ({
        url: `/invoices/${id}/cancel`,
        method: "PUT",
      }),
      invalidatesTags: (r, e, id) => [
        { type: "Invoice", id },
        { type: "Invoice", id: "LIST" },
        "InvoiceMetadata",
        "Dashboard",
        "CounterSession",
      ],
    }),

    completeAppointment: builder.mutation({
      query: ({ id, body }) => ({
        url: `/appointments/${id}/complete`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Appointment", id },
        { type: "Appointment", id: "LIST" },
        "Invoice",
        "InvoiceMetadata",
        "Product",
        "Dashboard",
        "Staff",
        "CounterSession",
      ],
    }),

    createAppointment: builder.mutation({
      query: (body) => ({ url: "/appointments", method: "POST", data: body }),
      invalidatesTags: [
        { type: "Appointment", id: "LIST" },
        { type: "Appointment", id: "GLOBAL_LIST" },
        "Invoice",
        "InvoiceMetadata",
        "Product",
        "Dashboard",
        "Staff",
        "CounterSession",
      ],
    }),

    cancelAppointment: builder.mutation({
      query: (id) => ({
        url: `/appointments/my/${id}/cancel`,
        method: "PUT",
      }),
      invalidatesTags: (result, error, id) => [
        { type: "Appointment", id },
        { type: "Appointment", id: "LIST" },
        "Dashboard",
        "Staff",
        "CounterSession",
      ],
    }),

    createAdminCustomer: builder.mutation({
      query: (formData) => ({
        url: "/admin/customers",
        method: "POST",
        data: formData,
      }),
      invalidatesTags: ["InvoiceMetadata", "Customer"],
    }),

    toggleProductFavourite: builder.mutation({
      query: (productId) => ({
        url: `/products/${productId}/favourite`,
        method: "PUT",
      }),
      invalidatesTags: ["Product", "InvoiceMetadata"],
    }),

    settleCommission: builder.mutation({
      query: (body) => ({
        url: "/invoices/settle-commission",
        method: "POST",
        data: body,
      }),
      invalidatesTags: ["Staff", "Invoice", "Dashboard", "CounterSession"],
    }),

    createRazorpayOrder: builder.mutation({
      query: (body) => ({
        url: "/admin/razorpay/create-order",
        method: "POST",
        data: body,
      }),
      transformResponse: passthrough,
    }),
  }),
});
