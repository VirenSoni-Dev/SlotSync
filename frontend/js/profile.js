import { getRequest, postRequest, putRequest } from './api.js';

// ── Auth guard: redirect to login if no token ──
const token = localStorage.getItem('token');
if (!token) {
   sessionStorage.setItem('redirectAfterLogin', window.location.href);
   window.location.href = '/pages/login.html';
}

// ── Cached user from localStorage (fast paint) ──
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');

// ── DOM refs ──
const profileAvatar = document.getElementById('profileAvatar');
const avatarInitials = document.getElementById('avatarInitials');
const profileName = document.getElementById('profileName');
const profileRole = document.getElementById('profileRole');
const profileSince = document.getElementById('profileSince');

// Info card — view mode
const viewName = document.getElementById('viewName');
const viewEmail = document.getElementById('viewEmail');
const viewPhone = document.getElementById('viewPhone');

// Info card — edit mode
const editInfoBtn = document.getElementById('editInfoBtn');
const cancelInfoBtn = document.getElementById('cancelInfoBtn');
const infoView = document.getElementById('infoView');
const infoForm = document.getElementById('infoForm');
const editNameInput = document.getElementById('editName');
const editPhoneInput = document.getElementById('editPhone');
const nameError = document.getElementById('nameError');
const phoneError = document.getElementById('phoneError');
const saveInfoBtn = document.getElementById('saveInfoBtn');
const infoMessage = document.getElementById('infoMessage');

// Account card
const roleBadge = document.getElementById('roleBadge');
const accountSince = document.getElementById('accountSince');

// Password card
const passwordForm = document.getElementById('passwordForm');
const currentPwInput = document.getElementById('currentPassword');
const newPwInput = document.getElementById('newPassword');
const confirmPwInput = document.getElementById('confirmPassword');
const currentPwError = document.getElementById('currentPwError');
const newPwError = document.getElementById('newPwError');
const confirmPwError = document.getElementById('confirmPwError');
const changePwBtn = document.getElementById('changePwBtn');
const passwordMessage = document.getElementById('passwordMessage');

// Logout
const logoutBtn = document.getElementById('logoutBtn');

// ============================================================
//  Helpers
// ============================================================

const formatDate = (dateStr) => {
   if (!dateStr) return '—';
   return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric'
   });
};

