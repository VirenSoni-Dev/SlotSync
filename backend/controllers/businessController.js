import * as businessModel from '../models/businessModel.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// ============================================================
//  GET /api/admin/business
//  Returns the business profile. Returns null data (not an
//  error) if the profile hasn't been set up yet — the frontend
//  uses this to show an onboarding prompt.
// ============================================================
const getProfile = async (req, res, next) => {
   try {
      const profile = await businessModel.getProfile();
      return sendSuccess(res, 'Business profile fetched.', profile);
   } catch (err) {
      next(err);
   }
};

// ============================================================
//  PUT /api/admin/business
//  Creates or updates the single business profile row.
//  All fields except name are optional.
// ============================================================
const updateProfile = async (req, res, next) => {
   try {
      const { name, tagline, email, phone, address, category, website } = req.body;

      if (!name || !name.trim()) {
         return sendError(res, 'Business name is required.', 400);
      }

      const profile = await businessModel.upsertProfile({
         name: name.trim(),
         tagline: tagline?.trim() || null,
         email: email?.trim() || null,
         phone: phone?.trim() || null,
         address: address?.trim() || null,
         category: category?.trim() || null,
         website: website?.trim() || null,
      });

      return sendSuccess(res, 'Business profile updated.', profile);
   } catch (err) {
      next(err);
   }
};

export { getProfile, updateProfile };