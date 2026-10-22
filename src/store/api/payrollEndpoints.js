import { appApi } from './appApi';

export const payrollEndpoints = appApi.injectEndpoints({
  endpoints: (builder) => ({
    getPayrollData: builder.query({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.wageType && params.wageType !== "All") {
          queryParams.append("wageType", params.wageType);
        }
        if (params?.wageType === "Daily") {
          if (params.startDate) queryParams.append("startDate", params.startDate);
          if (params.endDate) queryParams.append("endDate", params.endDate);
        } else if (params?.month) {
          queryParams.append("month", params.month);
        }
        
        return {
          url: `/payroll?${queryParams.toString()}`,
          method: 'GET',
        };
      },
      providesTags: ['Payroll'],
    }),
    
    processPayroll: builder.mutation({
      query: (data) => ({
        url: '/payroll',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Payroll', 'Dashboard', 'Reports'],
    }),

    sendPayrollSlip: builder.mutation({
      query: (data) => ({
        url: '/payroll/send',
        method: 'POST',
        data,
      }),
      // Sending a slip doesn't change the data, so no invalidation needed
    }),
    
    updateAttendance: builder.mutation({
      query: (data) => ({
        url: '/attendance',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Payroll', 'Attendance', 'Dashboard'],
    }),
    
    deletePayroll: builder.mutation({
      query: (id) => ({
        url: `/payroll/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Payroll', 'Dashboard', 'Reports'],
    })
  }),
});

export const { 
  useGetPayrollDataQuery, 
  useProcessPayrollMutation, 
  useSendPayrollSlipMutation,
  useUpdateAttendanceMutation,
  useDeletePayrollMutation
} = payrollEndpoints;
