import { appApi } from "./appApi";

/**
 * RTK Query endpoints for the Home screen (ShopSelector) and User Shop Profile.
 * These are cached so revisiting the home screen is instant — no re-fetch delay.
 * Data stays fresh for 5 minutes (keepUnusedDataFor from appApi = 120s, but we override).
 */
const homeEndpoints = appApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    // Fetch nearby/all public shops
    getPublicShops: builder.query({
      query: (location) => {
        if (location && location.lat && location.lng) {
          return { url: "/public/shops/nearby", params: { lat: location.lat, lng: location.lng } };
        }
        return { url: "/public/shops" };
      },
      transformResponse: (res) => (res?.success ? res.data : res?.data || []),
      providesTags: [{ type: "Shop", id: "PUBLIC_LIST" }],
      keepUnusedDataFor: 300, // 5 minutes cache
    }),

    // Fetch active banners
    getPublicBanners: builder.query({
      query: () => ({ url: "/banners/active" }),
      transformResponse: (res) => (res?.success ? res.data : []),
      providesTags: [{ type: "Banner", id: "PUBLIC_LIST" }],
      keepUnusedDataFor: 300,
    }),

    // Fetch public shop categories
    getPublicShopCategories: builder.query({
      query: () => ({ url: "/public/shop-categories" }),
      transformResponse: (res) => (res?.success ? res.data : []),
      providesTags: [{ type: "Category", id: "PUBLIC_SHOP_CATS" }],
      keepUnusedDataFor: 600, // 10 minutes cache — categories rarely change
    }),

    // Fetch user's bookings for Upcoming + Book Again sections
    getUserHomeBookings: builder.query({
      query: () => ({ url: "/appointments/my/global" }),
      transformResponse: (res) => (res?.success ? res.data : []),
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ _id }) => ({ type: "Appointment", id: _id })),
              { type: "Appointment", id: "HOME_BOOKINGS" },
            ]
          : [{ type: "Appointment", id: "HOME_BOOKINGS" }],
      keepUnusedDataFor: 180, // 3 minutes cache
    }),

    // Fetch user favorites list
    getUserFavorites: builder.query({
      query: () => ({ url: "/user/favorites" }),
      transformResponse: (res) => {
        if (res?.success && Array.isArray(res.data)) {
          return res.data.map((id) => id.toString());
        }
        return [];
      },
      keepUnusedDataFor: 300,
    }),

    // Fetch shop reviews (public)
    getShopReviews: builder.query({
      query: (shopSlug) => ({ url: "/reviews/public/shop" }),
      transformResponse: (res) => {
        if (res?.success) {
          return {
            reviews: res.data || [],
            avgRating: res.avgRating || 0,
            total: res.total || 0,
          };
        }
        return { reviews: [], avgRating: 0, total: 0 };
      },
      providesTags: [{ type: "Shop", id: "REVIEWS" }],
      keepUnusedDataFor: 120,
    }),

    // Submit a shop review
    submitShopReview: builder.mutation({
      query: (body) => ({ url: "/reviews", method: "POST", data: body }),
      invalidatesTags: [{ type: "Shop", id: "REVIEWS" }],
    }),

    // Toggle shop favorite
    toggleShopFavorite: builder.mutation({
      query: ({ shopId, isFavorite }) => ({
        url: `/user/favorites/${shopId}`,
        method: isFavorite ? "DELETE" : "POST",
      }),
      // Optimistic update for instant UI feedback
      async onQueryStarted({ shopId, isFavorite }, { dispatch, queryFulfilled }) {
        // We don't invalidate getUserFavorites here to avoid refetch flicker
        // The local state in the component handles the UI update
        try {
          await queryFulfilled;
        } catch {
          // If the mutation fails, the component will revert via its own error handling
        }
      },
    }),

    // Track shop view
    trackShopView: builder.mutation({
      query: ({ shopId, userId, deviceId }) => ({
        url: `/public/shops/${shopId}/view`,
        method: "POST",
        data: { userId, deviceId },
      }),
      // Don't invalidate anything - just track silently
    }),

    // Get recently viewed shops for current user
    getRecentlyViewedShops: builder.query({
      query: ({ userId, deviceId, limit = 10 }) => ({
        url: "/public/shops/recently-viewed",
        params: { userId, deviceId, limit },
      }),
      transformResponse: (res) => (res?.success ? res.data : []),
      providesTags: [{ type: "Shop", id: "RECENTLY_VIEWED" }],
      keepUnusedDataFor: 60, // 1 minute cache - refresh frequently
    }),

    // Get new to Vijayajalakam shops
    getNewToVijayajalakamShops: builder.query({
      query: (limit = 10) => ({
        url: "/public/shops/new-to-vijayajalakam",
        params: { limit },
      }),
      transformResponse: (res) => (res?.success ? res.data : []),
      providesTags: [{ type: "Shop", id: "NEW_SHOPS" }],
      keepUnusedDataFor: 300, // 5 minutes cache
    }),
  }),
});

export const {
  useGetPublicShopsQuery,
  useGetPublicBannersQuery,
  useGetPublicShopCategoriesQuery,
  useGetUserHomeBookingsQuery,
  useGetUserFavoritesQuery,
  useGetShopReviewsQuery,
  useSubmitShopReviewMutation,
  useToggleShopFavoriteMutation,
  useTrackShopViewMutation,
  useGetRecentlyViewedShopsQuery,
  useGetNewToVijayajalakamShopsQuery,
} = homeEndpoints;
