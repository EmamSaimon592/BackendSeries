import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import uploadToCloudinary from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";

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
}









const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, username, password } = req.body;

  // 1️⃣ Validate required fields
  if (![fullName, email, username, password].every((f) => f?.trim() !== "")) {
    throw new ApiError(
      400,
      "All fields (fullName, email, username, password) are required"
    );
  }

  // 2️⃣ Check if user already exists
  const existedUser = await User.findOne({
    $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }],
  });

  if (existedUser) {
    throw new ApiError(409, "User already exists with this username or email");
  }

  // 3️⃣ Validate avatar and cover image
  const avatarLocalPath = req.files?.avatar?.[0]?.path;
  // const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

  let coverImageLocalPath;
  if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }






  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar image is required");
  }

  // 4️⃣ Upload images to Cloudinary
  const avatar = await uploadToCloudinary(avatarLocalPath);
  const coverImage = coverImageLocalPath
    ? await uploadToCloudinary(coverImageLocalPath)
    : null; 
  
  // const coverImage = await uploadToCloudinary(coverImageLocalPath);
  

  if (!avatar?.url) {
    throw new ApiError(500, "Failed to upload avatar image");
  }

  // 5️⃣ Create user
  const user = await User.create({
    fullName,
    email: email.toLowerCase(),
    username: username.toLowerCase(),
    password,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
  });

  // 6️⃣ Remove sensitive data before sending response
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

const loginUser = asyncHandler(async (req, res) => {
  // req body --> Data
  // username or email
  // find the user by email or username
  // password check korbo user er sathe
  // access OR refresh token generate korbo
  //  cookies set korbo
  // response send korbo

  const { email, username, password } = req.body;

  if (!password || !email) {
    throw new ApiError(400, "Please provide email or username and password");
  }
   
  const user = await User.findOne({
    $or:[{ username}, { email }]
  });

  if (!user) {
    throw new ApiError(404, "User not found with this email or username");
  }
  
  // akon pasword check korbo
  const isPasswordValid = await user.isPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid password");
  }

 
  // refresh token and generate token ashe gese

  const { accessToken, refreshToken } = await generateAccessTokenAndRefreshToken(user._id);

  // cookie set korbo
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");
  const options = {
    httpOnly: true,
    secure: true,
  }
  
  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200, {
          user: loggedInUser,
          accessToken,
          refreshToken
      },
        "User logged in successfully"
      ));

});


export { registerUser, loginUser };
