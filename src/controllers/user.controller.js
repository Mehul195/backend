import {asynchandler} from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";



const getAccessTokenAndRefreshToken=async(userId)=>{
    try {
        const user=await User.findById(userId);
    const accessToken= user.generateAccessToken();
    const refreshToken=user.generateRefreshToken();
    user.refreshToken=refreshToken;
     await user.save({ValiditionBeforeSave:false})

     return{accessToken,refreshToken};

        
    } catch (error) {
        throw new ApiError(500,"Something went wrong while generating refresh and access token");
    }
    }


const registerUser=asynchandler( async(req,res)=>{
   
    const {fullname,email,username,password}=req.body;
   

    if([fullname,email,username,password].some((field)=>field?.trim()===""))
        {
        throw new ApiError(400,"All fields are required")
    }

    const existedUser=await User.findOne({
        $or:[{fullname},{username}]
    })

    if(existedUser){
        throw new ApiError(409,"User with fullname or username is already created");
    }

    const avatarLocalPath= req.files?.avatar[0]?.path;
    let coverImageLocalPath;

    if(req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length > 0){
        coverImageLocalPath=req.files.coverimage[0].path;
    }
    console.log(avatarLocalPath);

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required");
        
    }

     const avatar=await uploadOnCloudinary(avatarLocalPath);
     const coverimage=await uploadOnCloudinary(coverImageLocalPath);

     if(!avatar){
        throw new ApiError(400,"Avatar is requiredd");
    }

    const user= await User.create({
        fullname,
        avatar:avatar.url,
        coverimage:coverimage?.url || "",
        email,username:username.toLowerCase(),password
    })

    const createdUser=await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new ApiError(500,"Something went wrong while registering the user");
    }


    return res.status(201).json(
        new ApiResponse(200,createdUser,"User is registered Succesfully")
    )

})


const loginUser=asynchandler( async(req,res)=>{

    const{email,username,password}=req.body
    

    if(!(username || email)){
        throw new ApiError(400,"Username or email is required");
    }

    const user=await User.findOne({
        $or:[{username},{email}]
    })
 

    if(!user){
        throw new ApiError(402,"User is not available");
    }

    const isPasswordValid=await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid User credintials ")

    }

    const {accessToken,refreshToken} =await  getAccessTokenAndRefreshToken(user._id);

    const loggedUser=await User.findById(user._id).select("-password -refreshToken");


    const option={
        httpOnly:true,
        secure:true
    }

    return res.
    status(200)
        .cookie("accessToken",accessToken,option)
        .cookie("refreshToken",refreshToken,option)
        .json(
            new ApiResponse(
                200,
                {
                    user:loggedUser,accessToken,refreshToken
                }
                ,"User logged in Successfully"

            )
        )
});

const logOutUser=asynchandler(async(req,res)=>{
   await  User.findByIdAndUpdate(
       req.user._id,{
        $unset:{
            refreshToken:1
        }},
        {
            new:true
        })

        const option={
            httpOnly:true,
            secure:true
        }

        res.status(200)
        .clearCookie("accessToken",option)
        .clearCookie("refreshToken",option)
        .json(new ApiResponse(200,{},"User logged out successfully"))
})


const refreshAccessToken=asynchandler( async(req,res)=>{
    const incomingToken=req.cookies.refreshToken || req.body.refreshToken;

    if(!incomingToken){
        throw new ApiError(401,"unauthorized request");
    }

    try {
        const decodedToken=jwt.verify(incomingToken,process.env.REFRESH_TOKEN_SECRET);
    
        const user=await User.findById(decodedToken?._id);
    
        if(!user)
        {
            throw new ApiError(401,"Invalid Refresh Token");
        }
    
        if(incomingToken !== user?.refreshToken)
        {
            throw new ApiError(401,"Refresh Token expired or used");
        }
    
        const {accessToken,newRefreshToken}=await getAccessTokenAndRefreshToken(user._id);
    
        const option={
            httpOnly:true,
            secure:true
        }
    
        return res.status(200)
        .cookie("accessToken",accessToken,option)
        .cookie("refreshToken",newRefreshToken,option)
        .json(
             new ApiResponse(
                200,{accessToken,newRefreshToken},"Access Token refreshed"
             )
        )
        
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid refresh Token")
        
    }
})

