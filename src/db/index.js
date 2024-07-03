import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

import dotenv from"dotenv";
dotenv.config();

const connectDB=async()=>{
    try{
        const connectionInstance=await mongoose.connect(`${process.env.MONGO_DB}${DB_NAME} `)
        console.log(`DB is connected to host ${connectionInstance.connection.host}`);

     }catch(error){
        console.error("Error:",error);
        process.exit(1);
    }}

    export default connectDB;