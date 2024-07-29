import { Router } from "express";
import { loginUser, logOutUser, registerUser,refreshAccessToken, changeCurrentPassword, getCurrentUser, updateAccountDetail, updateUserAvatar, updateUsercoverImage, getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
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

userRouter.route("/change-password").post(verifyToken,changeCurrentPassword)

userRouter.route("/current-user").get(verifyToken,getCurrentUser)

userRouter.route("/update-account").patch(verifyToken,updateAccountDetail)


userRouter.route("/avatar").patch(verifyToken,upload.single("avatar"),updateUserAvatar)


userRouter.route("/cover-Image").patch(verifyToken,upload.single("coverImage"),updateUsercoverImage)

userRouter.route("/c/:username").get(verifyToken,getUserChannelProfile)

userRouter.route("/history").get(verifyToken,getWatchHistory)



export  default userRouter ;