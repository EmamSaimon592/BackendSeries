import mongoose from "mongoose";
import { Video } from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// 📊 Channel Stats (Dashboard Data)
const getChannelStats = asyncHandler(async (req, res) => {
  const userId = req.user?._id; // logged-in user

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  // 🎥 Total Videos count
  const totalVideos = await Video.countDocuments({
    owner: userId,
  });

  // 👀 Total Views (aggregation use করে সব ভিডিওর views যোগ)
  const viewsResult = await Video.aggregate([
    {
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    },
    {
      $group: {
        _id: null,
        totalViews: { $sum: "$views" }, // সব views যোগ
      },
    },
  ]);

  const totalViews = viewsResult[0]?.totalViews || 0;

  // 👥 Total Subscribers
  const totalSubscribers = await Subscription.countDocuments({
    channel: userId,
  });

  // ❤️ Total Likes (video এর উপর like count)
  const totalLikes = await Like.countDocuments({
    owner: userId,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        totalVideos,
        totalViews,
        totalSubscribers,
        totalLikes,
      },
      "Channel stats fetched successfully"
    )
  );
});

// 🎥 Channel এর সব ভিডিও বের করা
const getChannelVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    throw new ApiError(401, "Unauthorized");
  }

  // 📄 সব ভিডিও find করা (latest first)
  const videos = await Video.find({
    owner: userId,
  })
    .sort({ createdAt: -1 }) // newest first
    .select("-__v"); // unnecessary field remove

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Channel videos fetched successfully"));
});

export { getChannelStats, getChannelVideos };
