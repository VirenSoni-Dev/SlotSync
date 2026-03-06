const API_BASE = "http://localhost:5000/api";

async function apiRequest(endpoint, method = "GET", data = null) {

   const options = {
      method,
      headers: {
         "Content-Type": "application/json"
      }
   };

   if (data) {
      options.body = JSON.stringify(data);
   }

   const res = await fetch(API_BASE + endpoint, options);

   return res.json();
}