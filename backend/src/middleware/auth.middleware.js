import jwt from "jsonwebtoken";

const isAuthenticated=async(req, res, next)=>{
    const token =req.headers.authorization?.split(" ")[1];

    if(!token){
        return res.status(401).json({message:"Not Authorized"});
    }

    try {
        const decoded=jwt.verify(token, process.env.JWT_SECRET_KEY);
        req.user=decoded;
        next();
    } catch (error) {
        console.log("authentication failed: ", error.message);
        return res.status(401).json({message: "Invalid token" });
    }
}

export default isAuthenticated;
