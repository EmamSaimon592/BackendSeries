import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// ==================== CONFIG ====================
// 🔧 .env থেকে Cloudinary config সেট করা
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ==================== UPLOAD FUNCTION ====================
const uploadToCloudinary = async (filePath) => {
  try {
    // 📌 যদি filePath না থাকে → null return
    if (!filePath) return null;

    // ☁️ Cloudinary তে upload করা
    const result = await cloudinary.uploader.upload(filePath, {
      folder: "users/avatars", // 📁 organized folder structure
      resource_type: "image", // 🖼️ image upload
    });

    // 🗑️ local server থেকে file delete (storage clean রাখা)
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // 🔥 শুধুমাত্র দরকারি data return
    return {
      url: result.secure_url,
      public_id: result.public_id,
    };
  } catch (error) {
    console.log("Cloudinary upload error:", error);

    // ❗ error হলেও local file delete করার চেষ্টা
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    return null;
  }
};

// ==================== DELETE FUNCTION ====================
const deleteFromCloudinary = async (publicId) => {
  try {
    // 📌 publicId না থাকলে কিছু করবে না
    if (!publicId) return;

    // 🗑️ Cloudinary থেকে image delete
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.log("Cloudinary delete error:", error);
  }
};

// ==================== EXPORT ====================
export { uploadToCloudinary, deleteFromCloudinary };
  
  


  
  

  
// import { v2 as cloudinary } from "cloudinary";
// import fs from "fs";

// cloudinary.config({
//   cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
//   api_key: process.env.CLOUDINARY_API_KEY,
//   api_secret: process.env.CLOUDINARY_API_SECRET,
// });

// const uploadOnCloudinary = async (localfilePath) => {
//    try {
//      if (!localfilePath) return null;
//      // Upload the image to Cloudinary
//      const response =  await cloudinary.uploader.upload(localfilePath, {
//        resource_type: "auto"
//      })
//      // file uploaded successfully
//      console.log("File uploaded successfully on cloudinary", response.url);
//      return response;

//    } catch (error) {
//     fs.unlinkSync(localfilePath); // Delete the local file after upload attempt
//      return null;
//    }
// };

// export default uploadOnCloudinary;

/*
// example of uploading an image from a URL to cloudinary
cloudinary.v2.uploader.upload("https:upload.wikimedia.org/wikipedia/commons/a/ae/Olympic_flag.jpg",
  { public_id: "olympic_flag" },
  function (error, result) {
    console.log(result, error);
  }
);
*/
