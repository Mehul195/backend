import { Router } from "express";
import { loginUser, logOutUser, registerUser,refreshAccessToken } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyToken } from "../middlewares/auth.middleware.js";


const userRouter=Router();

userRouter.route("/register").post(
    upload.fields([
        {
        name:"avatar",
        maxCount:1
    },
    {
        name:"coverimage",
        maxCount:1
    }]),
    registerUser

);

userRouter.route("/login").post(loginUser)

//secure routes
userRouter.route("/logout").post(verifyToken,logOutUser)

userRouter.route("/refresh-Token").post(refreshAccessToken)


export  default userRouter ;