// ============================================================
//  js/admin/bookings.js
//  Admin — view all bookings, filter, view detail, cancel
//  APIs: GET  /bookings/all
//        GET  /bookings/:id
//        PUT  /bookings/:id/cancel
//
//  getAllBookings returns per bookingModel.js JOIN aliases:
//    b.id, b.status, b.payment_status, b.created_at,
//    u.name AS user_name, u.email AS user_email,
//    s.service_name, s.price,
//    sl.date, sl.start_time, sl.end_time
//
//  getBookingById additionally returns:
//    u.id AS user_id, u.phone AS user_phone,
//    s.id AS service_id, s.duration_minutes,
//    sl.id AS slot_id, b.notes, b.reminder_sent
// ============================================================

import { getRequest, putRequest } from '../api.js';

// ── Auth guard: admin only ──
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
   window.location.href = '../login.html';
}
if (user.role !== 'admin') {
   window.location.href = '../services.html';
}

// ── Navbar ──
document.getElementById('navActions').innerHTML = `
   <a href="../profile.html" class="btn-ghost">${user.name?.split(' ')[0] || 'Admin'}</a>
   <button onclick="handleLogout()" class="btn-outline">Log out</button>
`;

window.handleLogout = function () {
   localStorage.removeItem('token');
   localStorage.removeItem('user');
   window.location.href = '../../index.html';
};

// ── Hamburger ──
document.getElementById('hamburger').addEventListener('click', () => {
   document.getElementById('navLinks').classList.toggle('open');
   document.getElementById('navActions').classList.toggle('open');
});

// ── State ──
let allBookings = [];
let selectedId = null;

// ── DOM ──
const bookingsLoading = document.getElementById('bookingsLoading');
const bookingsEmpty = document.getElementById('bookingsEmpty');
const bookingsEmptyMessage = document.getElementById('bookingsEmptyMessage');
const bookingsTableWrap = document.getElementById('bookingsTableWrap');
const bookingsTableBody = document.getElementById('bookingsTableBody');
const bookingCount = document.getElementById('bookingCount');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');
const dateFilter = document.getElementById('dateFilter');
const clearFiltersBtn = document.getElementById('clearFiltersBtn');

// Detail modal
const detailModal = document.getElementById('detailModal');
const detailContent = document.getElementById('detailContent');
const cancelBookingBtn = document.getElementById('cancelBookingBtn');
const cancelBookingText = document.getElementById('cancelBookingText');
const cancelBookingLoader = document.getElementById('cancelBookingLoader');

// ── Toast ──
function showToast(message, type = 'info') {
   const container = document.querySelector('.toast-container') || (() => {
      const el = document.createElement('div');
      el.className = 'toast-container';
      document.body.appendChild(el);
      return el;
   })();

   const toast = document.createElement('div');
   toast.className = `toast ${type}`;
   toast.textContent = message;
   container.appendChild(toast);
   setTimeout(() => toast.remove(), 3500);
}

// ── Helpers ──
function fmtDate(dateStr) {
   if (!dateStr) return '—';
   const d = new Date(dateStr + 'T00:00:00');
   return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtTime(timeStr) {
   if (!timeStr) return '—';
   const [h, m] = timeStr.split(':');
   const hour = parseInt(h);
   return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function fmtDateTime(dateStr) {
   if (!dateStr) return '—';
   return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
   });
}

function getStatusBadge(status) {
   const map = {
      confirmed: 'status-badge--confirmed',
      pending: 'status-badge--pending',
      completed: 'status-badge--completed',
      cancelled: 'status-badge--cancelled',
      failed: 'status-badge--failed',
   };
   return `<span class="status-badge ${map[status] || ''}">${status}</span>`;
}

function getPaymentBadge(status) {
   const map = {
      paid: 'status-badge--confirmed',
      pending: 'status-badge--pending',
      refunded: 'status-badge--completed',
      failed: 'status-badge--failed',
   };
   return `<span class="status-badge ${map[status] || ''}">${status}</span>`;
}

function setLoading(textEl, loaderEl, btn, loading) {
   btn.disabled = loading;
   textEl.style.display = loading ? 'none' : 'inline';
   loaderEl.style.display = loading ? 'inline-block' : 'none';
}

function canCancel(status) {
   return ['pending', 'confirmed'].includes(status);
}

// ── Render table ──
function renderTable(bookings) {
   bookingsLoading.style.display = 'none';

   bookingCount.textContent = `${bookings.length} result${bookings.length !== 1 ? 's' : ''}`;

   if (bookings.length === 0) {
      bookingsTableWrap.style.display = 'none';
      bookingsEmpty.style.display = 'block';
      bookingsEmptyMessage.textContent = (statusFilter.value || searchInput.value || dateFilter.value)
         ? 'No bookings match your filters.'
         : 'No bookings yet.';
      return;
   }

   bookingsEmpty.style.display = 'none';
   bookingsTableWrap.style.display = 'block';

   // getAllBookings fields: b.id, b.status, b.payment_status, b.created_at,
   // u.name AS user_name, u.email AS user_email,
   // s.service_name, s.price, sl.date, sl.start_time, sl.end_time
   bookingsTableBody.innerHTML = bookings.map(b => `
      <tr>
         <td class="td-muted">#${b.id}</td>
         <td>
            <div class="td-primary">${b.user_name}</div>
            <div class="td-sub">${b.user_email}</div>
         </td>
         <td>${b.service_name}</td>
         <td>${fmtDate(b.date)}</td>
         <td>${fmtTime(b.start_time)}</td>
         <td>₹${Number(b.price).toLocaleString('en-IN')}</td>
         <td>${getStatusBadge(b.status)}</td>
         <td>${getPaymentBadge(b.payment_status)}</td>
         <td>
            <div class="row-actions">
               <button class="btn-row-action" title="View details" onclick="openDetailModal(${b.id})">
                  <i class="hgi hgi-stroke hgi-view-01"></i>
               </button>
               ${canCancel(b.status) ? `
               <button class="btn-row-action btn-row-action--danger" title="Cancel booking" onclick="quickCancel(${b.id})">
                  <i class="hgi hgi-stroke hgi-cancel-01"></i>
               </button>` : ''}
            </div>
         </td>
      </tr>
   `).join('');
}

