// ============================================================
//  js/api.js
//  Central fetch() wrapper used by every page
//
//  Instead of writing fetch() from scratch in each file,
//  all API calls go through these helper functions.
//  They automatically:
//    - prepend the base URL
//    - attach the JWT token to headers
//    - parse the JSON response
//    - throw errors for non-OK responses
// ============================================================

const BASE_URL = 'http://localhost:5000/api';

// ── Build headers for every request ──
function getHeaders(includeAuth = true) {
   const headers = { 'Content-Type': 'application/json' };
   if (includeAuth) {
      const token = localStorage.getItem('token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
   }
   return headers;
}

// ── Core fetch wrapper ──
async function request(method, endpoint, body = null, auth = true) {
   const options = {
      method,
      headers: getHeaders(auth),
   };
   if (body) options.body = JSON.stringify(body);

   const response = await fetch(`${BASE_URL}${endpoint}`, options);
   const data = await response.json();

   if (!response.ok) {
      // Throw the error message from backend
      throw new Error(data.message || 'Something went wrong');
   }

   return data;
}

// ── Exported helpers ──
export const getRequest = (endpoint) => request('GET', endpoint);
export const postRequest = (endpoint, body) => request('POST', endpoint, body);
export const putRequest = (endpoint, body) => request('PUT', endpoint, body);
export const deleteRequest = (endpoint) => request('DELETE', endpoint);

// Public requests (no auth token attached)
export const postPublic = (endpoint, body) => request('POST', endpoint, body, false);
export const getPublic = (endpoint) => request('GET', endpoint, null, false);