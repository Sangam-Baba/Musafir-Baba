import{ User} from "../models/User.js";
const authorizedRoles=([...roles])=>{
   return async(req , res, next)=>{
    try {
        const  id = req.user.sub;
        // console.log(id);
        // console.log(req.user);
        const user=await User.findById(id).select("role");
        if(!user) return res.status(404).json({message:"User not found"});
        if(!roles.includes(user.role)){
        return res.status(403).json({message:"You are not allowed"});
        }
        next();
    } catch (error) {
        console.log("Role check failed: ", error.message);
        return res.status(500).json({message:"Server Error"});
    }
   }
};

export default authorizedRoles;