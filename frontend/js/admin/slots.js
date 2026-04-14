// ============================================================
//  js/admin/slots.js
//  Admin — generate, block, view and delete slots
//  APIs: POST /slots/generate  { date, start_time, end_time, duration_min, max_capacity }
//        POST /slots/block     { slot_id }
//        GET  /slots/admin?date=YYYY-MM-DD
//        DELETE /slots/:id
// ============================================================

import { getRequest, postRequest, deleteRequest } from '../api.js';

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

// ── DOM — generate form ──
const generateForm = document.getElementById('generateForm');
const genDate = document.getElementById('genDate');
const genStart = document.getElementById('genStart');
const genEnd = document.getElementById('genEnd');
const genDuration = document.getElementById('genDuration');
const genCapacity = document.getElementById('genCapacity');
const generateBtn = document.getElementById('generateBtn');
const generateText = document.getElementById('generateText');
const generateLoader = document.getElementById('generateLoader');
const generateMessage = document.getElementById('generateMessage');

// ── DOM — block form ──
const blockForm = document.getElementById('blockForm');
const blockDate = document.getElementById('blockDate');
const blockSlotId = document.getElementById('blockSlotId');
const blockBtn = document.getElementById('blockBtn');
const blockText = document.getElementById('blockText');
const blockLoader = document.getElementById('blockLoader');
const blockMessage = document.getElementById('blockMessage');

// ── DOM — view slots ──
const viewDate = document.getElementById('viewDate');
const loadSlotsBtn = document.getElementById('loadSlotsBtn');
const slotsLoading = document.getElementById('slotsLoading');
const slotsEmpty = document.getElementById('slotsEmpty');
const slotsEmptyMessage = document.getElementById('slotsEmptyMessage');
const slotsTableWrap = document.getElementById('slotsTableWrap');
const slotsTableBody = document.getElementById('slotsTableBody');

// ── Set today as default for all date inputs ──
const today = new Date().toISOString().split('T')[0];
genDate.value = today;
blockDate.value = today;
viewDate.value = today;

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
function setLoading(textEl, loaderEl, btn, loading) {
   btn.disabled = loading;
   textEl.style.display = loading ? 'none' : 'inline';
   loaderEl.style.display = loading ? 'inline-block' : 'none';
}

