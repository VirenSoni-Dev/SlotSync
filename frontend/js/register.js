const form = document.getElementById("registerForm");

form.addEventListener("submit", async (e) => {

   e.preventDefault();

   const name = document.getElementById("name").value;
   const email = document.getElementById("email").value;
   const password = document.getElementById("password").value;

   const res = await apiRequest("/auth/register", "POST", {
      name,
      email,
      password
   });

   alert(res.message || "Registered");

   window.location.href = "verify-otp.html";
});