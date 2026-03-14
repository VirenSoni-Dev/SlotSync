// ============================================================
//  js/landing.js
//  Logic specific to index.html
//  - Navbar scroll effect
//  - Mobile menu toggle
//  - Load real services from backend (if available)
// ============================================================

import { getRequest } from './api.js';

// ── Navbar scroll effect ──
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
   if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
   } else {
      navbar.classList.remove('scrolled');
   }
}, { passive: true });

// ── Mobile hamburger menu ──
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
const navActions = document.getElementById('navActions');

hamburger.addEventListener('click', () => {
   navLinks.classList.toggle('open');
   navActions.classList.toggle('open');
});

// ── Load real services from backend ──
// If backend is running, replace the static placeholder cards
// with real data. If not running, placeholders stay visible.
async function loadServices() {
   try {
      const res = await getRequest('/services');
      if (!res.success || !res.data?.length) return;

      const container = document.getElementById('serviceCards');
      // Only show first 3 on landing page
      const services = res.data.slice(0, 3);

      container.innerHTML = services.map(s => `
            <div class="service-card">
                <div class="service-icon-wrap">
                    <i class="hgi hgi-stroke ${getServiceIcon(s.service_name)}"></i>
                </div>
                <div class="service-info">
                    <h3>${s.service_name}</h3>
                    <p>${s.description || 'Professional service available for booking.'}</p>
                    <div class="service-meta">
                        <span class="service-price">₹${s.price}</span>
                        <span class="service-duration">
                            <i class="hgi hgi-stroke hgi-clock-01"></i> ${s.duration_minutes} min
                        </span>
                    </div>
                </div>
                <a href="pages/book.html?service=${s.id}" class="service-book-btn">
                    Book <i class="hgi hgi-stroke hgi-arrow-right-01"></i>
                </a>
            </div>
        `).join('');
   } catch {
      // Backend not running — static placeholders stay, no error shown
   }
}

// Maps service name keywords to Hugeicons class names
function getServiceIcon(name = '') {
   const n = name.toLowerCase();
   if (n.includes('hair') || n.includes('salon')) return 'hgi-scissor';
   if (n.includes('doctor') || n.includes('consult')
      || n.includes('clinic') || n.includes('health')) return 'hgi-stethoscope-02';
   if (n.includes('tutor') || n.includes('math')
      || n.includes('teach') || n.includes('class')) return 'hgi-mortarboard-01';
   if (n.includes('repair') || n.includes('fix')
      || n.includes('service')) return 'hgi-wrench-01';
   if (n.includes('yoga') || n.includes('fitness')
      || n.includes('gym')) return 'hgi-dumbbell-01';
   if (n.includes('massage') || n.includes('spa')) return 'hgi-spa-01';
   if (n.includes('dental') || n.includes('teeth')) return 'hgi-tooth-02';
   if (n.includes('legal') || n.includes('lawyer')) return 'hgi-scales-02';
   if (n.includes('photo') || n.includes('shoot')) return 'hgi-camera-01';
   return 'hgi-calendar-check-in';                     // default fallback
}

// ── Update navbar if user is already logged in ──
function updateNavForLoggedInUser() {
   const token = localStorage.getItem('token');
   if (!token) return;

   const user = JSON.parse(localStorage.getItem('user') || '{}');
   const navActions = document.getElementById('navActions');

   if (user.role === 'admin') {
      navActions.innerHTML = `
            <a href="pages/admin/dashboard.html" class="btn-ghost">Dashboard</a>
            <button onclick="logout()" class="btn-outline">Log out</button>
        `;
   } else {
      navActions.innerHTML = `
            <a href="pages/my-bookings.html" class="btn-ghost">My Bookings</a>
            <a href="pages/profile.html" class="btn-primary">
                ${user.name?.split(' ')[0] || 'Profile'}
            </a>
        `;
   }
}

window.logout = function () {
   localStorage.removeItem('token');
   localStorage.removeItem('user');
   window.location.reload();
};

// ── Init ──
loadServices();
updateNavForLoggedInUser();