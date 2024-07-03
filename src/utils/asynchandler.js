const asynchandler=(requesthandler)=>
    {(req,res,next)=>{
    Promise.resolve(asynchandler(req,res,next)).catch((err)=>next(err))
}}

export {asynchandler};

/*
const asynchandler=(fn)=>async(req,res,next)=>{
    try{
    await fn(req,res,next);
    }
    catch(error){
    console.status(err.code || 500).json({
    sucess:false,
    message:err.message
    })
    }
    }
    */