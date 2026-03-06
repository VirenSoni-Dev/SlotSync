document.addEventListener('DOMContentLoaded', () => {
   const servicesGrid = document.getElementById('servicesGrid');

   // MOCK DATA: Simulating a response from your backend
   const mockServices = [
      { id: 1, name: "General Consultation", description: "A comprehensive 30-minute consultation with our experts to discuss your needs.", price: 500.00, duration: 30 },
      { id: 2, name: "Premium Service", description: "Full 1-hour dedicated service including priority support and detailed reporting.", price: 1200.00, duration: 60 },
      { id: 3, name: "Quick Follow-up", description: "A brief 15-minute catch-up session for existing clients.", price: 250.00, duration: 15 }
   ];

   // Simulate network delay
   setTimeout(() => {
      renderServices(mockServices);
   }, 500);

   function renderServices(services) {
      servicesGrid.innerHTML = ''; // clear loading text

      services.forEach(service => {
         const card = document.createElement('div');
         card.className = 'service-card';
         card.innerHTML = `
                <div class="service-header">
                    <div class="service-title">${service.name}</div>
                    <div class="service-price">₹${service.price}</div>
                </div>
                <div class="service-meta">
                    ⏱️ ${service.duration} Minutes
                </div>
                <div class="service-desc">
                    ${service.description}
                </div>
                <button class="btn btn-primary btn-full" onclick="window.location.href='book.html?serviceId=${service.id}'">
                    Book Appointment
                </button>
            `;
         servicesGrid.appendChild(card);
      });
   }

   // Basic logout logic for the navbar
   document.getElementById('logoutBtn')?.addEventListener('click', () => {
      localStorage.removeItem('token');
      window.location.href = 'login.html';
   });
});