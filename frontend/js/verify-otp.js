const form = document.getElementById("otpForm");

form.addEventListener("submit", async (e) => {

   e.preventDefault();

   const otp = document.getElementById("otp").value;

   const res = await apiRequest("/auth/verify-otp", "POST", {
      otp
   });

   alert(res.message || "Verified");

   window.location.href = "login.html";

});