-- ============================================================
--  APPOINTMENT BOOKING & SLOT MANAGEMENT PLATFORM
--  schema.sql — run this once to create all tables
--  
--  Order matters: referenced tables must exist before
--  tables that reference them (foreign key rule)
-- ============================================================

-- 1. USERS
--    Every person who uses the platform.
--    role = 'customer' by default, manually set 'admin' for owners.
--    is_verified = false until they verify their OTP after register.
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100)  NOT NULL,
    email         VARCHAR(100)  NOT NULL UNIQUE,
    phone         VARCHAR(15)   NOT NULL,
    password      VARCHAR(255)  NOT NULL,              -- bcrypt hash, never plain text
    role          ENUM('customer', 'admin') DEFAULT 'customer',
    is_verified   BOOLEAN       DEFAULT FALSE,         -- false until OTP verified
    created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 2. SERVICES
--    What the business offers. e.g. "Haircut", "Consultation"
--    duration_minutes is used by the slot generator.
--    is_active lets admin hide a service without deleting it.
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    service_name      VARCHAR(100)   NOT NULL,
    description       TEXT,
    price             DECIMAL(10,2)  NOT NULL,         -- in rupees
    duration_minutes  INT            NOT NULL,         -- e.g. 30, 60
    is_active         BOOLEAN        DEFAULT TRUE,
    created_at        TIMESTAMP      DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 3. SLOTS
--    Time windows the business opens up for booking.
--    max_capacity = how many people can book the same slot.
--    booked_count = how many have booked so far (quick check).
--    status: available / booked / blocked
--    blocked = admin manually closed this slot (holiday, etc.)
-- ============================================================
CREATE TABLE IF NOT EXISTS slots (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    date          DATE           NOT NULL,
    start_time    TIME           NOT NULL,
    end_time      TIME           NOT NULL,
    max_capacity  INT            DEFAULT 1,
    booked_count  INT            DEFAULT 0,
    status        ENUM('available', 'booked', 'blocked') DEFAULT 'available',
    created_by    INT,                                 -- admin user id
    created_at    TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- 4. BOOKINGS
--    The actual reservation — links user + service + slot.
--    status:         pending → confirmed → completed
--                    pending → cancelled
--                    pending → failed (payment failed)
--    payment_status: pending → paid → refunded → failed
--    reminder_sent:  cron job marks this true after sending email
-- ============================================================
CREATE TABLE IF NOT EXISTS bookings (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    user_id         INT            NOT NULL,
    service_id      INT            NOT NULL,
    slot_id         INT            NOT NULL,
    status          ENUM('pending', 'confirmed', 'cancelled', 'completed', 'failed')
                                   DEFAULT 'pending',
    payment_status  ENUM('pending', 'paid', 'refunded', 'failed')
                                   DEFAULT 'pending',
    notes           TEXT,                              -- optional note from customer
    reminder_day_before_sent  BOOLEAN DEFAULT FALSE,
    reminder_same_day_sent    BOOLEAN DEFAULT FALSE,      -- cron job flag
    created_at      TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
    FOREIGN KEY (slot_id)    REFERENCES slots(id)    ON DELETE CASCADE
);

-- ============================================================
-- 5. PAYMENTS
--    Financial record tied to a booking.
--    Kept separate from bookings because one booking can have
--    multiple payment attempts (first fails, user retries).
--    razorpay_order_id  → created by your backend via Razorpay API
--    razorpay_payment_id → returned by Razorpay after user pays
--    razorpay_signature  → used to verify payment is genuine
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id                    INT AUTO_INCREMENT PRIMARY KEY,
    booking_id            INT            NOT NULL,
    razorpay_order_id     VARCHAR(100),               -- from Razorpay create-order
    razorpay_payment_id   VARCHAR(100),               -- from Razorpay after payment
    razorpay_signature    VARCHAR(255),               -- for HMAC verification
    amount                DECIMAL(10,2)  NOT NULL,    -- in rupees
    payment_status        ENUM('pending', 'paid', 'refunded', 'failed')
                                         DEFAULT 'pending',
    payment_method        VARCHAR(50),                -- upi, card, netbanking, etc.
    created_at            TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

-- ============================================================
-- 6. OTPS
--    Temporary codes for register verification + forgot password.
--    expires_at = created time + 10 minutes.
--    is_used = true after it's been verified once (prevents reuse).
--    purpose: 'register' or 'forgot_password'
-- ============================================================
CREATE TABLE IF NOT EXISTS otps (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    email       VARCHAR(100)  NOT NULL,
    otp_code    VARCHAR(6)    NOT NULL,               -- 6-digit code
    purpose     ENUM('register', 'forgot_password')   NOT NULL,
    expires_at  TIMESTAMP     NOT NULL,               -- NOW() + 10 minutes
    is_used     BOOLEAN       DEFAULT FALSE,
    created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- 7. WAITLIST
--    When a slot is full, customers can join a queue.
--    If someone cancels → backend checks this table →
--    sends email to first person → they get 30min to book.
--    notified_at = when the "slot opened" email was sent.
-- ============================================================
CREATE TABLE IF NOT EXISTS waitlist (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    user_id       INT       NOT NULL,
    slot_id       INT       NOT NULL,
    service_id    INT       NOT NULL,
    notified_at   TIMESTAMP NULL DEFAULT NULL,        -- null = not yet notified
    joined_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE,
    FOREIGN KEY (slot_id)    REFERENCES slots(id)    ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE
);

-- ============================================================
-- DONE. Verify by running: SHOW TABLES;
-- You should see 7 tables:
--   bookings, otps, payments, services, slots, users, waitlist
-- ============================================================