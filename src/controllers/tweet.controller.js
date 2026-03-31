import mongoose, { isValidObjectId } from "mongoose";
import { Tweet } from "../models/tweet.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// 🐦 Create Tweet
const createTweet = asyncHandler(async (req, res) => {
  const { content } = req.body;

  // ❗ validation
  if (!content?.trim()) {
    throw new ApiError(400, "Tweet content is required");
  }

  // 🗄️ DB create
  const tweet = await Tweet.create({
    content,
    owner: req.user._id, // logged-in user
  });

  return res
    .status(201)
    .json(new ApiResponse(201, tweet, "Tweet created successfully"));
});

// 📄 Get User Tweets
const getUserTweets = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // ❗ validation
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  // 🔍 tweets find (latest first)
  const tweets = await Tweet.find({
    owner: userId,
  })
    .sort({ createdAt: -1 }) // newest first
    .select("-__v");

  return res
    .status(200)
    .json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
});

// ✏️ Update Tweet
const updateTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;
  const { content } = req.body;

  // ❗ validation
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Content is required");
  }

  // 🔍 tweet find
  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  // 🔐 owner check
  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not allowed to update this tweet");
  }

  // ✏️ update
  tweet.content = content;
  await tweet.save();

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});

// ❌ Delete Tweet
const deleteTweet = asyncHandler(async (req, res) => {
  const { tweetId } = req.params;

  // ❗ validation
  if (!isValidObjectId(tweetId)) {
    throw new ApiError(400, "Invalid tweet ID");
  }

  // 🔍 tweet find
  const tweet = await Tweet.findById(tweetId);

  if (!tweet) {
    throw new ApiError(404, "Tweet not found");
  }

  // 🔐 owner check
  if (tweet.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not allowed to delete this tweet");
  }

  // 🗑️ delete
  await tweet.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Tweet deleted successfully"));
});

export { createTweet, getUserTweets, updateTweet, deleteTweet };
