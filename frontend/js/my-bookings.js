// ============================================================
//  js/my-bookings.js
//  Customer dashboard — view, filter and cancel bookings
// ============================================================

import { getRequest, putRequest } from './api.js';

// ── Auth guard ──
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
   window.location.href = 'login.html';
}
if (user.role === 'admin') {
   window.location.href = 'admin/dashboard.html';
}

// ── DOM refs ──
const bookingsLoading = document.getElementById('bookingsLoading');
const bookingsList = document.getElementById('bookingsList');
const bookingsEmpty = document.getElementById('bookingsEmpty');
const emptyMessage = document.getElementById('emptyMessage');
const filterTabs = document.getElementById('filterTabs');
const cancelModal = document.getElementById('cancelModal');
const cancelModalClose = document.getElementById('cancelModalClose');
const cancelModalConfirm = document.getElementById('cancelModalConfirm');
const cancelConfirmText = document.getElementById('cancelConfirmText');
const cancelConfirmLoader = document.getElementById('cancelConfirmLoader');

// ── State ──
let allBookings = [];
let activeFilter = 'all';
let bookingToCancel = null;

// ── Navbar ──
document.getElementById('navActions').innerHTML = `
   <a href="profile.html" class="btn-primary">${user.name?.split(' ')[0] || 'Profile'}</a>
`;

// ── Helpers ──
function formatDate(dateStr) {
   const d = new Date(dateStr + 'T00:00:00');
   return {
      day: d.getDate(),
      month: d.toLocaleString('en-IN', { month: 'short' }),
      full: d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
   };
}

function formatTime(timeStr) {
   const [h, m] = timeStr.split(':');
   const hour = parseInt(h);
   const ampm = hour >= 12 ? 'PM' : 'AM';
   const hour12 = hour % 12 || 12;
   return `${hour12}:${m} ${ampm}`;
}

function getStatusBadge(status) {
   const map = {
      confirmed: { label: '✅ Confirmed', cls: 'status-confirmed' },
      pending: { label: '⏳ Pending', cls: 'status-pending' },
      completed: { label: '🏁 Completed', cls: 'status-completed' },
      cancelled: { label: '❌ Cancelled', cls: 'status-cancelled' },
      failed: { label: '❌ Failed', cls: 'status-failed' }
   };
   return map[status] || { label: status, cls: '' };
}

function canCancel(status) {
   return ['confirmed', 'pending'].includes(status);
}

// ── Render bookings ──
function renderBookings(bookings) {
   if (bookings.length === 0) {
      bookingsList.style.display = 'none';
      bookingsEmpty.style.display = 'block';
      emptyMessage.textContent = activeFilter === 'all'
         ? "You haven't made any bookings yet."
         : `No ${activeFilter} bookings found.`;
      return;
   }

   bookingsEmpty.style.display = 'none';
   bookingsList.style.display = 'flex';

   bookingsList.innerHTML = bookings.map((b, i) => {
      const date = formatDate(b.date);
      const badge = getStatusBadge(b.status);
      const payBadge = b.payment_status === 'paid'
         ? `<span class="booking-meta-item"><i class="hgi hgi-stroke hgi-check-list-02"></i> Paid ₹${b.price}</span>`
         : `<span class="booking-meta-item"><i class="hgi hgi-stroke hgi-clock-01"></i> ${b.payment_status}</span>`;

      return `
         <div class="booking-card" style="animation-delay: ${i * 0.05}s">
            <div class="booking-date-col">
               <div class="booking-day">${date.day}</div>
               <div class="booking-month">${date.month}</div>
            </div>
            <div class="booking-info">
               <div class="booking-top">
                  <span class="booking-service-name">${b.service_name}</span>
                  <span class="booking-status-badge ${badge.cls}">${badge.label}</span>
               </div>
               <div class="booking-meta">
                  <span class="booking-meta-item">
                     <i class="hgi hgi-stroke hgi-clock-01"></i>
                     ${formatTime(b.start_time)}
                  </span>
                  <span class="booking-meta-item">
                     <i class="hgi hgi-stroke hgi-calendar-02"></i>
                     ${date.full}
                  </span>
                  ${payBadge}
               </div>
            </div>
            <div class="booking-actions">
               ${canCancel(b.status) ? `
                  <button class="btn-cancel" data-id="${b.id}">Cancel</button>
               ` : ''}
               <a href="book.html?service=${b.service_id}" class="btn-rebook">Book Again</a>
            </div>
         </div>
      `;
   }).join('');

   // Attach cancel listeners
   bookingsList.querySelectorAll('.btn-cancel').forEach(btn => {
      btn.addEventListener('click', () => {
         bookingToCancel = btn.dataset.id;
         cancelModal.style.display = 'flex';
      });
   });
}

// ── Filter ──
function applyFilter(filter) {
   activeFilter = filter;
   const filtered = filter === 'all'
      ? allBookings
      : allBookings.filter(b => b.status === filter);
   renderBookings(filtered);
}

// ── Filter tabs ──
filterTabs.querySelectorAll('.filter-tab').forEach(tab => {
   tab.addEventListener('click', () => {
      filterTabs.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      applyFilter(tab.dataset.filter);
   });
});

// ── Cancel modal ──
cancelModalClose.addEventListener('click', () => {
   cancelModal.style.display = 'none';
   bookingToCancel = null;
});

cancelModalConfirm.addEventListener('click', async () => {
   if (!bookingToCancel) return;

   cancelConfirmText.style.display = 'none';
   cancelConfirmLoader.style.display = 'inline-block';
   cancelModalConfirm.disabled = true;

   try {
      await putRequest(`/bookings/${bookingToCancel}/cancel`, {});

      // Update local state
      const booking = allBookings.find(b => b.id == bookingToCancel);
      if (booking) booking.status = 'cancelled';

      cancelModal.style.display = 'none';
      bookingToCancel = null;
      applyFilter(activeFilter);

   } catch (err) {
      alert(err.message || 'Could not cancel booking. Try again.');
   } finally {
      cancelConfirmText.style.display = 'inline';
      cancelConfirmLoader.style.display = 'none';
      cancelModalConfirm.disabled = false;
   }
});

// Close modal on overlay click
cancelModal.addEventListener('click', e => {
   if (e.target === cancelModal) {
      cancelModal.style.display = 'none';
      bookingToCancel = null;
   }
});

// ── Fetch bookings ──
async function loadBookings() {
   try {
      const res = await getRequest('/bookings/my');
      allBookings = res.data || [];

      bookingsLoading.style.display = 'none';
      applyFilter('all');

   } catch (err) {
      bookingsLoading.style.display = 'none';
      bookingsEmpty.style.display = 'block';
      emptyMessage.textContent = 'Could not load bookings. Make sure you are logged in.';
   }
}

// ── Hamburger ──
document.getElementById('hamburger').addEventListener('click', () => {
   document.getElementById('navLinks').classList.toggle('open');
   document.getElementById('navActions').classList.toggle('open');
});

// ── Init ──
loadBookings();