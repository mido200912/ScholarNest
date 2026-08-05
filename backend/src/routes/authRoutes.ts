import express from 'express';
import { registerUser, loginUser, createAssistantAdmin, updateProfile, getAllUsers, getStaff, deleteUser } from '../controllers/authController';
import { protect, admin } from '../middleware/auth';

const router = express.Router();

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/assistant', protect, admin, createAssistantAdmin);
router.put('/profile', protect, updateProfile);
router.get('/users', protect, admin, getAllUsers);
router.get('/staff', protect, admin, getStaff);
router.delete('/users/:id', protect, admin, deleteUser);

export default router;