const getInitials = (name = '') => {
   return name.trim().split(' ')
      .map(w => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
};

const showMessage = (el, text, type = 'success') => {
   el.textContent = text;
   el.className = `form-message ${type}`;
   el.classList.remove('hidden');
   setTimeout(() => {
      el.classList.add('hidden');
      el.textContent = '';
   }, 4000);
};

const setLoading = (btn, loading) => {
   const text = btn.querySelector('.btn-text');
   const loader = btn.querySelector('.btn-loader');
   if (!text || !loader) return;
   btn.disabled = loading;
   text.classList.toggle('hidden', loading);
   loader.classList.toggle('hidden', !loading);
};

const clearErrors = (...errorEls) => {
   errorEls.forEach(el => { if (el) el.textContent = ''; });
};

// ============================================================
//  Populate UI
// ============================================================

const populateUI = (user) => {
   if (!user) return;

   const initials = getInitials(user.name);
   avatarInitials.textContent = initials;
   profileName.textContent = user.name || '—';
   profileRole.textContent = user.role || '—';
   profileSince.textContent = formatDate(user.created_at);

   viewName.textContent = user.name || '—';
   viewEmail.textContent = user.email || '—';
   viewPhone.textContent = user.phone || '—';

   roleBadge.textContent = user.role || '—';
   accountSince.textContent = formatDate(user.created_at);
};

// ============================================================
//  Fetch profile
// ============================================================

const loadProfile = async () => {
   if (currentUser) populateUI(currentUser);

   try {
      const data = await getRequest('/auth/profile');
      const user = data?.data?.user || data?.user;

      if (user) {
         currentUser = user;
         localStorage.setItem('user', JSON.stringify(user));
         populateUI(user);
      }
   } catch (err) {
      console.error('Profile load error:', err);
   }
};

// ============================================================
//  Edit / Cancel
// ============================================================

editInfoBtn.addEventListener('click', () => {
   editNameInput.value = currentUser?.name || '';
   editPhoneInput.value = currentUser?.phone || '';
   clearErrors(nameError, phoneError);
   infoMessage.classList.add('hidden');

   infoView.classList.add('hidden');
   infoForm.classList.remove('hidden');
   editInfoBtn.classList.add('hidden');
});

cancelInfoBtn.addEventListener('click', () => {
   infoForm.classList.add('hidden');
   infoView.classList.remove('hidden');
   editInfoBtn.classList.remove('hidden');
   clearErrors(nameError, phoneError);
   infoMessage.classList.add('hidden');
});

// ============================================================
//  Save Profile
// ============================================================

const validateInfoForm = () => {
   let valid = true;
   clearErrors(nameError, phoneError);

   const name = editNameInput.value.trim();
   const phone = editPhoneInput.value.trim();

   if (!name) {
      nameError.textContent = 'Name is required.';
      valid = false;
   } else if (name.length < 2) {
      nameError.textContent = 'Name must be at least 2 characters.';
      valid = false;
   }

   if (!phone) {
      phoneError.textContent = 'Phone number is required.';
      valid = false;
   } else if (!/^\d{10}$/.test(phone)) {
      phoneError.textContent = 'Enter a valid 10-digit phone number.';
      valid = false;
   }

   return valid;
};

infoForm.addEventListener('submit', async (e) => {
   e.preventDefault();
   if (!validateInfoForm()) return;

   setLoading(saveInfoBtn, true);
   infoMessage.classList.add('hidden');

   try {
      const body = {
         name: editNameInput.value.trim(),
         phone: editPhoneInput.value.trim()
      };

      const data = await putRequest('/auth/profile', body);

      const updatedUser = data?.data?.user || data?.user;
      if (updatedUser) {
         currentUser = updatedUser;
         localStorage.setItem('user', JSON.stringify(updatedUser));
         populateUI(updatedUser);
      }

      infoForm.classList.add('hidden');
      infoView.classList.remove('hidden');
      editInfoBtn.classList.remove('hidden');

      showMessage(infoMessage, '✅ Profile updated successfully!', 'success');

   } catch (err) {
      const msg = err?.message || 'Failed to update profile. Please try again.';
      showMessage(infoMessage, msg, 'error');
   } finally {
      setLoading(saveInfoBtn, false);
   }
});

// ============================================================
//  Change Password
// ============================================================

const validatePasswordForm = () => {
   let valid = true;
   clearErrors(currentPwError, newPwError, confirmPwError);

   const current = currentPwInput.value;
   const next = newPwInput.value;
   const confirm = confirmPwInput.value;

   if (!current) {
      currentPwError.textContent = 'Current password is required.';
      valid = false;
   }

   if (!next) {
      newPwError.textContent = 'New password is required.';
      valid = false;
   } else if (next.length < 8) {
      newPwError.textContent = 'Password must be at least 8 characters.';
      valid = false;
   }

   if (!confirm) {
      confirmPwError.textContent = 'Please confirm your new password.';
      valid = false;
   } else if (next && confirm !== next) {
      confirmPwError.textContent = 'Passwords do not match.';
      valid = false;
   }

   return valid;
};

passwordForm.addEventListener('submit', async (e) => {
   e.preventDefault();
   if (!validatePasswordForm()) return;

   setLoading(changePwBtn, true);
   passwordMessage.classList.add('hidden');

   try {
      await putRequest('/auth/change-password', {
         currentPassword: currentPwInput.value,
         newPassword: newPwInput.value
      });

      currentPwInput.value = '';
      newPwInput.value = '';
      confirmPwInput.value = '';

      showMessage(passwordMessage, '✅ Password changed successfully!', 'success');

   } catch (err) {
      const msg = err?.message || 'Failed to change password. Please try again.';
      showMessage(passwordMessage, msg, 'error');
   } finally {
      setLoading(changePwBtn, false);
   }
});

// ============================================================
//  Password toggle
// ============================================================

document.querySelectorAll('.toggle-pw').forEach(btn => {
   btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      const icon = btn.querySelector('i');

      if (input.type === 'password') {
         input.type = 'text';
         icon.classList.replace('hgi-view-01', 'hgi-view-off-slash');
      } else {
         input.type = 'password';
         icon.classList.replace('hgi-view-off-slash', 'hgi-view-01');
      }
   });
});

// ============================================================
//  Logout
// ============================================================

logoutBtn.addEventListener('click', async () => {
   try {
      await postRequest('/auth/logout');
   } catch (_) { }
   localStorage.removeItem('token');
   localStorage.removeItem('user');
   window.location.href = '/pages/login.html';
});

// ============================================================
//  Init
// ============================================================

loadProfile();