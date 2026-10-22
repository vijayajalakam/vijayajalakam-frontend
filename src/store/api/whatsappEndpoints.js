import { appApi } from './appApi';

export const whatsappEndpoints = appApi.injectEndpoints({
  endpoints: (builder) => ({
    getWhatsappStatus: builder.query({
      query: () => ({ url: '/whatsapp/status' }),
      providesTags: ['WhatsApp'],
    }),
    initializeWhatsapp: builder.mutation({
      query: () => ({
        url: '/whatsapp/initialize',
        method: 'POST',
      }),
      invalidatesTags: ['WhatsApp'],
    }),
    disconnectWhatsapp: builder.mutation({
      query: () => ({
        url: '/whatsapp/disconnect',
        method: 'POST',
      }),
      invalidatesTags: ['WhatsApp'],
    }),
    sendTestMessage: builder.mutation({
      query: (data) => ({
        url: '/whatsapp/send-message',
        method: 'POST',
        data,
      }),
    }),
  }),
});

export const {
  useGetWhatsappStatusQuery,
  useInitializeWhatsappMutation,
  useDisconnectWhatsappMutation,
  useSendTestMessageMutation,
} = whatsappEndpoints;
