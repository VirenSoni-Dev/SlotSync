// ============================================================
//  utils/slotGenerator.js
//  Algorithm that generates individual time slots
//  from a start time, end time, and duration
//
//  Example input:
//  date: '2025-02-10', start: '09:00', end: '12:00', duration: 30
//
//  Example output:
//  [
//    { date: '2025-02-10', start_time: '09:00', end_time: '09:30' },
//    { date: '2025-02-10', start_time: '09:30', end_time: '10:00' },
//    { date: '2025-02-10', start_time: '10:00', end_time: '10:30' },
//    ...
//  ]
// ============================================================

const timeToMinutes = (time) => {
   const [hours, minutes] = time.split(':').map(Number);
   return hours * 60 + minutes;
};

const minutesToTime = (minutes) => {
   const h = Math.floor(minutes / 60).toString().padStart(2, '0');
   const m = (minutes % 60).toString().padStart(2, '0');
   return `${h}:${m}`;
};

const generateSlots = ({date, start_time, end_time, duration_min, max_cap = 1}) => {
   const startMinutes = timeToMinutes(start_time);
   const endMinutes = timeToMinutes(end_time);

   if (endMinutes <= startMinutes) {
      throw new Error('Start time must be before end time');
   }

   if (startMinutes + duration_min > endMinutes) {
      throw new Error('Duration is too long to fit even one slot in given time range.');
   }

   const slots = [];
   let current = startMinutes;

   while (current + duration_min <= endMinutes) {
      slots.push({
         date,
         start_time: minutesToTime(current),
         end_time: minutesToTime(current + duration_min),
         max_cap,
         booked_count: 0,
         status: 'available'
      });
      current += duration_min;
   }

   return slots;
};

export {
   generateSlots,
   timeToMinutes,
   minutesToTime
};
