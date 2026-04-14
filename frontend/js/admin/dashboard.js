// ============================================================
//  js/admin/dashboard.js
//  Admin dashboard — stats, revenue chart, peak hours,
//  recent bookings, popular services
//
//  APIs used:
//    GET /admin/analytics
//    GET /admin/revenue-by-day
//    GET /admin/peak-hours
//    GET /admin/recent-bookings
//    GET /admin/popular-services
// ============================================================

import { getRequest } from '../api.js';

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

// ── Helpers ──
function fmtINR(val) {
   return '₹' + Number(val || 0).toLocaleString('en-IN');
}

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

// ── 1. Analytics stat cards ──
async function loadAnalytics() {
   try {
      const res = await getRequest('/admin/analytics');
      const d = res.data;

      document.getElementById('valTotalBookings').textContent = Number(d.total_bookings).toLocaleString('en-IN');
      document.getElementById('valConfirmed').textContent = Number(d.confirmed_bookings).toLocaleString('en-IN');
      document.getElementById('valRevenue').textContent = fmtINR(d.total_revenue);
      document.getElementById('valMonthly').textContent = fmtINR(d.monthly_revenue);
      document.getElementById('valCustomers').textContent = Number(d.total_customers).toLocaleString('en-IN');
      document.getElementById('valServices').textContent = Number(d.total_services).toLocaleString('en-IN');

      // Animate cards in once data arrives
      document.querySelectorAll('.stat-card').forEach((card, i) => {
         card.style.animationDelay = `${i * 60}ms`;
         card.classList.add('stat-card--loaded');
      });
   } catch (err) {
      // Leave values as — on failure; non-critical
      console.error('Analytics error:', err.message);
   }
}

// ── 2. Revenue chart (Chart.js) ──
async function loadRevenueChart() {
   const loading = document.getElementById('revenueChartLoading');
   const canvas = document.getElementById('revenueChart');
   const empty = document.getElementById('revenueChartEmpty');
   const meta = document.getElementById('revenueChartMeta');

   try {
      const res = await getRequest('/admin/revenue-by-day');
      const rows = res.data || [];

      loading.style.display = 'none';

      if (!rows.length) {
         empty.style.display = 'block';
         return;
      }

      // Summarise for meta label
      const totalRev = rows.reduce((s, r) => s + Number(r.revenue), 0);
      meta.textContent = fmtINR(totalRev) + ' total';

      canvas.style.display = 'block';

      // Build labels & dataset — fill gaps so the line is continuous
      const labels = rows.map(r => {
         const d = new Date(r.date);
         return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      });
      const values = rows.map(r => Number(r.revenue));

      // Chart.js theme colours pulled from CSS variables
      const accent = '#6c63ff';
      const accentA = 'rgba(108, 99, 255, 0.15)';
      const gridClr = 'rgba(255, 255, 255, 0.06)';
      const textClr = '#a0a0b8';

      new Chart(canvas, {
         type: 'line',
         data: {
            labels,
            datasets: [{
               label: 'Revenue (₹)',
               data: values,
               borderColor: accent,
               backgroundColor: accentA,
               pointBackgroundColor: accent,
               pointBorderColor: '#0a0a0f',
               pointBorderWidth: 2,
               pointRadius: 4,
               pointHoverRadius: 6,
               borderWidth: 2,
               fill: true,
               tension: 0.4,
            }],
         },
         options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            plugins: {
               legend: { display: false },
               tooltip: {
                  backgroundColor: '#16161f',
                  borderColor: 'rgba(255,255,255,0.08)',
                  borderWidth: 1,
                  titleColor: '#f0f0f8',
                  bodyColor: '#a0a0b8',
                  padding: 12,
                  callbacks: {
                     label: ctx => ` ${fmtINR(ctx.parsed.y)}`,
                  },
               },
            },
            scales: {
               x: {
                  grid: { color: gridClr },
                  ticks: { color: textClr, font: { family: 'DM Sans', size: 11 }, maxRotation: 45 },
               },
               y: {
                  grid: { color: gridClr },
                  ticks: {
                     color: textClr,
                     font: { family: 'DM Sans', size: 11 },
                     callback: val => '₹' + Number(val).toLocaleString('en-IN'),
                  },
                  beginAtZero: true,
               },
            },
         },
      });

   } catch (err) {
      loading.style.display = 'none';
      empty.style.display = 'block';
      console.error('Revenue chart error:', err.message);
   }
}