const changeCurrentPassword=asynchandler(async(req,res)=>{
    const{oldPassword,newPassword}=req.body;

    const user=await User.findById(req.user?._id);

   const isPasswordCorrect= await user.isPasswordCorrect(oldPassword);

   if(!isPasswordCorrect){
    throw new ApiError(400,"Invalid Old Password")
   }

   user.password=newPassword

   await user.save({validateBeforeSave:false})

   return res.status(200).
   json(new ApiResponse(
    200,{},
    "Password has been changed successfully"
   ))
})

const getCurrentUser=asynchandler(async(req,res)=>{
    return res.status(200).json(new ApiResponse(200,req.user,"Current User fetched Successfully"))
})

const updateAccountDetail=asynchandler(async(req,res)=>{
    const{fullname,email}=req.body;

    if(!(fullname || email)){
        throw new ApiError(400,"All fields are required")
    }

    const user =User.findByIdAndUpdate(req.user?._id,
        {$set:{fullname,email}},{new :true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,{},"Details have been updated successfully"))
})

const updateUserAvatar=asynchandler(async(req,res)=>{
    const avatarLocalPath=req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file not found ")
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath);

    if(!avatar.url){
        throw new ApiError(400,"Avatar File is not uploaded on cloudinary")
    }

    User.findByIdAndUpdate(req.user?._id,{
        $set:{avatar:avatar.url}},{new:true}).select("-password");

        return res.status(200)
        .json(new ApiResponse(200,{},"Avatar image is successfully Updated"))
})


const updateUsercoverImage=asynchandler(async(req,res)=>{
    const coverImageLocalPath=req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,"cover Image file not found ")
    }

    const coverImage=await uploadOnCloudinary(coverImageLocalPath);

    if(!coverImage.url){
        throw new ApiError(400,"Cover Image File is not uploaded on cloudinary")
    }

    User.findByIdAndUpdate(req.user?._id,{
        $set:{coverImage:coverImage.url}},{new:true}).select("-password");

        return res.status(200)
        .json(new ApiResponse(200,{},"Cover image is successfully Updated"))
})

const getUserChannelProfile=asynchandler(async(req,res)=>{
    const {username} =req.params;
    if(!username?.trim()){
        throw new ApiError(400,"username is missing");
    }

    const channel=await User.aggregate([{
        $match:{
            username:username?.toLowerCase()
        }
    },
    {
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"subscribers"
        }
    },
    {
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subscriber",
            as:"subscribedTo"
        }
    },
    {
        $addFields:{
            subscribersCount:{
                $size:"$subscribers"
            },
            channelSubscribedToCount:{
                $size:"$subscribedTo"
            },
            isSubscribedTo:{
                $cond:{
                    if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                    then:true,
                    else:false
                }

            }
        }
    },

    {
        $project:{
            fullname:1,
            email:1,
            username:1,
            avatar:1,
            coverImage:1,
            subscribersCount:1,
            channelSubscribedToCount:1,
            isSubscribedTo:1
        }
    }


])
console.log(channel)

if(!channel?.length){
    throw new ApiError(404,"Channel does not exist")
}

return res.status(200)
.json(new ApiResponse(200,channel[0],"User Channel fetched successfully"))
})


const getWatchHistory=asynchandler(async(req,res)=>{
    const user=await User.aggregate([{
        $match:{
            _id:new mongoose.Types.ObjectId(req.user._id)
                }
    },
    {
        $lookup:{
            from:"vedios",
            localField:" watchHistory",
            foreignField:"_id",
            as:"watchHistory",
            pipeline:[
                {
                    $lookup:{
                        from:"users",
                        localField:"owner",
                        foreignField:"_id",
                        as:"owner",
                        pipeline:[{
                            $project:{
                                fullname:1,
                                username:1,
                                avatar:1
                            }
                        }]
                 }
                },
                {
                    $addFields:{
                        owner:{
                        $first:"$owner"
                    }
                }}
            ]

        }

    }
]);
return res.status(200).json(
    new ApiResponse(200,user[0].watchHistory,"Watch History is fetched Successfully")
)
})



export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetail,
    updateUserAvatar,
    updateUsercoverImage,
    getUserChannelProfile,
    getWatchHistory

};