// ============================================================
//  js/admin/services.js
//  Admin — CRUD for services
//  APIs: GET /services, POST /services,
//        PUT /services/:id, DELETE /services/:id
// ============================================================

import { getRequest, postRequest, putRequest, deleteRequest } from '../api.js';

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
let allServices = [];
let editingId = null;
let deletingId = null;

// ── DOM ──
const servicesLoading = document.getElementById('servicesLoading');
const servicesEmpty = document.getElementById('servicesEmpty');
const emptyMessage = document.getElementById('emptyMessage');
const servicesTableWrap = document.getElementById('servicesTableWrap');
const servicesTableBody = document.getElementById('servicesTableBody');
const searchInput = document.getElementById('searchInput');
const statusFilter = document.getElementById('statusFilter');

// Add/edit modal
const serviceModal = document.getElementById('serviceModal');
const modalTitle = document.getElementById('modalTitle');
const serviceForm = document.getElementById('serviceForm');
const serviceIdInput = document.getElementById('serviceId');
const serviceNameInput = document.getElementById('serviceName');
const serviceDescInput = document.getElementById('serviceDescription');
const servicePriceInput = document.getElementById('servicePrice');
const serviceDurInput = document.getElementById('serviceDuration');
const serviceActiveInput = document.getElementById('serviceActive');
const activeToggleGroup = document.getElementById('activeToggleGroup');
const saveServiceBtn = document.getElementById('saveServiceBtn');
const saveServiceText = document.getElementById('saveServiceText');
const saveServiceLoader = document.getElementById('saveServiceLoader');
const serviceFormMsg = document.getElementById('serviceFormMessage');

// Delete modal
const deleteModal = document.getElementById('deleteModal');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const deleteConfirmText = document.getElementById('deleteConfirmText');
const deleteConfirmLoader = document.getElementById('deleteConfirmLoader');

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

function clearErrors() {
   document.getElementById('serviceNameError').textContent = '';
   document.getElementById('servicePriceError').textContent = '';
   document.getElementById('serviceDurationError').textContent = '';
   serviceFormMsg.style.display = 'none';
   serviceFormMsg.textContent = '';
}

function showFormMessage(text, type = 'error') {
   serviceFormMsg.textContent = text;
   serviceFormMsg.className = `form-message form-message--${type}`;
   serviceFormMsg.style.display = 'block';
}

// ── Render table ──
function renderTable(services) {
   servicesLoading.style.display = 'none';

   if (services.length === 0) {
      servicesTableWrap.style.display = 'none';
      servicesEmpty.style.display = 'block';
      emptyMessage.textContent = statusFilter.value || searchInput.value
         ? 'No services match your filters.'
         : 'No services have been added yet.';
      return;
   }

   servicesEmpty.style.display = 'none';
   servicesTableWrap.style.display = 'block';

   servicesTableBody.innerHTML = services.map(s => `
      <tr>
         <td class="td-primary">${s.service_name}</td>
         <td class="td-desc">${s.description || '<span class="text-muted">—</span>'}</td>
         <td>${s.duration_minutes} min</td>
         <td>₹${Number(s.price).toLocaleString('en-IN')}</td>
         <td>
            ${s.is_active
         ? '<span class="status-badge status-badge--active">Active</span>'
         : '<span class="status-badge status-badge--inactive">Inactive</span>'}
         </td>
         <td>
            <div class="row-actions">
               <button class="btn-row-action" title="Edit" onclick="openEditModal(${s.id})">
                  <i class="hgi hgi-stroke hgi-pencil-edit-02"></i>
               </button>
               <button class="btn-row-action btn-row-action--danger" title="Delete" onclick="openDeleteModal(${s.id})">
                  <i class="hgi hgi-stroke hgi-delete-02"></i>
               </button>
            </div>
         </td>
      </tr>
   `).join('');
}

// ── Apply filters ──
function applyFilters() {
   const q = searchInput.value.trim().toLowerCase();
   const status = statusFilter.value;

   const filtered = allServices.filter(s => {
      const matchQ = !q ||
         s.service_name.toLowerCase().includes(q) ||
         (s.description || '').toLowerCase().includes(q);

      const matchStatus = !status ||
         (status === 'active' && s.is_active) ||
         (status === 'inactive' && !s.is_active);

      return matchQ && matchStatus;
   });

   renderTable(filtered);
}

searchInput.addEventListener('input', applyFilters);
statusFilter.addEventListener('change', applyFilters);

