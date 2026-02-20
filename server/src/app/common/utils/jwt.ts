import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface UserMembership {
  shelterId: string;
  role: "admin" | "shelter_staff" | "adopter";
}

export interface TokenPayload {
  id: string;
  email: string;
  role: "admin" | "shelter_staff" | "adopter";
  roles?: string[];
  memberships: UserMembership[];
}

interface VerificationTokenPayload {
  id: string;
  type: "email_verification";
}

interface ResetTokenPayload {
  id: string;
  type: "password_reset";
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
};

export const generateRefreshToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
};

export const generateEmailVerificationToken = (userId: string): string => {
  return jwt.sign({ id: userId, type: "email_verification" }, env.JWT_SECRET, {
    expiresIn: "24h",
  });
};

export const generatePasswordResetToken = (userId: string): string => {
  return jwt.sign({ id: userId, type: "password_reset" }, env.JWT_SECRET, {
    expiresIn: "1h",
  });
};

export const verifyEmailVerificationToken = (token: string): string => {
  try {
    const decoded = jwt.verify(
      token,
      env.JWT_SECRET,
    ) as VerificationTokenPayload;
    if (decoded.type !== "email_verification") {
      throw new Error("Invalid token type");
    }
    return decoded.id;
  } catch (error) {
    throw new Error("Invalid or expired verification token");
  }
};

export const verifyPasswordResetToken = (token: string): string => {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as ResetTokenPayload;
    if (decoded.type !== "password_reset") {
      throw new Error("Invalid token type");
    }
    return decoded.id;
  } catch (error) {
    throw new Error("Invalid or expired reset token");
  }
};
