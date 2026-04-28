// server start korar age amader database er sathe connection establish korte hobe. tai amra ekta alada file create korbo db/index.js te jekhane amra mongoose diye database connection establish korbo. tarpor amra index.js file e giye oi connection function ke call korbo.

import app from "./app.js";
import dotenv from "dotenv";
import connectDB from "./db/index.js";

dotenv.config({
  path: "./.env",
});

connectDB()
  .then(() => {
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running on port : ${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log("Mongo db connection failed !!!", err);
  });

  