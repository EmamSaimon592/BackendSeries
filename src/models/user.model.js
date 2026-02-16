import mongoose, { Schema } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
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
    avater: {
      type: String, // cloudinary theke image url asbe
      required: true,
    },
    coverImage: {
      type: String, // cloudinary theke image url asbe
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video",
      },
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"],
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);




userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    {
      _id: this._id,
      email: this.email,
      username: this.username,
      fullName: this.fullName,
      //avater: this.avater,
     // coverImage: this.coverImage,
    },
    process.env.ACCESS_TOKEN_SECRET,
    {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN,
    }
  );
};


userSchema.methods.generateRefreshToken = function () { 
  return jwt.sign(
    {
      _id: this._id,
     // email: this.email,
     // username: this.username,
     // fullName: this.fullName,
    },
    process.env.REFRESH_TOKEN_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN,
    }
  );
};




const User = mongoose.model("User", userSchema);
export default User;

// ei c line er mane holo je amra mongoose theke model create korchi, jekhane "User" holo model er name ebong userSchema holo schema jeta amra age define korechi. Tarpor amra ei model ke export kore dichi jate onno jaygay use kora jay.

// short version:
// export const User = mongoose.model("User", userSchema);
