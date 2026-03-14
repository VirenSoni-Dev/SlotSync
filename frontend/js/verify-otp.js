// ============================================================
//  js/verify-otp.js
//  OTP verification — box navigation, auto-submit, resend timer
// ============================================================

import { postPublic } from './api.js';

// ── DOM refs ──
const otpBoxes = document.querySelectorAll('.otp-box');
const verifyBtn = document.getElementById('verifyBtn');
const verifyBtnText = document.getElementById('verifyBtnText');
const verifyBtnLoader = document.getElementById('verifyBtnLoader');
const authError = document.getElementById('authError');
const authSuccess = document.getElementById('authSuccess');
const otpEmailEl = document.getElementById('otpEmail');
const resendTimer = document.getElementById('resendTimer');
const resendBtn = document.getElementById('resendBtn');
const countdownEl = document.getElementById('countdown');

// ── Get email from sessionStorage (set by register.js) ──
const email = sessionStorage.getItem('pendingEmail');
const purpose = sessionStorage.getItem('otpPurpose') || 'register';

if (!email) {
   // No pending email — shouldn't be on this page
   window.location.href = 'register.html';
}

otpEmailEl.textContent = email;

// ── OTP box keyboard navigation ──
otpBoxes.forEach((box, index) => {
   box.addEventListener('input', (e) => {
      // Only allow digits
      box.value = box.value.replace(/\D/g, '');

      if (box.value) {
         box.classList.add('filled');
         // Move focus to next box
         if (index < otpBoxes.length - 1) {
            otpBoxes[index + 1].focus();
         } else {
            // Last box filled — auto submit
            verifyBtn.click();
         }
      } else {
         box.classList.remove('filled');
      }
   });

   box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && index > 0) {
         // Move focus back on backspace if box is empty
         otpBoxes[index - 1].focus();
         otpBoxes[index - 1].value = '';
         otpBoxes[index - 1].classList.remove('filled');
      }
   });

   // Handle paste — spread digits across boxes
   box.addEventListener('paste', (e) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
      pasted.split('').forEach((char, i) => {
         if (otpBoxes[i]) {
            otpBoxes[i].value = char;
            otpBoxes[i].classList.add('filled');
         }
      });
      // Focus last filled box
      const lastIndex = Math.min(pasted.length, 5);
      otpBoxes[lastIndex].focus();
      if (pasted.length === 6) verifyBtn.click();
   });
});

// ── Get OTP value from all boxes ──
function getOTP() {
   return Array.from(otpBoxes).map(b => b.value).join('');
}

// ── Mark boxes as error ──
function shakeBoxes() {
   otpBoxes.forEach(b => {
      b.classList.add('error');
      setTimeout(() => b.classList.remove('error'), 500);
   });
}

// ── Verify submit ──
verifyBtn.addEventListener('click', async () => {
   const otp = getOTP();

   if (otp.length < 6) {
      shakeBoxes();
      authError.textContent = 'Please enter the complete 6-digit code.';
      authError.style.display = 'flex';
      return;
   }

   verifyBtnText.style.display = 'none';
   verifyBtnLoader.style.display = 'inline-block';
   verifyBtn.disabled = true;
   authError.style.display = 'none';

   try {
      await postPublic('/auth/verify-otp', { email, otp_code: otp, purpose });

      authSuccess.textContent = 'Email verified! Redirecting to login...';
      authSuccess.style.display = 'flex';

      sessionStorage.removeItem('pendingEmail');
      sessionStorage.removeItem('otpPurpose');

      setTimeout(() => { window.location.href = 'login.html'; }, 1200);

   } catch (err) {
      shakeBoxes();
      authError.textContent = err.message || 'Invalid or expired code. Try again.';
      authError.style.display = 'flex';
   } finally {
      verifyBtnText.style.display = 'inline';
      verifyBtnLoader.style.display = 'none';
      verifyBtn.disabled = false;
   }
});

// ── Resend OTP countdown (30 seconds) ──
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
   authError.style.display = 'none';
   authSuccess.style.display = 'none';

   try {
      await postPublic('/auth/send-otp', { email, purpose });
      authSuccess.textContent = 'New code sent! Check your email.';
      authSuccess.style.display = 'flex';
      // Clear boxes
      otpBoxes.forEach(b => { b.value = ''; b.classList.remove('filled'); });
      otpBoxes[0].focus();
      startCountdown();
   } catch (err) {
      authError.textContent = err.message || 'Could not resend. Try again.';
      authError.style.display = 'flex';
   } finally {
      resendBtn.disabled = false;
   }
});

// ── Start timer on page load ──
startCountdown();
otpBoxes[0].focus();