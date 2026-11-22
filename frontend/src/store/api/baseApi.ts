
import {
  createApi,
  fetchBaseQuery,
} from "@reduxjs/toolkit/query/react";

// Backend root URL, without the /api suffix.
// Example: http://localhost:3000
const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:3001";

export const baseApi = createApi({
  reducerPath: "api",

  baseQuery: fetchBaseQuery({
    baseUrl: API_URL,

    prepareHeaders: (headers, { getState }) => {
      const state = getState() as {
        auth?: { token?: string | null };
        user?: { token?: string | null };
      };

      // Adapt this selector to the actual location of your
      // authentication token in Redux.
      const token =
        state.auth?.token ??
        state.user?.token;

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      // Do not manually set Content-Type here.
      // fetchBaseQuery must generate the multipart boundary
      // automatically when sending FormData.

      return headers;
    },
  }),

  tagTypes: [
    "Auth",
    "Booking",
    "House",
    "Dashboard",
    "Maintenance",
    "User",
  ],

  endpoints: () => ({}),
});
