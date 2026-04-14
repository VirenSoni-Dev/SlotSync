// ============================================================
//  js/booking.js
//  Multi-step booking flow:
//  Step 1 → service details + notes
//  Step 2 → pick date → pick slot
//  Step 3 → confirm + pay via Razorpay
// ============================================================

import { getPublic, getRequest, postRequest } from './api.js';

// ── Auth guard — must be logged in to book ──
const token = localStorage.getItem('token');
const user = JSON.parse(localStorage.getItem('user') || '{}');

if (!token) {
   // Save intended destination then redirect to login
   sessionStorage.setItem('redirectAfterLogin', window.location.href);
   window.location.href = 'login.html';
}

if (user.role === 'admin') {
   window.location.href = 'admin/dashboard.html';
}

// ── Get service ID from URL ──
// e.g. book.html?service=3
const params = new URLSearchParams(window.location.search);
const serviceId = params.get('service');

if (!serviceId) {
   window.location.href = 'services.html';
}

// ── State ──
let selectedService = null;
let selectedSlot = null;
let bookingId = null;

// ── DOM refs ── Step 1
const serviceLoading = document.getElementById('serviceLoading');
const serviceCard = document.getElementById('serviceCard');
const serviceIcon = document.getElementById('serviceIcon');
const serviceName = document.getElementById('serviceName');
const serviceDesc = document.getElementById('serviceDesc');
const serviceDuration = document.getElementById('serviceDuration');
const servicePrice = document.getElementById('servicePrice');
const bookingNotes = document.getElementById('bookingNotes');
const step1Next = document.getElementById('step1Next');

// ── DOM refs ── Step 2
const datePicker = document.getElementById('datePicker');
const slotsArea = document.getElementById('slotsArea');
const slotsLoading = document.getElementById('slotsLoading');
const slotsGrid = document.getElementById('slotsGrid');
const slotsDate = document.getElementById('slotsDate');
const noSlots = document.getElementById('noSlots');
const step2Back = document.getElementById('step2Back');
const step2Next = document.getElementById('step2Next');

// ── DOM refs ── Step 3
const summaryService = document.getElementById('summaryService');
const summaryDate = document.getElementById('summaryDate');
const summaryTime = document.getElementById('summaryTime');
const summaryTotal = document.getElementById('summaryTotal');
const payBtn = document.getElementById('payBtn');
const payBtnText = document.getElementById('payBtnText');
const payBtnLoader = document.getElementById('payBtnLoader');
const payAmount = document.getElementById('payAmount');
const bookingError = document.getElementById('bookingError');
const step3Back = document.getElementById('step3Back');

// ── DOM refs ── Sidebar
const sidebarEmpty = document.getElementById('sidebarEmpty');
const sidebarContent = document.getElementById('sidebarContent');
const sbService = document.getElementById('sbService');
const sbDate = document.getElementById('sbDate');
const sbTime = document.getElementById('sbTime');
const sbTotal = document.getElementById('sbTotal');

// ── DOM refs ── Success
const stepSuccess = document.getElementById('stepSuccess');
const successDetails = document.getElementById('successDetails');

// ── Step elements ──
const steps = {
   step1: document.getElementById('step1'),
   step2: document.getElementById('step2'),
   step3: document.getElementById('step3'),
};
const dots = [1, 2, 3].map(n => document.getElementById(`dot${n}`));
const lines = [1, 2].map(n => document.getElementById(`line${n}`));
const labels = [1, 2, 3].map(n => document.getElementById(`label${n}`));

// ── Nav actions ──
document.getElementById('navActions').innerHTML = `
   <a href="my-bookings.html" class="btn-ghost">My Bookings</a>
   <a href="profile.html" class="btn-primary">${user.name?.split(' ')[0] || 'Profile'}</a>
`;

// ============================================================
//  Step navigation helpers
// ============================================================

