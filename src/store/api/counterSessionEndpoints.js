import { appApi } from "./appApi";
import { asList, asData, passthrough } from "./rtkUtils";

export const {
  useGetCurrentSessionQuery,
  useGetCounterSessionReportQuery,
  useOpenCounterSessionMutation,
  useCloseCounterSessionMutation,
} = appApi.injectEndpoints({
  endpoints: (build) => ({
    getCurrentSession: build.query({
      query: () => ({ url: "/counter-session/current" }),
      providesTags: ["CounterSession"],
      transformResponse: passthrough,
    }),
    getCounterSessionReport: build.query({
      query: (params) => ({
        url: "/counter-session/report",
        params,
      }),
      providesTags: ["CounterSession"],
      transformResponse: asData,
    }),
    openCounterSession: build.mutation({
      query: (data) => ({
        url: "/counter-session/open",
        method: "POST",
        data,
      }),
      invalidatesTags: ["CounterSession", "Dashboard"],
    }),
    closeCounterSession: build.mutation({
      query: () => ({
        url: "/counter-session/close",
        method: "POST",
      }),
      invalidatesTags: ["CounterSession", "Dashboard"],
    }),
  }),
});
