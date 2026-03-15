//  Setup required in .env:
//  EMAIL_USER = your_gmail@gmail.com
//  EMAIL_PASS = your_gmail_app_password

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// ── Create reusable transporter ──
// Created once, reused for every email sent
const transporter = nodemailer.createTransport({
   service: 'gmail',
   auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
   }
});

// ── Verify transporter on startup ──
transporter.verify((err) => {
   if (err) {
      console.error('❌ Mail service error:', err.message);
   } else {
      console.log('✅ Mail service ready');
   }
});

// ── Base send function ──
// All specific email functions below call this
const sendMail = async ({ to, subject, html }) => {
   await transporter.sendMail({
      from: `"SlotSync" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html
   });
};

// ── Send OTP email ──
const sendOtpEmail = async (email, otp, purpose) => {
   const isReset = purpose === 'forgot_password';
   const subject = isReset ? 'Reset your SlotSync password' : 'Verify your SlotSync account';
   const heading = isReset ? 'Password Reset Code' : 'Email Verification Code';
   const bodyText = isReset
      ? 'You requested to reset your password. Use the code below:'
      : 'Thanks for signing up! Use the code below to verify your email:';

   await sendMail({
      to: email,
      subject,
      html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #f0f0f8; border-radius: 12px;">
                <h2 style="color: #6c63ff; margin-bottom: 8px;">SlotSync</h2>
                <h3 style="margin-bottom: 16px;">${heading}</h3>
                <p style="color: #a0a0b8; margin-bottom: 24px;">${bodyText}</p>
                <div style="background: #16161f; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                    <span style="font-size: 2.5rem; font-weight: 700; letter-spacing: 0.3em; color: #f0f0f8;">${otp}</span>
                </div>
                <p style="color: #606078; font-size: 0.85rem;">This code expires in <strong style="color:#a0a0b8">10 minutes</strong>. Do not share it with anyone.</p>
                <hr style="border-color: rgba(255,255,255,0.08); margin: 24px 0;" />
                <p style="color: #606078; font-size: 0.78rem;">If you didn't request this, you can safely ignore this email.</p>
            </div>
        `
   });
};

// ── Send booking confirmation email ──
const sendBookingConfirmation = async (email, { name, serviceName, date, startTime, price }) => {
   await sendMail({
      to: email,
      subject: 'Booking Confirmed — SlotSync',
      html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #f0f0f8; border-radius: 12px;">
                <h2 style="color: #6c63ff; margin-bottom: 8px;">SlotSync</h2>
                <h3 style="color: #22d3a5; margin-bottom: 16px;">✓ Booking Confirmed</h3>
                <p style="color: #a0a0b8;">Hi ${name}, your appointment is confirmed.</p>
                <div style="background: #16161f; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0 0 8px;"><strong>Service:</strong> ${serviceName}</p>
                    <p style="margin: 0 0 8px;"><strong>Date:</strong> ${date}</p>
                    <p style="margin: 0 0 8px;"><strong>Time:</strong> ${startTime}</p>
                    <p style="margin: 0;"><strong>Amount Paid:</strong> ₹${price}</p>
                </div>
                <p style="color: #606078; font-size: 0.85rem;">You will receive a reminder 1 hour before your appointment.</p>
            </div>
        `
   });
};

// ── Send appointment reminder email ──
const sendReminderEmail = async (email, { name, serviceName, date, startTime }) => {
   await sendMail({
      to: email,
      subject: 'Reminder: Your appointment is in 1 hour — SlotSync',
      html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #f0f0f8; border-radius: 12px;">
                <h2 style="color: #6c63ff; margin-bottom: 8px;">SlotSync</h2>
                <h3 style="margin-bottom: 16px;">⏰ Appointment Reminder</h3>
                <p style="color: #a0a0b8;">Hi ${name}, your appointment is coming up in <strong style="color:#f0f0f8">1 hour</strong>.</p>
                <div style="background: #16161f; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0 0 8px;"><strong>Service:</strong> ${serviceName}</p>
                    <p style="margin: 0 0 8px;"><strong>Date:</strong> ${date}</p>
                    <p style="margin: 0;"><strong>Time:</strong> ${startTime}</p>
                </div>
            </div>
        `
   });
};

// ── Send cancellation email ──
const sendCancellationEmail = async (email, { name, serviceName, date, startTime }) => {
   await sendMail({
      to: email,
      subject: 'Booking Cancelled — SlotSync',
      html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #f0f0f8; border-radius: 12px;">
                <h2 style="color: #6c63ff; margin-bottom: 8px;">SlotSync</h2>
                <h3 style="color: #f87171; margin-bottom: 16px;">Booking Cancelled</h3>
                <p style="color: #a0a0b8;">Hi ${name}, your booking has been cancelled.</p>
                <div style="background: #16161f; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0 0 8px;"><strong>Service:</strong> ${serviceName}</p>
                    <p style="margin: 0 0 8px;"><strong>Date:</strong> ${date}</p>
                    <p style="margin: 0;"><strong>Time:</strong> ${startTime}</p>
                </div>
                <p style="color: #606078; font-size: 0.85rem;">If you didn't cancel this, please contact support immediately.</p>
            </div>
        `
   });
};

// ── Send waitlist notification email ──
const sendWaitlistEmail = async (email, { name, serviceName, date, startTime }) => {
   await sendMail({
      to: email,
      subject: 'A slot opened up for you — SlotSync',
      html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #f0f0f8; border-radius: 12px;">
                <h2 style="color: #6c63ff; margin-bottom: 8px;">SlotSync</h2>
                <h3 style="color: #fbbf24; margin-bottom: 16px;">🔔 Slot Available</h3>
                <p style="color: #a0a0b8;">Hi ${name}, a slot you were waiting for just opened up!</p>
                <div style="background: #16161f; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <p style="margin: 0 0 8px;"><strong>Service:</strong> ${serviceName}</p>
                    <p style="margin: 0 0 8px;"><strong>Date:</strong> ${date}</p>
                    <p style="margin: 0;"><strong>Time:</strong> ${startTime}</p>
                </div>
                <p style="color: #a0a0b8;">Log in and book it before someone else does. This slot is only held for <strong style="color:#f0f0f8">30 minutes</strong>.</p>
            </div>
        `
   });
};

// ── Send welcome email ──
// Triggered once after account is verified
const sendWelcomeEmail = async (email, name) => {
   await sendMail({
      to: email,
      subject: 'Welcome to SlotSync 🎉',
      html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #0a0a0f; color: #f0f0f8; border-radius: 12px;">
                <h2 style="color: #6c63ff; margin-bottom: 8px;">SlotSync</h2>
                <h3 style="margin-bottom: 16px;">Welcome aboard, ${name}! 👋</h3>
                <p style="color: #a0a0b8; margin-bottom: 20px; line-height: 1.7;">
                    Your account has been verified. You can now browse services
                    and book appointments in seconds — no calls, no back-and-forth.
                </p>
                <a href="${process.env.FRONTEND_URL}/pages/services.html"
                   style="display: inline-block; background: #6c63ff; color: #fff; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none; margin-bottom: 24px;">
                    Browse Services
                </a>
                <hr style="border-color: rgba(255,255,255,0.08); margin: 24px 0;" />
                <p style="color: #606078; font-size: 0.78rem;">
                    If you didn't create this account, please ignore this email.
                </p>
            </div>
        `
   });
};

export {
   sendOtpEmail,
   sendWelcomeEmail,
   sendBookingConfirmation,
   sendReminderEmail,
   sendCancellationEmail,
   sendWaitlistEmail
};
