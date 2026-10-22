import { appApi } from "./appApi";
import { asData, passthrough } from "./rtkUtils";

/**
 * Integration endpoints (SMTP, WhatsApp, etc.)
 * Import once from `store.js` for side effects.
 */
export const {
  useGetIntegrationStatusQuery,
  useGetSmtpSettingsQuery,
  useLazyGetSmtpSettingsQuery,
  useUpdateSmtpSettingsMutation,
  useSendSmtpTestEmailMutation,
  useToggleIntegrationStatusMutation,
  useUpdateRazorpaySettingsMutation,
} = appApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getIntegrationStatus: builder.query({
      query: () => ({ url: "/admin/integration/status" }),
      transformResponse: passthrough,
      providesTags: ["Integration"],
    }),

    getSmtpSettings: builder.query({
      query: () => ({ url: "/admin/smtp/settings" }),
      transformResponse: asData,
      providesTags: ["Smtp", "Integration"],
    }),

    updateSmtpSettings: builder.mutation({
      query: (body) => ({
        url: "/admin/smtp/settings",
        method: "PUT",
        data: body,
      }),
      transformResponse: passthrough,
      invalidatesTags: ["Smtp", "Integration"],
    }),

    sendSmtpTestEmail: builder.mutation({
      query: (body) => ({
        url: "/admin/smtp/test-email",
        method: "POST",
        data: body,
      }),
      transformResponse: passthrough,
    }),

    toggleIntegrationStatus: builder.mutation({
      query: ({ field, enabled }) => ({
        url: `/admin/integrations/status`,
        method: "PUT",
        data: { field, enabled },
      }),
      transformResponse: passthrough,
      invalidatesTags: ["Integration", "Smtp"],
    }),

    updateRazorpaySettings: builder.mutation({
      query: (body) => ({
        url: "/admin/razorpay/settings",
        method: "PUT",
        data: body,
      }),
      transformResponse: passthrough,
      invalidatesTags: ["Integration"],
    }),
  }),
});
