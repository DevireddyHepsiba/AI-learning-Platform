// import { OAuth2Client } from "google-auth-library";
// import User from "../models/User.js";
// import { generateToken } from "./jwt.js";

// const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// export const verifyGoogleToken = async (token) => {
//   const ticket = await client.verifyIdToken({
//     idToken: token,
//     audience: process.env.GOOGLE_CLIENT_ID,
//   });

//   return ticket.getPayload();
// };

// export const googleLogin = async (req, res, next) => {
//   try {
//     const { credential } = req.body;

//     if (!credential) {
//       return res.status(400).json({
//         success: false,
//         error: "Google credential is required",
//       });
//     }

//     const payload = await verifyGoogleToken(credential);

//     const { email, name, picture, sub, email_verified } = payload || {};

//     if (!email_verified) {
//       return res.status(401).json({
//         success: false,
//         error: "Google email is not verified",
//       });
//     }

//     let user = await User.findOne({ email });

//     if (!user) {
//       user = await User.create({
//         username: name || email.split("@")[0],
//         email,
//         googleId: sub,
//         profileImage: picture,
//       });
//     } else {
//       let changed = false;
//       if (!user.googleId) {
//         user.googleId = sub;
//         changed = true;
//       }
//       if (!user.profileImage && picture) {
//         user.profileImage = picture;
//         changed = true;
//       }
//       if (changed) await user.save();
//     }

//     const token = generateToken(user._id);

//     res.json({
//       success: true,
//       data: {
//         user,
//         token,
//       },
//     });
//   } catch (err) {
//     next(err);
//   }
// };


import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { generateToken } from "./jwt.js";

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

// =====================================================
// VERIFY GOOGLE ID TOKEN
// =====================================================

export const verifyGoogleToken = async (token) => {
  const ticket = await client.verifyIdToken({
    idToken: token,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  return ticket.getPayload();
};

// =====================================================
// GOOGLE LOGIN
// =====================================================

export const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;

    // -----------------------------------------------
    // 1. Check credential
    // -----------------------------------------------

    if (!credential) {
      return res.status(400).json({
        success: false,
        error: "Google credential is required",
      });
    }

    // -----------------------------------------------
    // 2. Verify Google token
    // -----------------------------------------------

    const payload = await verifyGoogleToken(credential);

    if (!payload) {
      return res.status(401).json({
        success: false,
        error: "Invalid Google token",
      });
    }

    // -----------------------------------------------
    // 3. Get Google user information
    // -----------------------------------------------

    const {
      sub: googleId,
      email,
      name,
      picture,
      email_verified,
    } = payload;

    // -----------------------------------------------
    // 4. Check verified email
    // -----------------------------------------------

    if (!email || !email_verified) {
      return res.status(401).json({
        success: false,
        error: "Google email is not verified",
      });
    }

    // -----------------------------------------------
    // 5. Normalize email
    // -----------------------------------------------

    const normalizedEmail = email.trim().toLowerCase();

    // -----------------------------------------------
    // 6. Find existing user
    // -----------------------------------------------

    let user = await User.findOne({
      email: normalizedEmail,
    });

    // =================================================
    // 7. USER DOES NOT EXIST
    // =================================================

    if (!user) {

      // Create a username
      let username =
        name ||
        normalizedEmail.split("@")[0];

      username = username
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "");

      // Make sure username is not already taken
      let usernameExists = await User.findOne({
        username,
      });

      if (usernameExists) {
        username =
          normalizedEmail
            .split("@")[0]
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "");

        username += Math.floor(Math.random() * 10000);
      }

      // Create Google user
      user = await User.create({
        username,
        email: normalizedEmail,
        googleId,
        profileImage: picture || "",
      });
    }

    // =================================================
    // 8. USER ALREADY EXISTS
    // =================================================

    else {

      let changed = false;

      // Existing normal account
      // Link Google account to it
      if (!user.googleId) {
        user.googleId = googleId;
        changed = true;
      }

      // Add Google profile picture if missing
      if (!user.profileImage && picture) {
        user.profileImage = picture;
        changed = true;
      }

      if (changed) {
        await user.save();
      }
    }

    // -----------------------------------------------
    // 9. Generate YOUR JWT
    // -----------------------------------------------

    const token = generateToken(user._id);

    // -----------------------------------------------
    // 10. Send response
    // -----------------------------------------------

    return res.status(200).json({
      success: true,
      message: "Google login successful",

      data: {
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          profileImage: user.profileImage,
        },

        token,
      },
    });

  } catch (err) {

    console.error("GOOGLE LOGIN ERROR:", err);

    return res.status(401).json({
      success: false,
      error: "Invalid Google credential",
    });
  }
};