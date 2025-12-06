import { Staff } from "../models/Staff.js";
import bcrypt from "bcrypt";
import { AuthLog } from "../models/AuthLog.js";
import { Session } from "../models/AuthSession.js";
import { v4 as uuid } from "uuid";
import {
  signAccessToken,
  signRefreshToken,
  verifyAccess,
  verifyRefresh,
} from "../utils/tokens.js";
import { parseUserAgent } from "./auth.controller.js";

function issueTokens(userId, role, permissions, sessionId) {
  const accessToken = signAccessToken({
    sub: userId,
    role,
    permissions,
    sessionId,
  });
  const refreshToken = signRefreshToken({
    sub: userId,
    role,
    permissions,
    sessionId,
  });
  return { accessToken, refreshToken };
}

const getAllAdmin = async (req, res) => {
  try {
    const query = {};
    if (req.query.email) query.email = req.query.email;

    // Step 1: get users
    const users = await Staff.find(query)
      .select("-password -refresh_token -otp -otpExpire")
      .lean();

    if (!users.length) {
      return res
        .status(404)
        .json({ success: false, message: "No admin found" });
    }

    const userIds = users.map((u) => u._id);

    // Step 2: Lookup logs & sessions
    const [logs, sessions] = await Promise.all([
      AuthLog.find({ userId: { $in: userIds } })
        .sort({ timestamp: -1 })
        .lean(),
      Session.find({ userId: { $in: userIds } })
        .sort({ loginAt: -1 })
        .lean(),
    ]);
    // Step 3: Map each user with latest session + logs
    const result = users.map((user) => {
      const userLogs = logs.filter(
        (l) => String(l.userId) === String(user._id)
      );
      const userSessions = sessions.filter(
        (s) => String(s.userId) === String(user._id)
      );

      const lastLogin =
        userLogs.find(
          (log) =>
            log.eventType === "login" &&
            !log.userAgent.includes("PostmanRuntime")
        ) || userLogs.find((log) => log.eventType === "login");
      const lastLogout = userLogs.find((log) => log.eventType === "logout");
      const activeSession = userSessions.find((s) => s.status === "active");
      // console.log("UA:", lastLogin);
      return {
        ...user,
        loginInfo: {
          lastLoginAt: lastLogin?.timestamp || null,
          lastLogoutAt: lastLogout?.timestamp || null,
          device: lastLogin ? parseUserAgent(lastLogin.userAgent) : "Unknown",
          ip: lastLogin?.ip || null,
          multipleDevices: userSessions.length > 1,
          currentStatus: activeSession ? "Online" : "Offline",
        },
      };
    });

    res.status(200).json({
      success: true,
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.log("GetAllUsers error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};
const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    if (!name || !email || !password || !phone) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }
    const exist = await Staff.findOne({ email });
    if (exist) {
      return res
        .status(409)
        .json({ success: false, message: "Staff Already exist" });
    }
    const hashedpassword = await bcrypt.hash(password, 10);
    const user = new Staff({
      name,
      email,
      password: hashedpassword,
      phone,
      role: "admin",
      permissions: req.body?.permissions ?? [],
    });
    await user.save();
    return res
      .status(201)
      .json({ success: true, message: "Staff Registerrd Successfully" });
  } catch (error) {
    console.log("Staff Registration failed", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const loginAdmin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await Staff.findOne({ email }).select("+password");
    if (!user) {
      return res
        .status(401)
        .json({ success: false, message: "Staff not register" });
    }

    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      return res
        .status(401)
        .json({ success: false, message: "Staff Unauthorized" });
    }
    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      req.ip;

    const sessionId = uuid();
    await AuthLog.create({
      userId: user._id,
      sessionId,
      success: true,
      eventType: "login",
      ip: ip,
      userAgent: req.headers["user-agent"],
    });
    // Create session record
    await Session.create({
      userId: user._id,
      sessionId,
      ip: ip,
      userAgent: req.headers["user-agent"],
      status: "active",
      loginAt: new Date(),
      lastSeen: new Date(),
    });

    const { accessToken, refreshToken } = issueTokens(
      user._id,
      user.role,
      user.permissions,
      sessionId
    );

    const cookieOption = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain:
        process.env.NODE_ENV === "production" ? ".musafirbaba.com" : undefined,
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // recommended
    };

    res.cookie("admin_refresh_token", refreshToken, cookieOption);

    return res.status(200).json({
      success: true,
      message: "Staff Login Successfully",
      accessToken,
      role: user.role,
      permissions: user.permissions,
    });
  } catch (error) {
    console.log("Login failed ", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server Error", error: error.message });
  }
};

const refresh = async (req, res) => {
  try {
    const token = req.cookies?.admin_refresh_token;
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Missing refresh token or Unauthorized",
      });
    }

    const payload = verifyRefresh(token);

    const { accessToken, refreshToken } = issueTokens(
      payload.sub,
      payload.role,
      payload.permissions,
      payload.sessionId
    );
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain:
        process.env.NODE_ENV === "production" ? ".musafirbaba.com" : undefined,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    };

    res.cookie("admin_refresh_token", refreshToken, cookieOptions);

    return res.json({
      accessToken,
      role: payload.role,
      permissions: payload.permissions,
    });
  } catch (error) {
    console.log("Refresh token error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
const logout = async (req, res) => {
  try {
    const { sessionId } = req.user;
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Invalid session or already logged out",
      });
    }
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      domain:
        process.env.NODE_ENV === "production" ? ".musafirbaba.com" : undefined,
      path: "/",
    };
    res.clearCookie("admin_refresh_token", cookieOptions);
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.ip;
    await AuthLog.create({
      userId: req?.user?.sub,
      eventType: "logout",
      sessionId,
      ip: ip,
      userAgent: req.headers["user-agent"],
    });

    await Session.updateOne(
      { sessionId },
      { status: "logout", logoutAt: new Date() }
    );
    return res
      .status(200)
      .json({ success: true, message: "Logout successful" });
  } catch (error) {
    console.log("Logout error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const me = async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const token = authHeader.split(" ")[1];
    const verifiedToken = verifyAccess(token);

    if (!verifiedToken) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const user = await Staff.findById(verifiedToken.sub).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Me error:", error.message);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const admin = await Staff.findById(id);
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }
    if (req.body?.password) {
      const hashedpassword = await bcrypt.hash(req.body.password, 10);
      req.body.password = hashedpassword;
    }
    const updatedAdmin = await Staff.findByIdAndUpdate(id, req.body, {
      new: true,
    }).select("name email phone permissions");
    res.status(200).json({
      success: true,
      message: "Admin updated successfully",
      data: updatedAdmin,
    });
  } catch (error) {
    console.log("update admin error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const getAdminById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, message: "Invalid Id" });
    }
    const admin = await Staff.findById(id).select(
      " name email phone permissions role"
    );
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }
    res.status(200).json({
      success: true,
      message: "Admin found successfully",
      data: admin,
    });
  } catch (error) {
    console.log("getting admin by id error:", error.message);
    res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res
        .status(400)
        .json({ success: false, message: "admin id not found" });
    }
    const user = await Staff.findById(id);
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "staff not found" });
    }
    const deleteUser = await Staff.findByIdAndDelete(id);
    return res
      .status(200)
      .json({ success: true, message: "staff deleted successfully" });
  } catch (error) {
    console.log("Delete user error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

export {
  registerAdmin,
  updateAdmin,
  getAdminById,
  loginAdmin,
  logout,
  getAllAdmin,
  deleteAdmin,
  refresh,
  me,
};
