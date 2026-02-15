import mongoose, { Schema } from "mongoose";
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    avater: {
      type: String, // cloudinary theke image url asbe
      required: true
    },
    coverImage: {
      type: String, // cloudinary theke image url asbe
      
    },
    watchHistory: [
      {
        type: Schema.Types.ObjectId,
        ref: "Video"
      }
    ],
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters long"]
    },
    refreshToken: {
      type: String
    }
  },
  { timestamps: true }
  
);

const User = mongoose.model("User", userSchema);
export default User;


// ei c line er mane holo je amra mongoose theke model create korchi, jekhane "User" holo model er name ebong userSchema holo schema jeta amra age define korechi. Tarpor amra ei model ke export kore dichi jate onno jaygay use kora jay.

// short version: 
// export const User = mongoose.model("User", userSchema);