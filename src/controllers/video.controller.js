import mongoose, { isValidObjectId } from "mongoose";
import { Video } from "../models/video.model.js";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import uploadToCloudinary from "../utils/cloudinary.js";

// 🎥 Get All Videos (search + pagination + sort)
const getAllVideos = asyncHandler(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    query,
    sortBy = "createdAt",
    sortType = "desc",
    userId,
  } = req.query;

  const filter = {};

  // 🔍 search (title / description)
  if (query) {
    filter.$or = [
      { title: { $regex: query, $options: "i" } },
      { description: { $regex: query, $options: "i" } },
    ];
  }

  // 👤 specific user videos
  if (userId && isValidObjectId(userId)) {
    filter.owner = userId;
  }

  // 📊 pagination
  const skip = (page - 1) * limit;

  // 🔄 sort
  const sortOptions = {
    [sortBy]: sortType === "asc" ? 1 : -1,
  };

  const videos = await Video.find(filter)
    .sort(sortOptions)
    .skip(skip)
    .limit(Number(limit))
    .populate("owner", "fullName username avatar");

  return res
    .status(200)
    .json(new ApiResponse(200, videos, "Videos fetched successfully"));
});

// 📤 Publish Video
const publishAVideo = asyncHandler(async (req, res) => {
  const { title, description } = req.body;

  // ❗ validation
  if (!title?.trim()) {
    throw new ApiError(400, "Title is required");
  }

  // 📂 multer file path
  const videoLocalPath = req.files?.video?.[0]?.path;
  const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path;

  if (!videoLocalPath || !thumbnailLocalPath) {
    throw new ApiError(400, "Video and thumbnail are required");
  }

  // ☁️ upload to cloudinary
  const videoFile = await uploadToCloudinary(videoLocalPath);
  const thumbnailFile = await uploadToCloudinary(thumbnailLocalPath);

  if (!videoFile || !thumbnailFile) {
    throw new ApiError(500, "Upload failed");
  }

  // 🗄️ DB create
  const video = await Video.create({
    title,
    description,
    videoFile: videoFile.secure_url,
    thumbnail: thumbnailFile.secure_url,
    owner: req.user._id,
    isPublished: true,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, video, "Video published successfully"));
});

// 📦 Get Video By ID
const getVideoById = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId).populate(
    "owner",
    "fullName username avatar"
  );

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // 👀 view count increase
  video.views += 1;
  await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully"));
});

// ✏️ Update Video
const updateVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;
  const { title, description } = req.body;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // 🔐 owner check
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not allowed");
  }

  // ✏️ update fields
  if (title) video.title = title;
  if (description) video.description = description;

  // 📂 thumbnail update (optional)
  const thumbnailLocalPath = req.file?.path;
  if (thumbnailLocalPath) {
    const thumbnail = await uploadToCloudinary(thumbnailLocalPath);
    video.thumbnail = thumbnail.secure_url;
  }

  await video.save();

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video updated successfully"));
});

// ❌ Delete Video
const deleteVideo = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // 🔐 owner check
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not allowed");
  }

  await video.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Video deleted successfully"));
});

// 🔄 Toggle Publish Status
const togglePublishStatus = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid video ID");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  // 🔐 owner check
  if (video.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not allowed");
  }

  // 🔄 toggle
  video.isPublished = !video.isPublished;
  await video.save();

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        video,
        `Video is now ${video.isPublished ? "Published" : "Unpublished"}`
      )
    );
});

export {
  getAllVideos,
  publishAVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
};

