// ============================================================
//  js/register.js
//  Handles register form — validation, API call, redirect
// ============================================================

import { postPublic } from './api.js';

// ── DOM refs ──
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

// ── Redirect if already logged in ──
if (localStorage.getItem('token')) {
   window.location.href = 'services.html';
}

// ── Toggle password visibility ──
togglePassword.addEventListener('click', () => {
   const isText = passwordInput.type === 'text';
   passwordInput.type = isText ? 'password' : 'text';
   toggleIcon.className = isText
      ? 'hgi hgi-stroke hgi-view-01'
      : 'hgi hgi-stroke hgi-view-off-slash';
});

// ── Password strength checker ──
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

// ── Inline field validation ──
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

nameInput.addEventListener('blur', () =>
   validateField(nameInput, 'nameError', v =>
      !v ? 'Name is required' :
         v.length < 2 ? 'Name must be at least 2 characters' : ''
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
         v.length < 8 ? 'Password must be at least 8 characters' : ''
   )
);

// ── Submit ──
registerBtn.addEventListener('click', async () => {
   // Validate all fields
   const validName = validateField(nameInput, 'nameError', v => !v ? 'Required' : v.length < 2 ? 'Too short' : '');
   const validEmail = validateField(emailInput, 'emailError', v => !v ? 'Required' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Invalid email' : '');
   const validPhone = validateField(phoneInput, 'phoneError', v => !v ? 'Required' : !/^[0-9]{10}$/.test(v) ? 'Invalid phone' : '');
   const validPass = validateField(passwordInput, 'passwordError', v => !v ? 'Required' : v.length < 8 ? 'Min 8 characters' : '');

   if (!validName || !validEmail || !validPhone || !validPass) return;

   // Show loader
   registerBtnText.style.display = 'none';
   registerBtnLoader.style.display = 'inline-block';
   registerBtn.disabled = true;
   authError.style.display = 'none';

   try {
      await postPublic('/auth/register', {
         name: nameInput.value.trim(),
         email: emailInput.value.trim(),
         phone: phoneInput.value.trim(),
         password: passwordInput.value
      });

      // Save email so verify-otp page can show it
      sessionStorage.setItem('pendingEmail', emailInput.value.trim());
      sessionStorage.setItem('otpPurpose', 'register');

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