// // import mongoose from "mongoose";
// // import bcrypt from "bcryptjs";

// // const userSchema = new mongoose.Schema(
// //   {
// //     username: {
// //       type: String,
// //       required: true,
// //       unique: true,
// //     },
// //     email: {
// //       type: String,
// //       required: true,
// //       unique: true,
// //     },
// //     password: {
// //       type: String,
// //       required: false,
// //       select: false,
// //     },
// //     googleId: {
// //       type: String,
// //       unique: true,
// //       sparse: true,
// //     },
// //     profileImage: {
// //       type: String,
// //       default: null,
// //     },
// //   },
// //   { timestamps: true }
// // );

// // /* Hash password */
// // userSchema.pre("save", async function () {
// //   if (!this.isModified("password")) return;
// //   this.password = await bcrypt.hash(this.password, 10);
// // });

// // /* Compare password */
// // userSchema.methods.matchPassword = async function (enteredPassword) {
// //   return await bcrypt.compare(enteredPassword, this.password);
// // };

// // export default mongoose.model("User", userSchema);



// import mongoose from "mongoose";
// import bcrypt from "bcryptjs";

// const userSchema = new mongoose.Schema(
//   {
//     username: {
//       type: String,
//       required: [true, "Username is required"],
//       unique: true,
//       trim: true,
//       lowercase: true,
//       minlength: 3,
//       maxlength: 20,
//     },

//     email: {
//       type: String,
//       required: [true, "Email is required"],
//       unique: true,
//       trim: true,
//       lowercase: true,
//       match: [
//         /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
//         "Please enter a valid email",
//       ],
//     },

//     password: {
//       type: String,
//       required: function () {
//         return !this.googleId;
//       },
//       minlength: 6,
//       select: false,
//     },

//     googleId: {
//       type: String,
//       default: null,
//     },

//     profileImage: {
//       type: String,
//       default: "",
//     },
//   },
//   {
//     timestamps: true,
//   }
// );



// userSchema.pre("save", async function (next) {
//   try {
//     if (!this.isModified("password")) {
//       return next();
//     }

//     const salt = await bcrypt.genSalt(10);

//     this.password = await bcrypt.hash(this.password, salt);

//     next();
//   } catch (error) {
//     next(error);
//   }
// });


// userSchema.methods.matchPassword = async function (enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };



// userSchema.methods.toJSON = function () {
//   const user = this.toObject();

//   delete user.password;

//   return user;
// };


// export default mongoose.model("User", userSchema);



import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 20,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },

    // Required for normal users,
    // optional for Google users
    password: {
      type: String,
      required: function () {
        return !this.googleId;
      },
      minlength: 6,
      select: false,
    },

    // Google account ID
    googleId: {
      type: String,
    },

    profileImage: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Only Google-linked accounts have a googleId. Excluding missing/null values
// lets any number of password-only accounts coexist with a unique Google ID.
userSchema.index(
  { googleId: 1 },
  {
    unique: true,
    partialFilterExpression: { googleId: { $type: "string" } },
  }
);

// Hash password before saving
userSchema.pre("save", async function () {
  try {
    // Don't hash if password wasn't changed
    if (!this.isModified("password") || !this.password) {
      return;
    }

    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Don't send password in API response
userSchema.methods.toJSON = function () {
  const user = this.toObject();

  delete user.password;

  return user;
};

export default mongoose.model("User", userSchema);
