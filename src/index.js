import dotenv from"dotenv";
import connectDB from "./db/index.js";

dotenv.config({
    path:'./env'
})

connectDB();




/*
const app=express();

(async()=>{
    try{
        await mongoose.connect(`${process.env.MONGO_DB}/ ${DB_NAME} `);

        app.on("error",(error)=>{
            console.log("Error :",error);

        })

        app.listen(process.env.PORT,()=>{
            console.log(`Process is running on port ${process.env.PORT}`)

        })

    }catch(error){
        console.error("Error:",error);
    }

})()*/