function showMessage(el, text, type = 'success') {
   el.textContent = text;
   el.className = `form-message form-message--${type}`;
   el.style.display = 'block';
   setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function fmtTime(timeStr) {
   if (!timeStr) return '—';
   const [h, m] = timeStr.split(':');
   const hour = parseInt(h);
   return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

function slotStatusBadge(status) {
   const map = {
      available: 'status-badge--available',
      booked: 'status-badge--booked',
      blocked: 'status-badge--blocked',
   };
   return `<span class="status-badge ${map[status] || ''}">${status}</span>`;
}

// ── Generate form validation ──
function validateGenerateForm() {
   let valid = true;
   document.getElementById('genDateError').textContent = '';
   document.getElementById('genStartError').textContent = '';
   document.getElementById('genEndError').textContent = '';
   document.getElementById('genCapacityError').textContent = '';

   if (!genDate.value) {
      document.getElementById('genDateError').textContent = 'Date is required.';
      valid = false;
   }
   if (!genStart.value) {
      document.getElementById('genStartError').textContent = 'Start time is required.';
      valid = false;
   }
   if (!genEnd.value) {
      document.getElementById('genEndError').textContent = 'End time is required.';
      valid = false;
   }
   if (genStart.value && genEnd.value && genStart.value >= genEnd.value) {
      document.getElementById('genEndError').textContent = 'End time must be after start time.';
      valid = false;
   }
   if (!genCapacity.value || parseInt(genCapacity.value) < 1) {
      document.getElementById('genCapacityError').textContent = 'Capacity must be at least 1.';
      valid = false;
   }

   return valid;
}

// ── Generate slots ──
generateForm.addEventListener('submit', async e => {
   e.preventDefault();
   if (!validateGenerateForm()) return;

   setLoading(generateText, generateLoader, generateBtn, true);
   generateMessage.style.display = 'none';

   try {
      // slotController expects: date, start_time, end_time, duration_min, max_capacity
      const res = await postRequest('/slots/generate', {
         date: genDate.value,
         start_time: genStart.value,
         end_time: genEnd.value,
         duration_min: parseInt(genDuration.value),
         max_capacity: parseInt(genCapacity.value),
      });

      // res.data = { count, slots }
      const count = res.data?.count ?? '';
      showMessage(generateMessage, `✅ ${count} slot(s) generated successfully!`, 'success');
      showToast('Slots generated.', 'success');

      // Reload view table if dates match
      if (viewDate.value === genDate.value) {
         loadSlotsForDate(viewDate.value);
      }

   } catch (err) {
      showMessage(generateMessage, err.message || 'Failed to generate slots.', 'error');
   } finally {
      setLoading(generateText, generateLoader, generateBtn, false);
   }
});

// ── Populate block slot select when date changes ──
async function populateBlockSlotSelect(date) {
   blockSlotId.innerHTML = '<option value="">Loading…</option>';

   if (!date) {
      blockSlotId.innerHTML = '<option value="">— Pick a date first —</option>';
      return;
   }

   try {
      // GET /slots/admin returns ALL slots for that date (any status)
      const res = await getRequest(`/slots/admin?date=${date}`);
      const slots = res.data || [];

      // Only available slots can be blocked
      const available = slots.filter(s => s.status === 'available');

      if (!available.length) {
         blockSlotId.innerHTML = '<option value="">No available slots on this date</option>';
         return;
      }

      blockSlotId.innerHTML = '<option value="">— Select a slot —</option>' +
         available.map(s =>
            `<option value="${s.id}">${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}</option>`
         ).join('');

   } catch (_) {
      blockSlotId.innerHTML = '<option value="">Failed to load slots</option>';
   }
}

blockDate.addEventListener('change', () => populateBlockSlotSelect(blockDate.value));

// Populate on load
populateBlockSlotSelect(blockDate.value);

// ── Block form ──
blockForm.addEventListener('submit', async e => {
   e.preventDefault();
   document.getElementById('blockDateError').textContent = '';
   document.getElementById('blockSlotError').textContent = '';

   if (!blockDate.value) {
      document.getElementById('blockDateError').textContent = 'Date is required.';
      return;
   }
   if (!blockSlotId.value) {
      document.getElementById('blockSlotError').textContent = 'Please select a slot.';
      return;
   }

   setLoading(blockText, blockLoader, blockBtn, true);
   blockMessage.style.display = 'none';

   try {
      // slotController expects: { slot_id }
      await postRequest('/slots/block', {
         slot_id: parseInt(blockSlotId.value),
      });

      showMessage(blockMessage, '✅ Slot blocked successfully.', 'success');
      showToast('Slot blocked.', 'success');

      // Refresh the select for this date
      populateBlockSlotSelect(blockDate.value);

      // Refresh view table if dates match
      if (viewDate.value === blockDate.value) {
         loadSlotsForDate(viewDate.value);
      }

   } catch (err) {
      showMessage(blockMessage, err.message || 'Failed to block slot.', 'error');
   } finally {
      setLoading(blockText, blockLoader, blockBtn, false);
   }
});

// ── Load slots for view table ──
async function loadSlotsForDate(date) {
   if (!date) return;

   slotsLoading.style.display = 'block';
   slotsEmpty.style.display = 'none';
   slotsTableWrap.style.display = 'none';

   try {
      const res = await getRequest(`/slots/admin?date=${date}`);
      // res.data is the raw array from getSlotsByDate — SELECT * FROM slots
      // columns: id, date, start_time, end_time, max_capacity, booked_count, status, created_by, created_at
      const slots = res.data || [];

      slotsLoading.style.display = 'none';

      if (!slots.length) {
         slotsEmpty.style.display = 'block';
         slotsEmptyMessage.textContent = 'No slots found for this date.';
         return;
      }

      slotsTableWrap.style.display = 'block';

      slotsTableBody.innerHTML = slots.map(s => {
         // duration in minutes = difference between start and end
         const [sh, sm] = s.start_time.split(':').map(Number);
         const [eh, em] = s.end_time.split(':').map(Number);
         const durationMin = (eh * 60 + em) - (sh * 60 + sm);

         const canDelete = s.booked_count === 0;

         return `
            <tr>
               <td class="td-primary">${fmtTime(s.start_time)} – ${fmtTime(s.end_time)}</td>
               <td>${durationMin} min</td>
               <td>${s.max_capacity}</td>
               <td>${s.booked_count}</td>
               <td>${slotStatusBadge(s.status)}</td>
               <td>
                  <div class="row-actions">
                     ${canDelete
               ? `<button class="btn-row-action btn-row-action--danger" title="Delete slot" onclick="handleDeleteSlot(${s.id})">
                              <i class="hgi hgi-stroke hgi-delete-02"></i>
                           </button>`
               : `<span class="text-muted">Has bookings</span>`
            }
                  </div>
               </td>
            </tr>
         `;
      }).join('');

   } catch (err) {
      slotsLoading.style.display = 'none';
      slotsEmpty.style.display = 'block';
      slotsEmptyMessage.textContent = err.message || 'Could not load slots.';
   }
}

loadSlotsBtn.addEventListener('click', () => loadSlotsForDate(viewDate.value));
viewDate.addEventListener('keydown', e => {
   if (e.key === 'Enter') loadSlotsForDate(viewDate.value);
});

// ── Delete slot (global for inline onclick) ──
window.handleDeleteSlot = async function (id) {
   if (!confirm('Delete this slot? This cannot be undone.')) return;

   try {
      await deleteRequest(`/slots/${id}`);
      showToast('Slot deleted.', 'success');
      loadSlotsForDate(viewDate.value);
   } catch (err) {
      showToast(err.message || 'Failed to delete slot.', 'error');
   }
};

// ── Load today's slots on init ──
loadSlotsForDate(today);