// ============================================================
//  js/business-register.js
//  Business registration — hits POST /api/auth/registerAdmin
//  After success → same verify-otp.html flow as customers,
//  then on login the admin role routes to dashboard.html
// ============================================================

import { postPublic } from './api.js';

// ── Redirect if already logged in ──
if (localStorage.getItem('token')) {
   const user = JSON.parse(localStorage.getItem('user') || '{}');
   window.location.href = user.role === 'admin'
      ? 'admin/dashboard.html'
      : 'services.html';
}

// ── DOM refs ──
const businessNameInput = document.getElementById('businessName');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const phoneInput = document.getElementById('phone');
const passwordInput = document.getElementById('password');
const registerBtn = document.getElementById('registerBtn');
const registerBtnText = document.getElementById('registerBtnText');
const registerBtnLoader = document.getElementById('registerBtnLoader');
const authError = document.getElementById('authError');
const togglePassword = document.getElementById('togglePassword');
const toggleIcon = document.getElementById('toggleIcon');
const strengthFill = document.getElementById('strengthFill');
const strengthLabel = document.getElementById('strengthLabel');

// ── Toggle password visibility ──
togglePassword.addEventListener('click', () => {
   const isText = passwordInput.type === 'text';
   passwordInput.type = isText ? 'password' : 'text';
   toggleIcon.className = isText
      ? 'hgi hgi-stroke hgi-view-01'
      : 'hgi hgi-stroke hgi-view-off-slash';
});

// ── Password strength ──
passwordInput.addEventListener('input', () => {
   const val = passwordInput.value;
   let score = 0;
   if (val.length >= 8) score++;
   if (/[A-Z]/.test(val)) score++;
   if (/[0-9]/.test(val)) score++;
   if (/[^A-Za-z0-9]/.test(val)) score++;

   const colors = ['', '#f87171', '#fbbf24', '#a78bfa', '#22d3a5'];
   const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
   const widths = ['0%', '25%', '50%', '75%', '100%'];

   strengthFill.style.width = val.length ? widths[score] : '0%';
   strengthFill.style.background = colors[score];
   strengthLabel.textContent = val.length ? labels[score] : '';
});

// ── Phone — numbers only ──
phoneInput.addEventListener('input', () => {
   phoneInput.value = phoneInput.value.replace(/\D/g, '');
});

// ── Inline validation helper ──
function validateField(input, errorId, validator) {
   const errorEl = document.getElementById(errorId);
   const wrap = input.closest('.field-input-wrap');
   const msg = validator(input.value.trim());

   if (msg) {
      errorEl.textContent = msg;
      wrap?.classList.add('error');
      wrap?.classList.remove('success');
      return false;
   }
   errorEl.textContent = '';
   wrap?.classList.remove('error');
   wrap?.classList.add('success');
   return true;
}

// ── Blur validators ──
businessNameInput.addEventListener('blur', () =>
   validateField(businessNameInput, 'businessNameError', v =>
      !v ? 'Business name is required' :
         v.length < 2 ? 'Must be at least 2 characters' : ''
   )
);

nameInput.addEventListener('blur', () =>
   validateField(nameInput, 'nameError', v =>
      !v ? 'Owner name is required' :
         v.length < 2 ? 'Must be at least 2 characters' : ''
   )
);

emailInput.addEventListener('blur', () =>
   validateField(emailInput, 'emailError', v =>
      !v ? 'Email is required' :
         !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Enter a valid email' : ''
   )
);

phoneInput.addEventListener('blur', () =>
   validateField(phoneInput, 'phoneError', v =>
      !v ? 'Phone is required' :
         !/^[0-9]{10}$/.test(v) ? 'Enter a valid 10-digit number' : ''
   )
);

passwordInput.addEventListener('blur', () =>
   validateField(passwordInput, 'passwordError', v =>
      !v ? 'Password is required' :
         v.length < 8 ? 'Must be at least 8 characters' : ''
   )
);

// ── Submit ──
registerBtn.addEventListener('click', async () => {
   const validBusiness = validateField(businessNameInput, 'businessNameError', v =>
      !v ? 'Required' : v.length < 2 ? 'Too short' : '');
   const validName = validateField(nameInput, 'nameError', v =>
      !v ? 'Required' : v.length < 2 ? 'Too short' : '');
   const validEmail = validateField(emailInput, 'emailError', v =>
      !v ? 'Required' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Invalid email' : '');
   const validPhone = validateField(phoneInput, 'phoneError', v =>
      !v ? 'Required' : !/^[0-9]{10}$/.test(v) ? 'Invalid phone' : '');
   const validPass = validateField(passwordInput, 'passwordError', v =>
      !v ? 'Required' : v.length < 8 ? 'Min 8 characters' : '');

   if (!validBusiness || !validName || !validEmail || !validPhone || !validPass) return;

   registerBtnText.style.display = 'none';
   registerBtnLoader.style.display = 'inline-block';
   registerBtn.disabled = true;
   authError.style.display = 'none';

   try {
      await postPublic('/auth/registerAdmin', {
         name: nameInput.value.trim(),
         email: emailInput.value.trim(),
         phone: phoneInput.value.trim(),
         password: passwordInput.value,
      });

      // Store for verify-otp page
      sessionStorage.setItem('pendingEmail', emailInput.value.trim());
      sessionStorage.setItem('otpPurpose', 'register');
      // Store business name so it can be saved to business_profile
      // after the admin logs in for the first time
      sessionStorage.setItem('pendingBusinessName', businessNameInput.value.trim());

      window.location.href = 'verify-otp.html';

   } catch (err) {
      authError.textContent = err.message || 'Registration failed. Please try again.';
      authError.style.display = 'flex';
   } finally {
      registerBtnText.style.display = 'inline';
      registerBtnLoader.style.display = 'none';
      registerBtn.disabled = false;
   }
});