import jwt from "jsonwebtoken";

export function signAccessToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_TTL || "1d",
    // expiresIn: 600,
  });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_TTL || "30d",
  });
}

export function verifyAccess(token) {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}

export function verifyRefresh(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

export function signPreviewToken(payload) {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    // expiresIn: process.env.ACCESS_TOKEN_TTL || "1d",
    expiresIn: 600,
  });
}
export function verifyPreviewToken(token) {
  if (!token) return false;
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET);
}
