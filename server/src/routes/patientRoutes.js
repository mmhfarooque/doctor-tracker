import express from 'express';
import {
  getPatients,
  exportPatients,
  getPatientById,
  getPatientHistory,
  createPatient,
  updatePatient,
  transferPatient,
  archivePatient,
  restorePatient,
  deletePatient,
  bulkPatients,
} from '../controllers/patientController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// Reads are scoped inside the controller (doctors only see their own patients)
router.get('/', getPatients);
router.get('/export', exportPatients);
router.post('/bulk', bulkPatients); // status: any role within scope · archive/restore: admin (checked inside)
router.post('/', authorize('admin', 'doctor'), createPatient);

router.get('/:id', getPatientById);
router.get('/:id/history', getPatientHistory);
router.put('/:id', updatePatient); // nurses limited to status / notes / follow-up (checked inside)
router.delete('/:id', authorize('admin'), deletePatient);
router.post('/:id/transfer', authorize('admin', 'doctor'), transferPatient);
router.post('/:id/archive', authorize('admin'), archivePatient);
router.post('/:id/restore', authorize('admin'), restorePatient);

export default router;
