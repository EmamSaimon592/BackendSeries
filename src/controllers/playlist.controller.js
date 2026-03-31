import mongoose, { isValidObjectId } from "mongoose";
import { Playlist } from "../models/playlist.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ➕ Create Playlist
const createPlaylist = asyncHandler(async (req, res) => {
  const { name, description } = req.body;

  // ❗ validation
  if (!name?.trim()) {
    throw new ApiError(400, "Playlist name is required");
  }

  // 🗄️ create playlist
  const playlist = await Playlist.create({
    name,
    description,
    owner: req.user._id, // logged-in user
    videos: [], // initially empty
  });

  return res
    .status(201)
    .json(new ApiResponse(201, playlist, "Playlist created successfully"));
});

// 📄 Get User Playlists
const getUserPlaylists = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // ❗ validation
  if (!isValidObjectId(userId)) {
    throw new ApiError(400, "Invalid user ID");
  }

  // 🔍 user playlists find
  const playlists = await Playlist.find({
    owner: userId,
  }).sort({ createdAt: -1 });

  return res
    .status(200)
    .json(
      new ApiResponse(200, playlists, "User playlists fetched successfully")
    );
});

// 📦 Get Playlist By ID
const getPlaylistById = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  // ❗ validation
  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  // 🔍 find playlist + populate videos
  const playlist = await Playlist.findById(playlistId).populate({
    path: "videos",
    populate: {
      path: "owner",
      select: "fullName username avatar",
    },
  });

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist fetched successfully"));
});

// ➕ Add Video to Playlist
const addVideoToPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  // ❗ validation
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid ID");
  }

  // 🔍 playlist find
  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  // 🔐 owner check
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not allowed");
  }

  // ❗ duplicate check
  if (playlist.videos.includes(videoId)) {
    throw new ApiError(400, "Video already exists in playlist");
  }

  // ➕ add video
  playlist.videos.push(videoId);
  await playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Video added to playlist"));
});

// ❌ Remove Video from Playlist
const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
  const { playlistId, videoId } = req.params;

  // ❗ validation
  if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
    throw new ApiError(400, "Invalid ID");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  // 🔐 owner check
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not allowed");
  }

  // ➖ remove video
  playlist.videos = playlist.videos.filter((vid) => vid.toString() !== videoId);

  await playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Video removed from playlist"));
});

// 🗑️ Delete Playlist
const deletePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  // 🔐 owner check
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not allowed");
  }

  // 🗑️ delete
  await playlist.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Playlist deleted successfully"));
});

// ✏️ Update Playlist
const updatePlaylist = asyncHandler(async (req, res) => {
  const { playlistId } = req.params;
  const { name, description } = req.body;

  if (!isValidObjectId(playlistId)) {
    throw new ApiError(400, "Invalid playlist ID");
  }

  const playlist = await Playlist.findById(playlistId);

  if (!playlist) {
    throw new ApiError(404, "Playlist not found");
  }

  // 🔐 owner check
  if (playlist.owner.toString() !== req.user._id.toString()) {
    throw new ApiError(403, "Not allowed");
  }

  // ✏️ update fields
  if (name) playlist.name = name;
  if (description) playlist.description = description;

  await playlist.save();

  return res
    .status(200)
    .json(new ApiResponse(200, playlist, "Playlist updated successfully"));
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
