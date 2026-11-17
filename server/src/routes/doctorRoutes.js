import express from 'express';
import {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  getDoctorPatients,
  addPatientToDoctor,
  deletePatientFromDoctor,
  getDoctorFilters,
} from '../controllers/doctorController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // Require authentication for all doctor routes

router.route('/')
  .get(getDoctors)
  .post(createDoctor);

router.get('/filters', getDoctorFilters); // must be registered before '/:id'

router.route('/:id')
  .get(getDoctorById)
  .put(updateDoctor)
  .delete(deleteDoctor);

router.route('/:id/patients')
  .get(getDoctorPatients)
  .post(addPatientToDoctor);

router.route('/:id/patients/:patientId')
  .delete(deletePatientFromDoctor);

export default router;
