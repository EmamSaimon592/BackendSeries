import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";



const app = express();
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  Credentials: true
}))

app.use(express.json({limit: "10mb"}));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static("public"));
app.use(cookieParser());



// Routes import is here...
import userRouter from "./routes/user.routes.js";


// Routes definition is here
app.use("/api/v1/users", userRouter);

//   http://localhost:8000/api/v1/users/register  = > POST method








export default app;