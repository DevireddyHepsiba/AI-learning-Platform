import express from "express";
import { body } from "express-validator";

import {
  register,
  login,
  changePassword,
  getProfile,
  updateProfile,
} from "../controllers/authController.js";
import protect from "../middleware/auth.js";

const router = express.Router();

/* REGISTER */
router.post(
  "/register",
  [
    body("username").isLength({ min: 3 }),
    body("email").isEmail(),
    body("password").isLength({ min: 6 }),
  ],
  register
);

/* LOGIN */
router.post(
  "/login",
  [
    body("email").isEmail(),
    body("password").notEmpty(),
  ],
  login
);

/* CHANGE PASSWORD (protected) */
router.post("/change-password", protect, changePassword);
router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfile);

export default router;
