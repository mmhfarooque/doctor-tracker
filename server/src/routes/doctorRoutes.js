import express from 'express';
import {
  getDoctors,
  getDoctorFilters,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor,
  reassignDoctorPatients,
  getDoctorPatients,
  addPatientToDoctor,
  deletePatientFromDoctor,
} from '../controllers/doctorController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

router.get('/', getDoctors);
router.get('/filters', getDoctorFilters); // before '/:id'
router.post('/', authorize('admin'), createDoctor);

router.get('/:id', getDoctorById);
router.put('/:id', authorize('admin'), updateDoctor);
router.delete('/:id', authorize('admin'), deleteDoctor);
router.post('/:id/reassign', authorize('admin'), reassignDoctorPatients);

router.get('/:id/patients', getDoctorPatients); // doctors: own roster only (checked inside)
router.post('/:id/patients', authorize('admin', 'doctor'), addPatientToDoctor);
router.delete('/:id/patients/:patientId', authorize('admin'), deletePatientFromDoctor);

export default router;
