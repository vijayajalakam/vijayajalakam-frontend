import { appApi } from "./appApi";
import { asList } from "./rtkUtils";

export const {
  useGetNotificationsQuery,
  useDismissNotificationMutation,
} = appApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getNotifications: builder.query({
      query: () => ({ url: "/notifications" }),
      transformResponse: asList,
      providesTags: ["Notification"],
    }),

    dismissNotification: builder.mutation({
      query: (id) => ({
        url: `/notifications/${id}/dismiss`,
        method: "PUT",
      }),
      invalidatesTags: ["Notification"],
    }),
  }),
});
