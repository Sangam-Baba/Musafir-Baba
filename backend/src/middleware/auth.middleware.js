import { verifyAccess } from "../utils/tokens.js";
const isAuthenticated = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: "Not Authorized" });
  }

  try {
    console.log(token);
    const decoded = await verifyAccess(token);
    req.user = decoded;
    console.log(" verifyed user  ", req.user);
    next();
  } catch (error) {
    console.log("authentication failed: ", error.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

export default isAuthenticated;
