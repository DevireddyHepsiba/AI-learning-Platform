// // import express from "express";
// // import { body } from "express-validator";

// // import {
// //   register,
// //   login,
// //   changePassword,
// //   getProfile,
// //   updateProfile,
// // } from "../auth/controller/authController.js";
// // import protect from "../middleware/auth.js";

// // const router = express.Router();

// // /* REGISTER */
// // router.post(
// //   "/register",
// //   [
// //     body("username").isLength({ min: 3 }),
// //     body("email").isEmail(),
// //     body("password").isLength({ min: 6 }),
// //   ],
// //   register
// // );

// // /* LOGIN */
// // router.post(
// //   "/login",
// //   [
// //     body("email").isEmail(),
// //     body("password").notEmpty(),
// //   ],
// //   login
// // );

// // /* CHANGE PASSWORD (protected) */
// // router.post("/change-password", protect, changePassword);
// // router.get("/profile", protect, getProfile);
// // router.put("/profile", protect, updateProfile);

// // export default router;


// import express from "express";
// import { body } from "express-validator";

// import {
//   register,
//   login,
//   changePassword,
//   getProfile,
//   updateProfile,
// } from "../controller/authController.js";

// import { googleLogin } from "../utils/googleAuth.js";

// import protect from "../../middleware/auth.js";

// const router = express.Router();

// /* ===========================
//    REGISTER
// =========================== */
// router.post(
//   "/register",
//   [
//     body("username")
//       .trim()
//       .isLength({ min: 3, max: 20 })
//       .withMessage("Username must be between 3 and 20 characters"),

//     body("email")
//       .trim()
//       .normalizeEmail()
//       .isEmail()
//       .withMessage("Please enter a valid email"),

//     body("password")
//       .isLength({ min: 6 })
//       .withMessage("Password must be at least 6 characters"),
//   ],
//   register
// );

// /* ===========================
//    LOGIN
// =========================== */
// router.post(
//   "/login",
//   [
//     body("email")
//       .trim()
//       .normalizeEmail()
//       .isEmail()
//       .withMessage("Please enter a valid email"),

//     body("password")
//       .notEmpty()
//       .withMessage("Password is required"),
//   ],
//   login
// );

// /* ===========================
//    GOOGLE LOGIN (ID token verify)
//    Frontend should POST { credential } where credential is Google ID token
// ============================ */
// router.post(
//   "/google",
//   [body("credential").notEmpty().withMessage("Google credential is required")],
//   googleLogin
// );

// /* ===========================
//    PROFILE
// =========================== */
// router.get("/profile", protect, getProfile);

// router.put(
//   "/profile",
//   protect,
//   [
//     body("username")
//       .optional()
//       .trim()
//       .isLength({ min: 3, max: 20 })
//       .withMessage("Username must be between 3 and 20 characters"),

//     body("email")
//       .optional()
//       .trim()
//       .normalizeEmail()
//       .isEmail()
//       .withMessage("Invalid email"),

//     body("profileImage")
//       .optional()
//       .isString()
//       .withMessage("Invalid profile image"),
//   ],
//   updateProfile
// );

// /* ===========================
//    CHANGE PASSWORD
// =========================== */
// router.put(
//   "/change-password",
//   protect,
//   [
//     body("oldPassword")
//       .notEmpty()
//       .withMessage("Old password is required"),

//     body("newPassword")
//       .isLength({ min: 6 })
//       .withMessage("New password must be at least 6 characters"),
//   ],
//   changePassword
// );

// export default router;




import express from "express";
import { body } from "express-validator";

import {
  register,
  login,
  changePassword,
  getProfile,
  updateProfile,
} from "../controller/authController.js";

import { googleLogin } from "../utils/googleAuth.js";

import protect from "../middleware/auth.js";

const router = express.Router();

/* =====================================================
   REGISTER
===================================================== */

router.post(
  "/register",
  [
    body("username")
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage(
        "Username must be between 3 and 20 characters"
      ),

    body("email")
      .trim()
      .normalizeEmail()
      .isEmail()
      .withMessage(
        "Please enter a valid email"
      ),

    body("password")
      .isLength({ min: 6 })
      .withMessage(
        "Password must be at least 6 characters"
      ),
  ],
  register
);


/* =====================================================
   LOGIN
===================================================== */

router.post(
  "/login",
  [
    body("email")
      .trim()
      .normalizeEmail()
      .isEmail()
      .withMessage(
        "Please enter a valid email"
      ),

    body("password")
      .notEmpty()
      .withMessage(
        "Password is required"
      ),
  ],
  login
);


/* =====================================================
   GOOGLE LOGIN
===================================================== */

router.post(
  "/google",
  [
    body("credential")
      .notEmpty()
      .withMessage(
        "Google credential is required"
      ),
  ],
  googleLogin
);


/* =====================================================
   GET PROFILE
===================================================== */

router.get(
  "/profile",
  protect,
  getProfile
);


/* =====================================================
   UPDATE PROFILE
===================================================== */

router.put(
  "/profile",
  protect,
  [
    body("username")
      .optional()
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage(
        "Username must be between 3 and 20 characters"
      ),

    body("email")
      .optional()
      .trim()
      .normalizeEmail()
      .isEmail()
      .withMessage(
        "Invalid email"
      ),

    body("profileImage")
      .optional()
      .isString()
      .withMessage(
        "Invalid profile image"
      ),
  ],
  updateProfile
);


/* =====================================================
   CHANGE PASSWORD
===================================================== */

router.put(
  "/change-password",
  protect,
  [
    body("oldPassword")
      .notEmpty()
      .withMessage(
        "Old password is required"
      ),

    body("newPassword")
      .isLength({ min: 6 })
      .withMessage(
        "New password must be at least 6 characters"
      ),
  ],
  changePassword
);


export default router;