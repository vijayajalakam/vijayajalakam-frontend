import { appApi } from "./appApi";
import { asList, asData, passthrough } from "./rtkUtils";

export const {
  useGetChartOfAccountsQuery,
  useGetChartOfAccountByIdQuery,
  useCreateChartOfAccountMutation,
  useUpdateChartOfAccountMutation,
  useDeleteChartOfAccountMutation,

  useGetAccountTransactionsQuery,
  useGetAccountTransactionByIdQuery,
  useCreateAccountTransactionMutation,
  useUpdateAccountTransactionMutation,
  useDeleteAccountTransactionMutation,

  useGetDayReportQuery,
  useGetGSTReportQuery,
  useGetProfitLossQuery,
  useGetTrialBalanceQuery,
  useGetBalanceSheetQuery,
  useGetAccountStatementQuery,
  useGetContraReportQuery,
  useGetPaymentReportQuery,
  useGetReceiptReportQuery,
  useGetJournalReportQuery,
} = appApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    // ==================== CHART OF ACCOUNTS ====================
    getChartOfAccounts: builder.query({
      query: (params = "") => ({
        url: params ? `/chart-of-accounts?${params}` : "/chart-of-accounts",
      }),
      transformResponse: asData,
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: "ChartAccount", id: _id })),
              { type: "ChartAccount", id: "LIST" },
            ]
          : [{ type: "ChartAccount", id: "LIST" }],
      keepUnusedDataFor: 180,
    }),

    getChartOfAccountById: builder.query({
      query: (id) => ({ url: `/chart-of-accounts/${id}` }),
      transformResponse: asData,
      providesTags: (result, error, id) => [{ type: "ChartAccount", id }],
    }),

    createChartOfAccount: builder.mutation({
      query: (body) => ({
        url: "/chart-of-accounts",
        method: "POST",
        data: body,
      }),
      invalidatesTags: [{ type: "ChartAccount", id: "LIST" }],
    }),

    updateChartOfAccount: builder.mutation({
      query: ({ id, body }) => ({
        url: `/chart-of-accounts/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "ChartAccount", id },
        { type: "ChartAccount", id: "LIST" },
      ],
    }),

    deleteChartOfAccount: builder.mutation({
      query: (id) => ({
        url: `/chart-of-accounts/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [{ type: "ChartAccount", id: "LIST" }],
    }),

    // ==================== ACCOUNT TRANSACTIONS ====================
    getAccountTransactions: builder.query({
      query: (params = "") => ({
        url: params ? `/account-transactions?${params}` : "/account-transactions",
      }),
      transformResponse: passthrough,
      providesTags: (result) =>
        result?.success && result?.data
          ? [
              ...result.data.map(({ _id }) => ({ type: "AccountTransaction", id: _id })),
              { type: "AccountTransaction", id: "LIST" },
            ]
          : [{ type: "AccountTransaction", id: "LIST" }],
      keepUnusedDataFor: 180,
    }),

    getAccountTransactionById: builder.query({
      query: (id) => ({ url: `/account-transactions/${id}` }),
      transformResponse: asData,
      providesTags: (result, error, id) => [{ type: "AccountTransaction", id }],
    }),

    createAccountTransaction: builder.mutation({
      query: (body) => ({
        url: "/account-transactions",
        method: "POST",
        data: body,
      }),
      invalidatesTags: [
        { type: "AccountTransaction", id: "LIST" },
        { type: "ChartAccount", id: "LIST" },
        "Report"
      ],
    }),

    updateAccountTransaction: builder.mutation({
      query: ({ id, body }) => ({
        url: `/account-transactions/${id}`,
        method: "PUT",
        data: body,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "AccountTransaction", id },
        { type: "AccountTransaction", id: "LIST" },
        { type: "ChartAccount", id: "LIST" },
        "Report"
      ],
    }),

    deleteAccountTransaction: builder.mutation({
      query: ({ id, type = "" }) => ({
        url: type ? `/account-transactions/${id}?type=${type}` : `/account-transactions/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: [
        { type: "AccountTransaction", id: "LIST" },
        { type: "ChartAccount", id: "LIST" },
        "Report"
      ],
    }),

    // ==================== REPORTS ====================
    getDayReport: builder.query({
      query: (params = "") => ({
        url: `/account-transactions/day-report?${params}`,
      }),
      transformResponse: passthrough,
      providesTags: ["Report", { type: "AccountTransaction", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),

    getGSTReport: builder.query({
      query: (params = "") => ({
        url: `/account-transactions/gst-report?${params}`,
      }),
      transformResponse: passthrough,
      providesTags: ["Report", { type: "AccountTransaction", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),

    getProfitLoss: builder.query({
      query: (params = "") => ({
        url: `/account-transactions/profit-loss?${params}`,
      }),
      transformResponse: passthrough,
      providesTags: ["Report", { type: "AccountTransaction", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),

    getTrialBalance: builder.query({
      query: (params = "") => ({
        url: `/chart-of-accounts/trial-balance?${params}`,
      }),
      transformResponse: passthrough,
      providesTags: ["Report", { type: "ChartAccount", id: "LIST" }, { type: "AccountTransaction", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),

    getBalanceSheet: builder.query({
      query: (params = "") => ({
        url: `/chart-of-accounts/balance-sheet?${params}`,
      }),
      transformResponse: passthrough,
      providesTags: ["Report", { type: "ChartAccount", id: "LIST" }, { type: "AccountTransaction", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),

    getAccountStatement: builder.query({
      query: (params = "") => ({
        url: `/account-transactions/statement?${params}`,
      }),
      transformResponse: passthrough,
      providesTags: ["Report", { type: "AccountTransaction", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),

    getContraReport: builder.query({
      query: (params = "") => ({
        url: `/account-transactions/contra-report?${params}`,
      }),
      transformResponse: passthrough,
      providesTags: ["Report", { type: "AccountTransaction", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),

    getPaymentReport: builder.query({
      query: (params = "") => ({
        url: `/account-transactions/payment-report?${params}`,
      }),
      transformResponse: passthrough,
      providesTags: ["Report", { type: "AccountTransaction", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),

    getReceiptReport: builder.query({
      query: (params = "") => ({
        url: `/account-transactions/receipt-report?${params}`,
      }),
      transformResponse: passthrough,
      providesTags: ["Report", { type: "AccountTransaction", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),

    getJournalReport: builder.query({
      query: (params = "") => ({
        url: `/account-transactions/journal-report?${params}`,
      }),
      transformResponse: passthrough,
      providesTags: ["Report", { type: "AccountTransaction", id: "LIST" }],
      keepUnusedDataFor: 60,
    }),
  }),
});