function goToStep(n) {
   Object.values(steps).forEach(s => s.style.display = 'none');
   steps[`step${n}`].style.display = 'block';

   // Update dots + labels
   dots.forEach((dot, i) => {
      dot.classList.remove('active', 'done');
      labels[i].classList.remove('active', 'done');
      if (i + 1 < n) { dot.classList.add('done'); labels[i].classList.add('done'); }
      if (i + 1 === n) { dot.classList.add('active'); labels[i].classList.add('active'); }
   });

   lines.forEach((line, i) => {
      line.classList.toggle('done', i + 1 < n);
   });

   window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================
//  Sidebar updater
// ============================================================

function updateSidebar() {
   const hasService = selectedService !== null;
   const hasSlot = selectedSlot !== null;

   if (!hasService) return;

   sidebarEmpty.style.display = 'none';
   sidebarContent.style.display = 'block';

   sbService.textContent = selectedService.service_name;
   sbDate.textContent = hasSlot ? formatDate(datePicker.value) : '—';
   sbTime.textContent = hasSlot ? formatTime(selectedSlot.start_time) : '—';
   sbTotal.textContent = `₹${selectedService.price}`;
}

// ============================================================
//  Helpers
// ============================================================

function formatDate(dateStr) {
   // '2025-02-10' → 'Mon, 10 Feb 2025'
   const d = new Date(dateStr + 'T00:00:00');
   return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(timeStr) {
   // '10:30:00' → '10:30 AM'
   const [h, m] = timeStr.split(':');
   const hour = parseInt(h);
   const ampm = hour >= 12 ? 'PM' : 'AM';
   const hour12 = hour % 12 || 12;
   return `${hour12}:${m} ${ampm}`;
}

function getServiceIconHTML(name = '') {
   const n = name.toLowerCase();
   if (n.includes('hair') || n.includes('salon')) return `<i class="hgi hgi-stroke hgi-scissor"></i>`;
   if (n.includes('doctor') || n.includes('consult')
      || n.includes('clinic')) return `<i class="hgi hgi-stroke hgi-stethoscope-02"></i>`;
   if (n.includes('tutor') || n.includes('math')) return `<i class="hgi hgi-stroke hgi-mortarboard-01"></i>`;
   if (n.includes('repair') || n.includes('fix')) return `<i class="hgi hgi-stroke hgi-wrench-01"></i>`;
   if (n.includes('yoga') || n.includes('fitness')) return '🧘';
   if (n.includes('massage') || n.includes('spa')) return '💆';
   return `<i class="hgi hgi-stroke hgi-calendar-02"></i>`;
}

// ============================================================
//  STEP 1 — Load service details
// ============================================================

async function loadService() {
   try {
      const res = await getPublic(`/services/${serviceId}`);
      selectedService = res.data;

      serviceName.textContent = selectedService.service_name;
      serviceDesc.textContent = selectedService.description || 'Professional service available for booking.';
      serviceDuration.textContent = `${selectedService.duration_minutes} min`;
      servicePrice.textContent = selectedService.price;
      serviceIcon.innerHTML = getServiceIconHTML(selectedService.service_name);

      serviceLoading.style.display = 'none';
      serviceCard.style.display = 'flex';
      document.getElementById('notesWrap').style.display = 'block';

      document.title = `Book ${selectedService.service_name} — SlotSync`;

      updateSidebar();

   } catch (err) {
      serviceLoading.innerHTML = `<p style="color: var(--clr-red)">Service not found. <a href="services.html">Browse services</a></p>`;
   }
}

step1Next.addEventListener('click', () => {
   if (!selectedService) return;
   goToStep(2);

   // Set min date to today
   const today = new Date().toISOString().split('T')[0];
   datePicker.min = today;
   datePicker.value = today;

   // Auto load slots for today
   loadSlots(today);
});

// ============================================================
//  STEP 2 — Pick date + slot
// ============================================================

datePicker.addEventListener('change', () => {
   const date = datePicker.value;
   if (!date) return;

   // Reset selection
   selectedSlot = null;
   step2Next.disabled = true;
   updateSidebar();

   loadSlots(date);
});

async function loadSlots(date) {
   slotsArea.style.display = 'block';
   slotsLoading.style.display = 'flex';
   noSlots.style.display = 'none';
   slotsGrid.innerHTML = '';
   slotsDate.textContent = formatDate(date);

   try {
      const res = await getPublic(`/slots?date=${date}`);
      slotsLoading.style.display = 'none';

      const slots = res.data || [];

      if (slots.length === 0) {
         noSlots.style.display = 'block';
         return;
      }

      slotsGrid.innerHTML = slots.map(slot => `
         <button
            class="slot-time-btn"
            data-id="${slot.id}"
            data-start="${slot.start_time}"
            data-end="${slot.end_time}"
         >
            ${formatTime(slot.start_time)}
         </button>
      `).join('');

      // Slot click handler
      slotsGrid.querySelectorAll('.slot-time-btn').forEach(btn => {
         btn.addEventListener('click', () => {
            slotsGrid.querySelectorAll('.slot-time-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');

            selectedSlot = {
               id: btn.dataset.id,
               start_time: btn.dataset.start,
               end_time: btn.dataset.end
            };

            step2Next.disabled = false;
            updateSidebar();
         });
      });

   } catch (err) {
      slotsLoading.style.display = 'none';
      noSlots.style.display = 'block';
   }
}

step2Back.addEventListener('click', () => goToStep(1));

step2Next.addEventListener('click', () => {
   if (!selectedSlot) return;

   // Populate step 3 summary
   const dateFormatted = formatDate(datePicker.value);
   const timeFormatted = formatTime(selectedSlot.start_time);

   summaryService.textContent = selectedService.service_name;
   summaryDate.textContent = dateFormatted;
   summaryTime.textContent = timeFormatted;
   summaryTotal.textContent = `₹${selectedService.price}`;
   payAmount.textContent = selectedService.price;

   goToStep(3);
});

// ============================================================
//  STEP 3 — Create booking + Razorpay payment
// ============================================================

step3Back.addEventListener('click', () => goToStep(2));

payBtn.addEventListener('click', async () => {
   payBtnText.style.display = 'none';
   payBtnLoader.style.display = 'inline-block';
   payBtn.disabled = true;
   bookingError.style.display = 'none';

   try {
      // 1. Create booking
      const bookingRes = await postRequest('/bookings', {
         service_id: parseInt(serviceId),
         slot_id: parseInt(selectedSlot.id),
         notes: bookingNotes.value.trim() || undefined
      });

      bookingId = bookingRes.data.id;

      // 2. Create Razorpay order
      const orderRes = await postRequest('/payment/create-order', {
         booking_id: bookingId
      });

      const { order_id, amount, currency, key_id } = orderRes.data;

      // 3. Open Razorpay checkout modal
      const options = {
         key: key_id,
         amount,
         currency,
         name: 'SlotSync',
         description: selectedService.service_name,
         order_id,
         prefill: {
            name: user.name,
            email: '',   // filled by user
            contact: ''
         },
         theme: { color: '#6c63ff' },

         handler: async function (response) {
            // 4. Verify payment signature on backend
            try {
               await postRequest('/payment/verify', {
                  booking_id: bookingId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
               });

               // 5. Show success
               showSuccess();

            } catch (err) {
               bookingError.textContent = 'Payment verification failed. Please contact support.';
               bookingError.style.display = 'block';
               payBtnText.style.display = 'inline';
               payBtnLoader.style.display = 'none';
               payBtn.disabled = false;
            }
         },

         modal: {
            ondismiss: function () {
               // User closed modal without paying
               payBtnText.style.display = 'inline';
               payBtnLoader.style.display = 'none';
               payBtn.disabled = false;
            }
         }
      };

      const rzp = new Razorpay(options);
      rzp.open();

   } catch (err) {
      bookingError.textContent = err.message || 'Something went wrong. Please try again.';
      bookingError.style.display = 'block';
      payBtnText.style.display = 'inline';
      payBtnLoader.style.display = 'none';
      payBtn.disabled = false;
   }
});

// ============================================================
//  Success state
// ============================================================

function showSuccess() {
   Object.values(steps).forEach(s => s.style.display = 'none');
   stepSuccess.style.display = 'block';

   // All dots done
   dots.forEach(dot => { dot.classList.remove('active'); dot.classList.add('done'); });
   lines.forEach(line => line.classList.add('done'));
   labels.forEach(label => { label.classList.remove('active'); label.classList.add('done'); });

   successDetails.innerHTML = `
      <div class="summary-row">
         <span class="summary-label">Service</span>
         <span class="summary-value">${selectedService.service_name}</span>
      </div>
      <div class="summary-row">
         <span class="summary-label">Date</span>
         <span class="summary-value">${formatDate(datePicker.value)}</span>
      </div>
      <div class="summary-row">
         <span class="summary-label">Time</span>
         <span class="summary-value">${formatTime(selectedSlot.start_time)}</span>
      </div>
      <div class="summary-divider"></div>
      <div class="summary-row summary-total">
         <span class="summary-label">Paid</span>
         <span class="summary-value">₹${selectedService.price}</span>
      </div>
   `;
}

// ── Hamburger ──
document.getElementById('hamburger').addEventListener('click', () => {
   document.getElementById('navLinks').classList.toggle('open');
});

// ── Init ──
loadService();