import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadToCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose"; // added for objectId

const generateAccessTokenAndRefreshToken = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Error generating tokens");
  }
};

const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  // ১. সব প্রয়োজনীয় ফিল্ড চেক করা
  if (![fullName, email, username, password].every((f) => f?.trim() !== "")) {
    throw new ApiError(
      400,
      "All fields (fullName, email, username, password) are required"
    );
  }

  // ২. আগে থেকে ইউজার আছে কিনা চেক করা
  const existedUser = await User.findOne({
    $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists with this username or email");
  }

  // ৩. Avatar এবং Cover Image এর লোকাল পাথ নেওয়া (multer file path access)
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }

  // ৪. Cloudinary তে ছবি আপলোড করা
  const avatar = await uploadToCloudinary(avatarLocalPath);
  const coverImage = coverImageLocalPath
    ? await uploadToCloudinary(coverImageLocalPath)
    : null;

  // const coverImage = await uploadToCloudinary(coverImageLocalPath);

  if (!avatar?.url) {
    throw new ApiError(500, "Failed to upload avatar image");
  }

  // ৫. নতুন ইউজার তৈরি করা
  const user = await User.create({
    fullName,
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // ৬. সেনসিটিভ ডাটা বাদ দিয়ে ইউজার রিটার্ন করা
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while creating user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

// ==================== LOGIN USER ====================
const loginUser = asyncHandler(async (req, res) => {
  // req body --> Data
  // username or email
  // find the user by email or username
  // password check korbo user er sathe
  // access OR refresh token generate korbo
  //  cookies set korbo
  // response send korbo

  const { email, username, password } = req.body;

  // ইমেইল অথবা ইউজারনেম এবং পাসওয়ার্ড দেয়া হয়েছে কিনা চেক
  if (!password && !email) {
    throw new ApiError(400, "Please provide email or username and password");
  }

  // ইউজার খুঁজে বের করা
  const user = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (!user) {
    throw new ApiError(404, "User not found with this email or username");
  }

  // পাসওয়ার্ড চেক করা
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

  // Access ও Refresh Token তৈরি করা
  const { accessToken, refreshToken } =
    await generateAccessTokenAndRefreshToken(user._id);

  // cookie set korbo (সেনসিটিভ ডাটা ছাড়া ইউজার ডাটা নেওয়া)
  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );
  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});


const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined,
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});


const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request, no refresh token");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(401, "Invalid refresh token, user not found");
    }
    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or does not match");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    // // ✅ FIX: naming correct
    // const { accessToken, refreshToken } =
    //   await generateAccessTokenAndRefreshToken(user._id);

    // const options = {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production",
    // };
    const { accessToken, newRefreshToken } =
      await generateAccessTokenAndRefreshToken(user._id);
    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});



const changeCurrentPassword = asyncHandler(async (req, res) => {
  //  req.body --> oldPassword, newPassword
  //  user er id-- > req.user._id
  //  you can write curentPassword and newPassword in req.body
  // req.body থেকে পুরানো ও নতুন পাসওয়ার্ড নেওয়া হচ্ছে
  const { oldPassword, newPassword } = req.body;

  // ইনপুট ভ্যালিডেশন: দুইটা ফিল্ডই আছে কিনা চেক
  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Both old and new password are required");
  }

  // নতুন পাসওয়ার্ড যেন পুরানোটার মতো না হয়
  if (oldPassword === newPassword) {
    throw new ApiError(400, "New password must be different from old password");
  }

  // লগইন করা ইউজারের ID দিয়ে ডাটাবেজ থেকে ইউজার খোঁজা হচ্ছে
  const user = await User.findById(req.user?._id);

  // ইউজার না পেলে error throw করা
  if (!user) throw new ApiError(404, "User not found");

  // পুরানো পাসওয়ার্ড সঠিক কিনা চেক (bcrypt compare)
  const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

  // যদি পুরানো পাসওয়ার্ড ভুল হয় → error
  if (!isPasswordCorrect) {
    throw new ApiError(400, "Old password is incorrect");
  }

  // নতুন পাসওয়ার্ড সেট করা হচ্ছে (pre-save middleware এ hash হবে)
  user.password = newPassword;

  // ডাটাবেজে আপডেট সেভ করা
  await user.save();

  // সফল হলে success response পাঠানো
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});


const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

const updateAccontDetails = asyncHandler(async (req, res) => {
  const { fullName, email } = req.body;


  if (!fullName && !email) {
    throw new ApiError(400, "Please provide fullName or email to update");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        fullName: fullName,
        email: email
      }
    },
    { new: true }
  ).select("-password")

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));

});


const updateUserAvatar = asyncHandler(async (req, res) => {
  // multer দিয়ে আপলোড করা ফাইলের path নেওয়া
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is missing");
  }

  // বর্তমান ইউজার খোঁজা (পুরানো avatar delete করার জন্য)
  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // ==================== OLD AVATAR DELETE ====================
  if (user.avatar?.public_id) {
    try {
      await cloudinary.uploader.destroy(user.avatar.public_id);
    } catch (error) {
      console.log("Cloudinary delete error:", error);
    }
  }

  // ==================== NEW AVATAR UPLOAD ====================
  const uploadedAvatar = await uploadToCloudinary(avatarLocalPath);

  if (!uploadedAvatar?.url || !uploadedAvatar?.public_id) {
    throw new ApiError(400, "Error while uploading avatar");
  }

  // ==================== DB UPDATE ====================
  user.avatar = {
    url: uploadedAvatar.url,
    public_id: uploadedAvatar.public_id,
  };

  await user.save();

  // password hide করার জন্য select use
  const updatedUser = await User.findById(user._id).select("-password");

  // ==================== RESPONSE ====================
  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Avatar updated successfully"));
});


const updateUserCoverImage = asyncHandler(async (req, res) => { 
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Cover image file is missing");
  }
  
  const coverImage = await uploadToCloudinary(coverImageLocalPath);
  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading cover image");
  }
  
  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { 
      $set: {
        coverImage: coverImage.url
      }
     },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Cover image updated successfully"));
  
});


// here use mongoDb aggregate pipeline

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username?.trim()) {
    throw new ApiError(400, "username is missing");
  }

  const channel = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        channelsSubscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribed: {
          $cond: {
            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
            then: true,
            else: false,
          },
        },
      },
    },
    {
      $project: {
        fullName: 1,
        username: 1,
        subscribersCount: 1,
        channelsSubscribedToCount: 1,
        isSubscribed: 1,
        avatar: 1,
        coverImage: 1,
        email: 1,
      },
    },
  ]);

  if (!channel?.length) {
    throw new ApiError(404, "channel does not exists");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, channel[0], "User channel fetched successfully")
    );
});



const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user._id),
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory",
        foreignField: "_id",
        as: "watchHistory",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {
                $first: "$owner",
              },
            },
          },
        ],
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        user[0].watchHistory,
        "Watch history fetched successfully"
      )
    );
});



export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccontDetails,
  updateUserAvatar,
  updateUserCoverImage,
  getUserChannelProfile,
  getWatchHistory
};
