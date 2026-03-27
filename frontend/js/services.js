// ============================================================
//  js/services.js
//  Fetches services from backend, renders cards,
//  handles search + sort filtering
// ============================================================

import { getPublic } from './api.js';

// ── DOM refs ──
const servicesGrid = document.getElementById('servicesGrid');
const servicesLoading = document.getElementById('servicesLoading');
const servicesEmpty = document.getElementById('servicesEmpty');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const navActions = document.getElementById('navActions');

// Holds original full list from backend
let allServices = [];

// ── Update navbar based on login state ──
function updateNav() {
   const token = localStorage.getItem('token');
   if (!token) return;

   const user = JSON.parse(localStorage.getItem('user') || '{}');

   if (user.role === 'admin') {
      navActions.innerHTML = `
         <a href="admin/dashboard.html" class="btn-ghost">Dashboard</a>
         <button onclick="logout()" class="btn-outline">Log out</button>
      `;
   } else {
      navActions.innerHTML = `
         <a href="my-bookings.html" class="btn-ghost">My Bookings</a>
         <a href="profile.html" class="btn-primary">${user.name?.split(' ')[0] || 'Profile'}</a>
      `;
   }
}

window.logout = function () {
   localStorage.removeItem('token');
   localStorage.removeItem('user');
   window.location.href = '../index.html';
};

// ── Get icon for service ──
function getServiceIcon(name = '') {
   const n = name.toLowerCase();
   if (n.includes('hair') || n.includes('salon')) return { type: 'icon', value: 'hgi-scissor' };
   if (n.includes('doctor') || n.includes('consult')
      || n.includes('clinic') || n.includes('health')) return { type: 'icon', value: 'hgi-stethoscope-02' };
   if (n.includes('tutor') || n.includes('math')
      || n.includes('teach') || n.includes('class')) return { type: 'icon', value: 'hgi-mortarboard-01' };
   if (n.includes('repair') || n.includes('fix')) return { type: 'icon', value: 'hgi-wrench-01' };
   if (n.includes('yoga') || n.includes('fitness') || n.includes('gym')) return { type: 'emoji', value: '🧘' };
   if (n.includes('massage') || n.includes('spa')) return { type: 'emoji', value: '💆' };
   if (n.includes('dental') || n.includes('teeth')) return { type: 'icon', value: 'hgi-tooth-02' };
   if (n.includes('legal') || n.includes('lawyer')) return { type: 'icon', value: 'hgi-scales-02' };
   if (n.includes('photo') || n.includes('shoot')) return { type: 'icon', value: 'hgi-camera-01' };
   return { type: 'icon', value: 'hgi-calendar-02' };
}

// ── Render icon HTML ──
function renderIcon(icon) {
   if (icon.type === 'emoji') return icon.value;
   return `<i class="hgi hgi-stroke ${icon.value}"></i>`;
}

// ── Render service cards ──
function renderCards(services) {
   if (services.length === 0) {
      servicesGrid.style.display = 'none';
      servicesEmpty.style.display = 'block';
      return;
   }

   servicesEmpty.style.display = 'none';
   servicesGrid.style.display = 'grid';

   servicesGrid.innerHTML = services.map((s, i) => {
      const icon = getServiceIcon(s.service_name);
      return `
         <div class="service-card-full" style="animation-delay: ${i * 0.05}s">
            <div class="card-top">
               <div class="card-icon-wrap">${renderIcon(icon)}</div>
               <div class="card-info">
                  <h3>${s.service_name}</h3>
                  <p>${s.description || 'Professional service available for booking.'}</p>
               </div>
            </div>
            <div class="card-meta">
               <span class="card-price">₹${s.price}</span>
               <span class="card-duration">
                  <i class="hgi hgi-stroke hgi-clock-01"></i>
                  ${s.duration_minutes} min
               </span>
            </div>
            <a href="book.html?service=${s.id}" class="card-book-btn">
               Book Now
               <i class="hgi hgi-stroke hgi-arrow-right-01"></i>
            </a>
         </div>
      `;
   }).join('');
}

// ── Filter and sort ──
function applyFilters() {
   const query = searchInput.value.trim().toLowerCase();
   const sort = sortSelect.value;

   let filtered = allServices.filter(s =>
      s.service_name.toLowerCase().includes(query) ||
      (s.description || '').toLowerCase().includes(query)
   );

   if (sort === 'price-asc') filtered.sort((a, b) => a.price - b.price);
   if (sort === 'price-desc') filtered.sort((a, b) => b.price - a.price);
   if (sort === 'duration-asc') filtered.sort((a, b) => a.duration_minutes - b.duration_minutes);

   renderCards(filtered);
}

// ── Fetch services from backend ──
async function loadServices() {
   try {
      const res = await getPublic('/services');

      if (!res.success || !res.data?.length) {
         servicesLoading.style.display = 'none';
         servicesEmpty.style.display = 'block';
         return;
      }

      allServices = res.data;

      servicesLoading.style.display = 'none';
      renderCards(allServices);

   } catch (err) {
      servicesLoading.style.display = 'none';
      servicesEmpty.style.display = 'block';
      servicesEmpty.querySelector('h3').textContent = 'Could not load services';
      servicesEmpty.querySelector('p').textContent = 'Make sure the server is running.';
   }
}

// ── Event listeners ──
searchInput.addEventListener('input', applyFilters);
sortSelect.addEventListener('change', applyFilters);

// Navbar scroll effect
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
   navbar.classList.toggle('scrolled', window.scrollY > 20);
}, { passive: true });

// Hamburger
document.getElementById('hamburger').addEventListener('click', () => {
   document.getElementById('navLinks').classList.toggle('open');
   document.getElementById('navActions').classList.toggle('open');
});

// ── Init ──
updateNav();
loadServices();