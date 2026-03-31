import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// 🎥 Toggle Video Like (Like / Unlike)
const toggleVideoLike = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  // ❗ validation
  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // 🔍 already like আছে কিনা check
  const existingLike = await Like.findOne({
    video: videoId,
    likedBy: req.user._id,
  });

  if (existingLike) {
    // ❌ unlike (delete)
    await existingLike.deleteOne();

    return res.status(200).json(new ApiResponse(200, {}, "Video unliked"));
  }

  // ❤️ like create
  await Like.create({
    video: videoId,
    likedBy: req.user._id,
  });

  return res.status(200).json(new ApiResponse(200, {}, "Video liked"));
});

// 💬 Toggle Comment Like
const toggleCommentLike = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  // ❗ validation
  if (!isValidObjectId(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  // 🔍 already like check
  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: req.user._id,
  });

  if (existingLike) {
    // ❌ unlike
    await existingLike.deleteOne();

    return res.status(200).json(new ApiResponse(200, {}, "Comment unliked"));
  }

  // ❤️ like
  await Like.create({
    comment: commentId,
    likedBy: req.user._id,
  });

  return res.status(200).json(new ApiResponse(200, {}, "Comment liked"));
});

// 🐦 Toggle Tweet Like
const toggleTweetLike = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  // ❗ validation
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  // 🔍 check existing like
  const existingLike = await Like.findOne({
    tweet: tweetId,
    likedBy: req.user._id,
  });

  if (existingLike) {
    // ❌ unlike
    await existingLike.deleteOne();

    return res.status(200).json(new ApiResponse(200, {}, "Tweet unliked"));
  }

  // ❤️ like
  await Like.create({
    tweet: tweetId,
    likedBy: req.user._id,
  });

  return res.status(200).json(new ApiResponse(200, {}, "Tweet liked"));
});

// ❤️ Get all liked videos
const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // 🔥 aggregation use করে liked videos fetch
  const likedVideos = await Like.aggregate([
    {
      $match: {
        likedBy: new mongoose.Types.ObjectId(userId),
        video: { $ne: null }, // শুধু video likes
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "video",
        foreignField: "_id",
        as: "video",
      },
    },
    {
      $addFields: {
        video: { $first: "$video" }, // array → object
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "video.owner",
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
        owner: { $first: "$owner" },
      },
    },
    {
      $project: {
        _id: 0,
        video: 1,
        owner: 1,
        createdAt: 1,
      },
    },
  ]);

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    );
});

export { toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos };
