import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// 🎥 Get all comments for a video (pagination সহ)
const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params; // URL থেকে videoId
  const { page = 1, limit = 10 } = req.query; // pagination

  // ❗ videoId valid কিনা check
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // 📊 pagination calculation
  const skip = (page - 1) * limit;

  // 🔥 aggregation pipeline (owner info সহ)
  const comments = await Comment.aggregate([
    {
      $match: {
        video: new mongoose.Types.ObjectId(videoId), // video অনুযায়ী filter
      },
    },
    {
      $lookup: {
        from: "users", // user collection join
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
        owner: { $first: "$owner" }, // array → object
      },
    },
    {
      $sort: { createdAt: -1 }, // newest first
    },
    {
      $skip: Number(skip), // pagination skip
    },
    {
      $limit: Number(limit), // pagination limit
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, comments, "Comments fetched successfully"));
});

// ➕ Add Comment
const addComment = asyncHandler(async (req, res) => {
  const { content } = req.body; // comment text
  const { videoId } = req.params;

  // ❗ validation
  if (!content?.trim()) {
    throw new ApiError(400, "Comment content is required");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  // 🗄️ comment create
  const comment = await Comment.create({
    content,
    video: videoId,
    owner: req.user._id, // logged-in user
  });

  return res
    .status(201)
    .json(new ApiResponse(201, comment, "Comment added successfully"));
});

// ✏️ Update Comment
const updateComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const { content } = req.body;

  // ❗ validation
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  if (!content?.trim()) {
    throw new ApiError(400, "Content is required");
  }

  // 🔍 comment খুঁজে বের করা
  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // 🔐 owner check (security)
  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not allowed to update this comment");
  }

  // 🗄️ update
  comment.content = content;
  await comment.save();

  return res
    .status(200)
    .json(new ApiResponse(200, comment, "Comment updated successfully"));
});

// ❌ Delete Comment
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;

  // ❗ validation
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid comment ID");
  }

  // 🔍 comment খুঁজে বের করা
  const comment = await Comment.findById(commentId);

  if (!comment) {
    throw new ApiError(404, "Comment not found");
  }

  // 🔐 owner check
  if (comment.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "You are not allowed to delete this comment");
  }

  // 🗑️ delete
  await comment.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Comment deleted successfully"));
});

export { getVideoComments, addComment, updateComment, deleteComment };