// ── Apply filters ──
function applyFilters() {
   const q = searchInput.value.trim().toLowerCase();
   const status = statusFilter.value;
   const date = dateFilter.value;

   const filtered = allBookings.filter(b => {
      const matchQ = !q ||
         b.user_name.toLowerCase().includes(q) ||
         b.user_email.toLowerCase().includes(q);
      const matchStatus = !status || b.status === status;
      // sl.date comes back as a date string YYYY-MM-DD
      const matchDate = !date || (b.date && b.date.startsWith(date));

      return matchQ && matchStatus && matchDate;
   });

   renderTable(filtered);
}

searchInput.addEventListener('input', applyFilters);
statusFilter.addEventListener('change', applyFilters);
dateFilter.addEventListener('change', applyFilters);

clearFiltersBtn.addEventListener('click', () => {
   searchInput.value = '';
   statusFilter.value = '';
   dateFilter.value = '';
   applyFilters();
});

// ── Load all bookings ──
async function loadBookings() {
   bookingsLoading.style.display = 'block';
   bookingsEmpty.style.display = 'none';
   bookingsTableWrap.style.display = 'none';

   try {
      const res = await getRequest('/bookings/all');
      allBookings = res.data || [];
      applyFilters();
   } catch (err) {
      bookingsLoading.style.display = 'none';
      bookingsEmpty.style.display = 'block';
      bookingsEmptyMessage.textContent = err.message || 'Could not load bookings.';
   }
}

// ── Detail modal ──
window.openDetailModal = async function (id) {
   selectedId = id;
   cancelBookingBtn.style.display = 'none';
   detailContent.innerHTML = `
      <div class="admin-loading">
         <div class="loader-spinner"></div>
         <p>Loading…</p>
      </div>`;
   detailModal.style.display = 'flex';

   try {
      const res = await getRequest(`/bookings/${id}`);
      // getBookingById fields:
      // b.id, b.status, b.payment_status, b.notes, b.reminder_sent, b.created_at,
      // u.id AS user_id, u.name AS user_name, u.email AS user_email, u.phone AS user_phone,
      // s.id AS service_id, s.service_name, s.price, s.duration_minutes,
      // sl.id AS slot_id, sl.date, sl.start_time, sl.end_time
      const b = res.data;

      detailContent.innerHTML = `
         <div class="detail-grid">
            ${detailRow('📋', 'Booking ID', `#${b.id}`)}
            ${detailRow('👤', 'Customer', `${b.user_name}<br><span class="td-sub">${b.user_email}</span><br><span class="td-sub">${b.user_phone || '—'}</span>`)}
            ${detailRow('🛎️', 'Service', `${b.service_name} <span class="td-sub">(${b.duration_minutes} min)</span>`)}
            ${detailRow('📅', 'Slot Date', fmtDate(b.date))}
            ${detailRow('🕐', 'Time', `${fmtTime(b.start_time)} – ${fmtTime(b.end_time)}`)}
            ${detailRow('💰', 'Price', `₹${Number(b.price).toLocaleString('en-IN')}`)}
            ${detailRow('🏷️', 'Booking Status', getStatusBadge(b.status))}
            ${detailRow('💳', 'Payment Status', getPaymentBadge(b.payment_status))}
            ${b.notes ? detailRow('📝', 'Notes', b.notes) : ''}
            ${detailRow('🕒', 'Booked At', fmtDateTime(b.created_at))}
         </div>`;

      if (canCancel(b.status)) {
         cancelBookingBtn.style.display = 'inline-flex';
      }

   } catch (err) {
      detailContent.innerHTML = `
         <div class="admin-empty">
            <div class="empty-icon">⚠️</div>
            <p>${err.message || 'Could not load booking details.'}</p>
         </div>`;
   }
};

function detailRow(icon, label, value) {
   return `
      <div class="detail-row">
         <span class="detail-label">${icon} ${label}</span>
         <span class="detail-value">${value}</span>
      </div>`;
}

function closeDetailModal() {
   detailModal.style.display = 'none';
   selectedId = null;
}

document.getElementById('closeDetailModalBtn').addEventListener('click', closeDetailModal);
document.getElementById('closeDetailBtn').addEventListener('click', closeDetailModal);
detailModal.addEventListener('click', e => {
   if (e.target === detailModal) closeDetailModal();
});

// ── Cancel from detail modal ──
cancelBookingBtn.addEventListener('click', async () => {
   if (!selectedId) return;
   await cancelBooking(selectedId);
   closeDetailModal();
});

// ── Quick cancel from table row ──
window.quickCancel = async function (id) {
   if (!confirm('Cancel this booking?')) return;
   await cancelBooking(id);
};

async function cancelBooking(id) {
   setLoading(cancelBookingText, cancelBookingLoader, cancelBookingBtn, true);
   try {
      await putRequest(`/bookings/${id}/cancel`, {});
      showToast('Booking cancelled successfully.', 'success');
      await loadBookings();
   } catch (err) {
      showToast(err.message || 'Failed to cancel booking.', 'error');
   } finally {
      setLoading(cancelBookingText, cancelBookingLoader, cancelBookingBtn, false);
   }
}

// ── Init ──
loadBookings();