// ============================================================
//  js/login.js
//  Handles login form — validation, API call, redirect by role
// ============================================================

import { postPublic } from './api.js';

// ── DOM refs ──
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const loginBtnText = document.getElementById('loginBtnText');
const loginBtnLoader = document.getElementById('loginBtnLoader');
const authError = document.getElementById('authError');
const authSuccess = document.getElementById('authSuccess');
const togglePassword = document.getElementById('togglePassword');
const toggleIcon = document.getElementById('toggleIcon');

// ── Redirect based on role ──
// Defined first so it can be used by the auto-redirect check below
function redirectByRole(role) {
   if (role === 'admin') {
      window.location.href = 'admin/dashboard.html';
   } else {
      window.location.href = 'services.html';
   }
}

// ── Redirect if already logged in ──
if (localStorage.getItem('token')) {
   const user = JSON.parse(localStorage.getItem('user') || '{}');
   redirectByRole(user.role);
}

// ── Toggle password visibility ──
togglePassword.addEventListener('click', () => {
   const isText = passwordInput.type === 'text';
   passwordInput.type = isText ? 'password' : 'text';
   toggleIcon.className = isText
      ? 'hgi hgi-stroke hgi-view-01'
      : 'hgi hgi-stroke hgi-view-off-slash';
});

// ── Inline validation ──
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

emailInput.addEventListener('blur', () =>
   validateField(emailInput, 'emailError', v =>
      !v ? 'Email is required' :
         !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Enter a valid email' : ''
   )
);

passwordInput.addEventListener('blur', () =>
   validateField(passwordInput, 'passwordError', v =>
      !v ? 'Password is required' : ''
   )
);

// ── Enter key submits form ──
[emailInput, passwordInput].forEach(el =>
   el.addEventListener('keydown', e => {
      if (e.key === 'Enter') loginBtn.click();
   })
);

// ── Submit ──
loginBtn.addEventListener('click', async () => {
   const validEmail = validateField(emailInput, 'emailError', v => !v ? 'Required' : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? 'Invalid email' : '');
   const validPass = validateField(passwordInput, 'passwordError', v => !v ? 'Required' : '');

   if (!validEmail || !validPass) return;

   // Show loader
   loginBtnText.style.display = 'none';
   loginBtnLoader.style.display = 'inline-block';
   loginBtn.disabled = true;
   authError.style.display = 'none';
   authSuccess.style.display = 'none';

   try {
      const res = await postPublic('/auth/login', {
         email: emailInput.value.trim(),
         password: passwordInput.value
      });

      // Save token + user info
      localStorage.setItem('token', res.data.accessToken);
      localStorage.setItem('user', JSON.stringify(res.data.user));

      authSuccess.textContent = 'Login successful! Redirecting...';
      authSuccess.style.display = 'flex';

      // Small delay so user sees the success message
      setTimeout(() => redirectByRole(res.data.user.role), 800);

   } catch (err) {
      // If account not verified → redirect to OTP page
      if (err.message?.toLowerCase().includes('not verified')) {
         sessionStorage.setItem('pendingEmail', emailInput.value.trim());
         sessionStorage.setItem('otpPurpose', 'register');
         window.location.href = 'verify-otp.html';
         return;
      }
      authError.textContent = err.message || 'Login failed. Please try again.';
      authError.style.display = 'flex';
   } finally {
      loginBtnText.style.display = 'inline';
      loginBtnLoader.style.display = 'none';
      loginBtn.disabled = false;
   }
});