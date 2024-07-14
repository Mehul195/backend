import {asynchandler} from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

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

    const isPasswordValid=user.isPasswordCorrect(password);

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
        $set:{
            refreshToken:undefined
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
    
        req.status(200)
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





export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken
};