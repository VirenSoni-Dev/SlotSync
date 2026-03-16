import * as serviceModel from '../models/serviceModel.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

// ============================================================
//  GET /api/services
//  Public — anyone can view services
// ============================================================
const getAllServices = async (req, res, next) => {
   try {
      const services = await serviceModel.getAllServices();
      return sendSuccess(res, 'Services retrieved successfully', services);
   } catch (err) {
      next(err);
   }
};

// ============================================================
//  GET /api/services/:id
//  Public — get one service by ID
// ============================================================
const getServiceById = async (req, res, next) => {
   try {
      const service = await serviceModel.getServiceById(req.params.id);

      if (!service) {
         return sendError(res, 'Service not found', 404);
      }

      return sendSuccess(res, 'Service retrieved successfully', service);
   } catch (err) {
      next(err);
   }
};

// ============================================================
//  POST /api/services
//  Admin only — create a new service
// ============================================================
const createService = async (req, res, next) => {
   try {
      const { service_name, description, price, duration_minutes } = req.body;

      const insertId = await serviceModel.createService({
         service_name,
         description,
         price,
         duration_minutes
      });

      const newSevice = await serviceModel.getServiceById(insertId);

      return sendSuccess(res, 'Service created successfully', newSevice, 201);
   } catch (error) {
      next(error);
   }
};

// ============================================================
//  PUT /api/services/:id
//  Admin only — update an existing service
// ============================================================
const updateService = async (req, res, next) => {
   try {
      const { id } = req.params;
      const { service_name, description, price, duration_minutes } = req.body;

      const existing = await serviceModel.getServiceById(id);
      if (!existing) {
         return sendError(res, 'Service not found', 404);
      }

      await serviceModel.updateService(id, {
         service_name,
         description,
         price,
         duration_minutes
      });

      const updated = await serviceModel.getServiceById(id);

      return sendSuccess(res, 'Service updated successfully', updated);
   } catch (error) {
      next(error);
   }
};

// ============================================================
//  DELETE /api/services/:id
//  Admin only — soft delete (marks inactive)
// ============================================================
const deleteService = async (req, res, next) => {
   try {
      const { id } = req.params;

      const existing = await serviceModel.getServiceById(id);
      if (!existing) {
         return sendError(res, 'Service not found', 404);
      }

      await serviceModel.deleteService(id);

      return sendSuccess(res, 'Service deleted successfully');
   } catch (error) {
      next(error);
   }
};

export {
   getAllServices,
   getServiceById,
   createService,
   updateService,
   deleteService
}
