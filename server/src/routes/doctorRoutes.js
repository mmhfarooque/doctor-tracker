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
} from '../controllers/doctorController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.use(protect); // Require authentication for all doctor routes

router.route('/')
  .get(getDoctors)
  .post(createDoctor);

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