// ── 3. Peak hours ──
async function loadPeakHours() {
   const loading = document.getElementById('peakHoursLoading');
   const empty = document.getElementById('peakHoursEmpty');
   const list = document.getElementById('peakList');

   try {
      const res = await getRequest('/admin/peak-hours');
      const rows = res.data || [];

      loading.style.display = 'none';

      if (!rows.length) {
         empty.style.display = 'block';
         return;
      }

      const max = Math.max(...rows.map(r => Number(r.booking_count)));

      list.style.display = 'flex';
      list.innerHTML = rows.map(r => {
         const pct = Math.round((Number(r.booking_count) / max) * 100);
         const label = fmtTime(r.hour + ':00');
         return `
            <li class="peak-item">
               <span class="peak-time">${label}</span>
               <div class="peak-bar-track">
                  <div class="peak-bar-fill" style="width:${pct}%"></div>
               </div>
               <span class="peak-count">${r.booking_count}</span>
            </li>`;
      }).join('');

   } catch (err) {
      loading.style.display = 'none';
      empty.style.display = 'block';
      console.error('Peak hours error:', err.message);
   }
}

// ── 4. Recent bookings ──
async function loadRecentBookings() {
   const loading = document.getElementById('recentLoading');
   const empty = document.getElementById('recentEmpty');
   const tableWrap = document.getElementById('recentTableWrap');
   const tbody = document.getElementById('recentTableBody');

   try {
      const res = await getRequest('/admin/recent-bookings');
      const rows = res.data || [];

      loading.style.display = 'none';

      if (!rows.length) {
         empty.style.display = 'block';
         return;
      }

      tableWrap.style.display = 'block';
      tbody.innerHTML = rows.map(b => `
         <tr>
            <td class="td-muted">#${b.id}</td>
            <td>
               <div class="td-primary">${b.user_name}</div>
               <div class="td-sub">${b.user_email}</div>
            </td>
            <td>${b.service_name}</td>
            <td>${fmtDate(b.date)}</td>
            <td>${getStatusBadge(b.status)}</td>
            <td>${getPaymentBadge(b.payment_status)}</td>
         </tr>
      `).join('');

   } catch (err) {
      loading.style.display = 'none';
      empty.style.display = 'block';
      console.error('Recent bookings error:', err.message);
   }
}

// ── 5. Popular services ──
async function loadPopularServices() {
   const loading = document.getElementById('popularLoading');
   const empty = document.getElementById('popularEmpty');
   const tableWrap = document.getElementById('popularTableWrap');
   const tbody = document.getElementById('popularTableBody');

   try {
      const res = await getRequest('/admin/popular-services');
      const services = res.data || [];

      loading.style.display = 'none';

      if (!services.length) {
         empty.style.display = 'block';
         return;
      }

      const maxBookings = Math.max(...services.map(s => Number(s.total_bookings)));

      tableWrap.style.display = 'block';
      tbody.innerHTML = services.map(s => {
         const pct = maxBookings > 0 ? Math.round((Number(s.total_bookings) / maxBookings) * 100) : 0;
         return `
            <tr>
               <td class="td-primary">${s.service_name}</td>
               <td>${fmtINR(s.price)}</td>
               <td>${Number(s.total_bookings).toLocaleString('en-IN')}</td>
               <td>${fmtINR(s.total_revenue)}</td>
               <td>
                  <div class="popularity-bar-track">
                     <div class="popularity-bar-fill" style="width:${pct}%"></div>
                  </div>
               </td>
            </tr>
         `;
      }).join('');

   } catch (err) {
      loading.style.display = 'none';
      empty.style.display = 'block';
      console.error('Popular services error:', err.message);
   }
}

// ── Init: fire all in parallel ──
Promise.all([
   loadAnalytics(),
   loadRevenueChart(),
   loadPeakHours(),
   loadRecentBookings(),
   loadPopularServices(),
]);
