import { createApi } from "@reduxjs/toolkit/query/react";
import { axiosBaseQuery } from "../axiosBaseQuery";

/** Central tag bucket for tenant RTK Query — use granular ids where it helps refetch precision. */
export const TENANT_TAG_TYPES = [
  "PublicConfig",
  "Dashboard",
  "Shop",
  "Product",
  "Invoice",
  "InvoiceMetadata",
  "Appointment",
  "Customer",
  "Staff",
  "Service",
  "Tax",
  "Unit",
  "Variant",
  "Category",
  "Department",
  "CounterSession",
  "Supplier",
  "Purchase",
  "PaymentMethod",
  "ChartAccount",
  "Profile",
  "Privilege",
  "Report",
  "BusinessProfile",
  "ProductCategory",
  "AccountTransaction",
  "Notification",
  "Complaint",
  "Integration",
  "Smtp",
  "Designation",
];

export const appApi = createApi({
  reducerPath: "appApi",
  baseQuery: axiosBaseQuery(),
  tagTypes: TENANT_TAG_TYPES,
  keepUnusedDataFor: 120,
  endpoints: (builder) => ({
    getPublicConfig: builder.query({
      query: (slug) => ({ url: "/public/config", params: { slug } }), // slug used as cache key
      transformResponse: (res) => (res?.success ? res.data : null),
      providesTags: ["PublicConfig"],
    }),
  }),
});

export const { useGetPublicConfigQuery, useLazyGetPublicConfigQuery } = appApi;
