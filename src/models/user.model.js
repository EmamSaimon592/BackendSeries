import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true, // 🔹 auto lowercase
      trim: true,
      index: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    // 🔥 FIX: avatar এখন object (url + public_id)
    avatar: {
      url: {
        type: String,
        required: true,
      },
      public_id: {
        type: String,
        required: true, // 🔴 must (delete করার জন্য লাগবে)
      },
    },

    // 🔥 cover image optional
    coverImage: {
      url: {
        type: String,
      },
      public_id: {
        type: String,
      },
    },

    // 🔹 user watch history (ভিডিও reference)
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // 🔐 by default password hide thakbe query te
    },

    refreshToken: {
      type: String,
      select: false, // 🔐 by default refresh token hide thakbe query te
    },
  },
  { timestamps: true }
);

// ==================== INDEXES ====================
// 🔥 বড় অ্যাপের জন্য query fast করতে
userSchema.index({ email: 1 });
userSchema.index({ username: 1 });


// 🔐 Password hash (save এর আগে auto hash হবে)
userSchema.pre("save", async function (next) {
  try {
    if (!this.isModified("password")) return next();

    this.password = await bcrypt.hash(this.password, 10);
    next();
  } catch (error) {
    next(error);
  }
});

// 🔑 Password check method
// 🔑 login এর সময় password compare
userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

// 🔑 Access Token generate
userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
    }
  );
};

// 🔑 Refresh Token generate
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    {
      _id: this._id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
    }
  );
};


// ==================== HIDE SENSITIVE DATA ====================
// 🔥 response এ password, refreshToken auto remove হবে
userSchema.methods.toJSON = function () {
  const user = this.toObject();

  delete user.password;
  delete user.refreshToken;

  return user;
};

export const User = mongoose.model("User", userSchema);
// ei c line er mane holo je amra mongoose theke model create korchi, jekhane "User" holo model er name ebong userSchema holo schema jeta amra age define korechi. Tarpor amra ei model ke export kore dichi jate onno jaygay use kora jay.

// short version:
// export const User = mongoose.model("User", userSchema);
