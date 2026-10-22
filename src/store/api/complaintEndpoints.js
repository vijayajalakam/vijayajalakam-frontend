import { appApi } from "./appApi";

export const {
    useGetShopComplaintsQuery,
    useCreateComplaintMutation,
    useUpdateComplaintMutation,
    useDeleteComplaintMutation,
} = appApi.injectEndpoints({
    overrideExisting: false,
    endpoints: (builder) => ({
        getShopComplaints: builder.query({
            query: () => ({ url: "/complaints" }),
            transformResponse: (res) => (res?.success ? res.complaints : []),
            providesTags: ["Complaint"],
        }),

        createComplaint: builder.mutation({
            query: (body) => ({
                url: "/complaints",
                method: "POST",
                data: body,
            }),
            invalidatesTags: ["Complaint"],
        }),

        updateComplaint: builder.mutation({
            query: ({ id, ...body }) => ({
                url: `/complaints/${id}`,
                method: "PUT",
                data: body,
            }),
            invalidatesTags: ["Complaint"],
        }),

        deleteComplaint: builder.mutation({
            query: (id) => ({
                url: `/complaints/${id}`,
                method: "DELETE",
            }),
            invalidatesTags: ["Complaint"],
        }),
    }),
});
