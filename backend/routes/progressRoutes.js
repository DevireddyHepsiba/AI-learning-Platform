import express from 'express';
import {
    getDashboard,

} from '../controllers/progessController.js';
import protect from '../middleware/auth.js';

const router = express.Router();

router.use(protect);

router.get('/dashboard',getDashboard);
export default router;