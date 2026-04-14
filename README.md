# SlotSync
An Appointment Booking and SLot Mangagement Platform

🌐 Live Demo: https://slotsync-booking.vercel.app/

## Tech Stack
* Frontend - `HTML/CSS`, `JavaScript`
* Backend - `Node.js` + `Express`
* Database - `MySQL`

### How to Clone:
1. Clone the repository
```bash
git clone https://github.com/VirenSoni-Dev/SlotSync.git
```

2. Go to the `database/schema.sql` and run all the commands into your MySQL

3. Create a `.env` file in `backend/` folder and paste the followwing code in with you credentials wherever required.
```
# SERVER
PORT=5000

# DATABASE
DB_HOST=localhost
DB_USER=db_user
DB_PASSWORD=db_password
DB_NAME=appointment_platform

# JWT
JWT_SECRET=make_this_a_long_random_string_like_this_xk92mP0qL
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=another_long_random_string_for_refresh_token
JWT_REFRESH_EXPIRES_IN=7d

# EMAIL (Gmail SMTP)
EMAIL_USER=your_gmail_id
EMAIL_PASS=your_gmail_app_password

# RAZORPAY
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret_here
# Sign up free at razorpay.com → Settings → API Keys → Generate Test Keys

# FRONTEND URL (for CORS)
FRONTEND_URL=http://127.0.0.1:5500

NODE_ENV=development
```

3. Open a terminal in project folder and run the following commands
```bash
cd SlotSync/backend
npm install
npm run dev
```

4. Run the `frontend/index.html` using [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)

5. Open your browser and go to http://localhost:5500/ and you are ready!
