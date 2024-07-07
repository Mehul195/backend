import {asynchandler} from "../utils/asynchandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser=asynchandler( async(req,res)=>{
   
    const {fullname,email,username,passsword}=req.body;

    if([fullname,email,username,passsword].some((field)=>field.trim()===""))
        {
        throw new ApiError(400,"All fields are required")
    }

    const existedUser=User.findOne({
        $or:[{fullname},{username}]
    })

    if(existedUser){
        throw new ApiError(409,"User with fullname or username is already created");
    }

    const avatarLocalPath=req.file?.avatar[0].path;
    const coverImageLocalPath=req.file?.coverimage[0].path;

    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar is required");
    }

     const avatar=await uploadOnCloudinary(avatarLocalPath);
     const coverimage=await uploadOnCloudinary(coverImageLocalPath);

     if(!avatar){
        throw new ApiError(400,"Avatar is required");
    }

    const user= await User.create({
        fullname,
        avatar:avatar.url,
        coverimage:coverimage?.url || "",
        email,username:username.toLowerCase(),passsword
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

});



export {registerUser};