import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// 🩺 Health Check API (server running কিনা check)
const healthcheck = asyncHandler(async (req, res) => {
  try {
    // ✅ simple response (server alive)
    return res.status(200).json(
      new ApiResponse(
        200,
        {
          status: "OK", // server ঠিক আছে
          uptime: process.uptime(), // server কতক্ষণ ধরে চলছে (seconds)
          timestamp: new Date().toISOString(), // current time
        },
        "Server is running successfully"
      )
    );
  } catch (error) {
    // ❌ যদি কোনো error হয়
    throw new ApiError(500, "Healthcheck failed");
  }
});

export { healthcheck };
