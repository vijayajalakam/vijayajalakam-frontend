/**
 * invoiceEndpoints.js
 * RTK Query endpoints for the InvoicesPage list view.
 * Replaces raw axios calls — provides automatic caching, deduplication, and
 * tag-based invalidation so the list stays fresh after mutations.
 */
import { appApi } from "./appApi";
import { passthrough, asList } from "./rtkUtils";

export const {
  useGetInvoiceListQuery,
  useLazyGetInvoiceListQuery,
  useGetInvoiceFilterMetaQuery,
  useDownloadInvoiceMutation,
  useCreateSalesInvoiceMutation,
} = appApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    /**
     * Paginated + filtered invoice list.
     * Pass a URLSearchParams string (or plain object) as the argument.
     * Example: useGetInvoiceListQuery("page=1&limit=10&startDate=2024-01-01")
     */
    getInvoiceList: builder.query({
      query: (queryString = "") => ({
        url: queryString ? `/invoices?${queryString}` : "/invoices",
      }),
      transformResponse: passthrough,
      // Cache each unique query string separately for 2 minutes
      keepUnusedDataFor: 120,
      providesTags: (res) =>
        res?.success
          ? [{ type: "Invoice", id: "LIST" }]
          : ["Invoice"],
    }),

    /**
     * All metadata needed for the filter modal:
     * services, shops, staff, customers, payment methods.
     * Cached for 5 minutes — rarely changes.
     */
    getInvoiceFilterMeta: builder.query({
      query: () => ({ url: "/invoices/metadata" }),
      transformResponse: (res) => (res?.success ? res.data : null),
      keepUnusedDataFor: 300,
      providesTags: ["InvoiceMetadata"],
    }),

    /**
     * Download invoice PDF — returns a blob URL string.
     * Mutation so it's never cached.
     */
    downloadInvoice: builder.mutation({
      query: (id) => ({
        url: `/invoices/${id}/download`,
        method: "GET",
        responseType: "blob",
      }),
    }),

    /**
     * Create a new sales invoice (product-only flow from SalesInvoiceEntry).
     */
    createSalesInvoice: builder.mutation({
      query: (body) => ({
        url: "/sales/invoices",
        method: "POST",
        data: body,
      }),
      invalidatesTags: [
        { type: "Invoice", id: "LIST" },
        "InvoiceMetadata",
        "Product",
        "Dashboard",
        "CounterSession",
      ],
    }),
  }),
});