// ── Load services ──
async function loadServices() {
   servicesLoading.style.display = 'block';
   servicesEmpty.style.display = 'none';
   servicesTableWrap.style.display = 'none';

   try {
      const res = await getRequest('/services');
      allServices = res.data || [];
      applyFilters();
   } catch (err) {
      servicesLoading.style.display = 'none';
      servicesEmpty.style.display = 'block';
      emptyMessage.textContent = 'Could not load services. Make sure the server is running.';
   }
}

// ── Open add modal ──
document.getElementById('openAddModalBtn').addEventListener('click', () => {
   editingId = null;
   modalTitle.textContent = 'Add Service';
   serviceForm.reset();
   serviceIdInput.value = '';
   activeToggleGroup.style.display = 'none';
   clearErrors();
   serviceModal.style.display = 'flex';
});

// ── Open edit modal (global for inline onclick) ──
window.openEditModal = function (id) {
   const svc = allServices.find(s => s.id === id);
   if (!svc) return;

   editingId = id;
   modalTitle.textContent = 'Edit Service';

   serviceIdInput.value = svc.id;
   serviceNameInput.value = svc.service_name || '';
   serviceDescInput.value = svc.description || '';
   servicePriceInput.value = svc.price || '';
   serviceDurInput.value = svc.duration_minutes || '';
   serviceActiveInput.checked = !!svc.is_active;
   activeToggleGroup.style.display = 'block';

   clearErrors();
   serviceModal.style.display = 'flex';
};

// ── Close modal ──
function closeServiceModal() {
   serviceModal.style.display = 'none';
   serviceForm.reset();
   editingId = null;
   activeToggleGroup.style.display = 'none';
   clearErrors();
}

document.getElementById('closeModalBtn').addEventListener('click', closeServiceModal);
document.getElementById('cancelModalBtn').addEventListener('click', closeServiceModal);
serviceModal.addEventListener('click', e => {
   if (e.target === serviceModal) closeServiceModal();
});

// ── Validate ──
function validateForm() {
   clearErrors();
   let valid = true;

   if (!serviceNameInput.value.trim()) {
      document.getElementById('serviceNameError').textContent = 'Service name is required.';
      valid = false;
   }
   if (!servicePriceInput.value || parseFloat(servicePriceInput.value) < 0) {
      document.getElementById('servicePriceError').textContent = 'Enter a valid price.';
      valid = false;
   }
   if (!serviceDurInput.value || parseInt(serviceDurInput.value) < 5) {
      document.getElementById('serviceDurationError').textContent = 'Duration must be at least 5 minutes.';
      valid = false;
   }

   return valid;
}

// ── Submit (add or edit) ──
serviceForm.addEventListener('submit', async e => {
   e.preventDefault();
   if (!validateForm()) return;

   setLoading(saveServiceText, saveServiceLoader, saveServiceBtn, true);

   // serviceController only accepts these 4 fields
   const body = {
      service_name: serviceNameInput.value.trim(),
      description: serviceDescInput.value.trim(),
      price: parseFloat(servicePriceInput.value),
      duration_minutes: parseInt(serviceDurInput.value),
   };

   try {
      if (editingId) {
         await putRequest(`/services/${editingId}`, body);
         showToast('Service updated successfully.', 'success');
      } else {
         await postRequest('/services', body);
         showToast('Service created successfully.', 'success');
      }

      closeServiceModal();
      await loadServices();

   } catch (err) {
      showFormMessage(err.message || 'Failed to save service. Please try again.');
   } finally {
      setLoading(saveServiceText, saveServiceLoader, saveServiceBtn, false);
   }
});

// ── Open delete modal (global for inline onclick) ──
window.openDeleteModal = function (id) {
   deletingId = id;
   deleteModal.style.display = 'flex';
};

function closeDeleteModal() {
   deleteModal.style.display = 'none';
   deletingId = null;
}

document.getElementById('cancelDeleteBtn').addEventListener('click', closeDeleteModal);
deleteModal.addEventListener('click', e => {
   if (e.target === deleteModal) closeDeleteModal();
});

confirmDeleteBtn.addEventListener('click', async () => {
   if (!deletingId) return;

   setLoading(deleteConfirmText, deleteConfirmLoader, confirmDeleteBtn, true);

   try {
      await deleteRequest(`/services/${deletingId}`);
      showToast('Service deleted successfully.', 'success');
      closeDeleteModal();
      await loadServices();
   } catch (err) {
      showToast(err.message || 'Failed to delete service.', 'error');
   } finally {
      setLoading(deleteConfirmText, deleteConfirmLoader, confirmDeleteBtn, false);
   }
});

// ── Init ──
loadServices();