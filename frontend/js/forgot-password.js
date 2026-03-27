// ============================================================
//  js/forgot-password.js
//  Two step flow:
//  Step 1 — user enters email → OTP sent
//  Step 2 — user enters OTP + new password → password reset
// ============================================================

import { postPublic } from './api.js';

// ── DOM refs — Step 1 ──
const stepEmail = document.getElementById('stepEmail');
const emailInput = document.getElementById('email');
const sendOtpBtn = document.getElementById('sendOtpBtn');
const sendOtpBtnText = document.getElementById('sendOtpBtnText');
const sendOtpBtnLoader = document.getElementById('sendOtpBtnLoader');
const emailStepError = document.getElementById('emailStepError');
const emailStepSuccess = document.getElementById('emailStepSuccess');
const emailError = document.getElementById('emailError');

// ── DOM refs — Step 2 ──
const stepReset = document.getElementById('stepReset');
const resetEmailEl = document.getElementById('resetEmail');
const otpBoxes = document.querySelectorAll('.otp-box');
const newPasswordInput = document.getElementById('newPassword');
const toggleNewPass = document.getElementById('toggleNewPassword');
const toggleNewIcon = document.getElementById('toggleNewIcon');
const newPasswordError = document.getElementById('newPasswordError');
const resetBtn = document.getElementById('resetBtn');
const resetBtnText = document.getElementById('resetBtnText');
const resetBtnLoader = document.getElementById('resetBtnLoader');
const resetStepError = document.getElementById('resetStepError');
const resetStepSuccess = document.getElementById('resetStepSuccess');
const resendTimer = document.getElementById('resendTimer');
const resendBtn = document.getElementById('resendBtn');
const countdownEl = document.getElementById('countdown');

// Stores the email between steps
let currentEmail = '';

// ============================================================
//  STEP 1 — Send OTP
// ============================================================

// Enter key on email input
emailInput.addEventListener('keydown', e => {
   if (e.key === 'Enter') sendOtpBtn.click();
});

sendOtpBtn.addEventListener('click', async () => {
   const email = emailInput.value.trim();

   // Validate email
   if (!email) {
      emailError.textContent = 'Email is required';
      return;
   }
   if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      emailError.textContent = 'Enter a valid email address';
      return;
   }
   emailError.textContent = '';

   // Show loader
   sendOtpBtnText.style.display = 'none';
   sendOtpBtnLoader.style.display = 'inline-block';
   sendOtpBtn.disabled = true;
   emailStepError.style.display = 'none';

   try {
      await postPublic('/auth/forgot-password', { email });

      currentEmail = email;

      emailStepSuccess.textContent = 'Reset code sent! Check your email.';
      emailStepSuccess.style.display = 'flex';

      // Small delay then switch to step 2
      setTimeout(() => {
         stepEmail.style.display = 'none';
         stepReset.style.display = 'block';
         resetEmailEl.textContent = currentEmail;
         startCountdown();
         otpBoxes[0].focus();
      }, 800);

   } catch (err) {
      // Backend always returns success for security
      // but show a generic message if something went wrong
      emailStepError.textContent = err.message || 'Something went wrong. Please try again.';
      emailStepError.style.display = 'flex';
   } finally {
      sendOtpBtnText.style.display = 'inline';
      sendOtpBtnLoader.style.display = 'none';
      sendOtpBtn.disabled = false;
   }
});

// ============================================================
//  STEP 2 — OTP box navigation (same as verify-otp.js)
// ============================================================

otpBoxes.forEach((box, index) => {
   box.addEventListener('input', () => {
      box.value = box.value.replace(/\D/g, '');
      if (box.value) {
         box.classList.add('filled');
         if (index < otpBoxes.length - 1) {
            otpBoxes[index + 1].focus();
         }
      } else {
         box.classList.remove('filled');
      }
   });

   box.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !box.value && index > 0) {
         otpBoxes[index - 1].focus();
         otpBoxes[index - 1].value = '';
         otpBoxes[index - 1].classList.remove('filled');
      }
   });

   box.addEventListener('paste', e => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      pasted.split('').forEach((char, i) => {
         if (otpBoxes[i]) {
            otpBoxes[i].value = char;
            otpBoxes[i].classList.add('filled');
         }
      });
      const lastIndex = Math.min(pasted.length, 5);
      otpBoxes[lastIndex].focus();
   });
});

function getOTP() {
   return Array.from(otpBoxes).map(b => b.value).join('');
}

function shakeBoxes() {
   otpBoxes.forEach(b => {
      b.classList.add('error');
      setTimeout(() => b.classList.remove('error'), 500);
   });
}

// ── Toggle new password visibility ──
toggleNewPass.addEventListener('click', () => {
   const isText = newPasswordInput.type === 'text';
   newPasswordInput.type = isText ? 'password' : 'text';
   toggleNewIcon.className = isText
      ? 'hgi hgi-stroke hgi-view-01'
      : 'hgi hgi-stroke hgi-view-off-slash';
});

// ============================================================
//  STEP 2 — Reset password submit
// ============================================================

resetBtn.addEventListener('click', async () => {
   const otp = getOTP();
   const newPassword = newPasswordInput.value;

   // Validate OTP
   if (otp.length < 6) {
      shakeBoxes();
      resetStepError.textContent = 'Please enter the complete 6-digit code.';
      resetStepError.style.display = 'flex';
      return;
   }

   // Validate new password
   if (!newPassword) {
      newPasswordError.textContent = 'New password is required';
      return;
   }
   if (newPassword.length < 8) {
      newPasswordError.textContent = 'Password must be at least 8 characters';
      return;
   }
   newPasswordError.textContent = '';

   // Show loader
   resetBtnText.style.display = 'none';
   resetBtnLoader.style.display = 'inline-block';
   resetBtn.disabled = true;
   resetStepError.style.display = 'none';

   try {
      await postPublic('/auth/reset-password', {
         email: currentEmail,
         otp_code: otp,
         new_password: newPassword
      });

      resetStepSuccess.textContent = 'Password reset! Redirecting to login...';
      resetStepSuccess.style.display = 'flex';

      setTimeout(() => { window.location.href = 'login.html'; }, 1500);

   } catch (err) {
      shakeBoxes();
      resetStepError.textContent = err.message || 'Reset failed. Please try again.';
      resetStepError.style.display = 'flex';
   } finally {
      resetBtnText.style.display = 'inline';
      resetBtnLoader.style.display = 'none';
      resetBtn.disabled = false;
   }
});

// ============================================================
//  Resend OTP countdown
// ============================================================

let countdown = 30;
let timer;

function startCountdown() {
   countdown = 30;
   countdownEl.textContent = countdown;
   resendTimer.style.display = 'inline';
   resendBtn.style.display = 'none';

   clearInterval(timer);
   timer = setInterval(() => {
      countdown--;
      countdownEl.textContent = countdown;
      if (countdown <= 0) {
         clearInterval(timer);
         resendTimer.style.display = 'none';
         resendBtn.style.display = 'inline-flex';
      }
   }, 1000);
}

resendBtn.addEventListener('click', async () => {
   resendBtn.disabled = true;
   resetStepError.style.display = 'none';

   try {
      await postPublic('/auth/forgot-password', { email: currentEmail });
      otpBoxes.forEach(b => { b.value = ''; b.classList.remove('filled'); });
      otpBoxes[0].focus();
      startCountdown();
   } catch (err) {
      resetStepError.textContent = err.message || 'Could not resend. Try again.';
      resetStepError.style.display = 'flex';
   } finally {
      resendBtn.disabled = false;
   }
});