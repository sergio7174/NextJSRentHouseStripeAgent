import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { baseApi } from './baseApi';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', // Update with your backend URL
    prepareHeaders: (headers) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
          headers.set('authorization', `Bearer ${token}`);
        }
      }
      return headers;
    },
  }),
  endpoints: (builder) => ({
    // Equivalent to login(credentials)
    login: builder.mutation({
      query: (credentials) => ({
        url: '/api/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    // Equivalent to registerUser(postData, selectedFile) using FormData
    registerUser: builder.mutation({
      query: ({ postData, selectedFile, userChoice }) => {
        const uploadData = new FormData();
        uploadData.append('fullName', postData.fullName);
        uploadData.append('email', postData.email);
        uploadData.append('password', postData.password);
        uploadData.append('ide', postData.ide);
        uploadData.append('phoneNumber', postData.phoneNumber);
        uploadData.append('role', userChoice);
        if (selectedFile) {
          uploadData.append('image', selectedFile);
        }
        alert(`Im in authApi.ts - line 40 - User Choice: ${userChoice}`); // Debugging alert
        alert(`Im in authApi.ts - line 41 - user role: ${postData.role}`); // Debugging alert
        return {
          url: '/api/auth/signUp',
          method: 'POST',
          body: uploadData,
          // Note: When sending FormData, fetch automatically sets the correct multipart headers
        };
      },
    }),
    // Equivalent to registerUser(postData, selectedFile) using FormData
    registerUserByAdmin: builder.mutation({
      query: ({ postData, selectedFile, userChoice }) => {
        const uploadData = new FormData();
        uploadData.append('fullName', postData.fullName);
        uploadData.append('email', postData.email);
        uploadData.append('password', postData.password);
        uploadData.append('ide', postData.ide);
        uploadData.append('phoneNumber', postData.phoneNumber);
        uploadData.append('role', postData.role);
        if (selectedFile) {
          uploadData.append('image', selectedFile);
        }
        alert(`Im in authApi.ts - line 40 - User Choice: ${userChoice}`); // Debugging alert
        alert(`Im in authApi.ts - line 41 - user role: ${postData.role}`); // Debugging alert
        return {
          url: '/api/auth/signUp',
          method: 'POST',
          body: uploadData,
          // Note: When sending FormData, fetch automatically sets the correct multipart headers
        };
      },
    }),

    // Equivalent to getOneAdmin()
    getOneAdmin: builder.query({
      query: () => '/api/auth/getoneadmin',
    }),

  }),
  // Debugging alert

});

// Export hooks for usage in functional components
export const {
  useLoginMutation,
  useRegisterUserMutation,
  useRegisterUserByAdminMutation,
  useGetOneAdminQuery,
} = authApi;