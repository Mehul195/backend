import dotenv from"dotenv";
import connectDB from "./db/index.js";
import {app} from "./app.js";

dotenv.config({
    path:'./.env'
})

const port = process.env.PORT === null ? 5000 : process.env.PORT;
connectDB()
.then(()=>{
    app.listen(port,()=>{
        console.log(`Server is running on port ${port}`);
    })
})
.catch((err)=>{
    console.log("Mongo Db not connected",err);
})




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