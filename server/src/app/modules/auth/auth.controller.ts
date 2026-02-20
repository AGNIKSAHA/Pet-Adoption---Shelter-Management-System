import { Request, Response } from "express";
import { User } from "../user/user.model";
import { RefreshToken } from "../token/refreshToken.model";
import { IStaffApplication } from "../shelter/staff-application.model";
import { AppError } from "../../common/middlewares/error.middleware";
import { catchAsync } from "../../common/middlewares/catch.middleware";
import {
  generateAccessToken,
  generateRefreshToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
  verifyEmailVerificationToken,
  verifyPasswordResetToken,
  verifyRefreshToken,
  UserMembership,
} from "../../common/utils/jwt";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../../common/utils/mail";
import { AuditLog } from "../audit/audit.model";

const normalizeMemberships = (
  memberships: Array<{
    shelterId?: { toString: () => string } | string | null;
    role: "admin" | "shelter_staff" | "adopter";
  }> = [],
) : UserMembership[] => {
  return memberships
    .filter((m) => m?.shelterId)
    .map((m) => ({
      shelterId:
        typeof m.shelterId === "string" ? m.shelterId : m.shelterId!.toString(),
      role: m.role,
    }));
};

export const register = catchAsync(async (req: Request, res: Response) => {
  const { email, password, firstName, lastName, roles } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new AppError(409, "Email already registered");
  }

  // Choose primary role based on highest privilege for backward compatibility
  const selectedRoles =
    Array.isArray(roles) && roles.length > 0 ? roles : ["adopter"];
  let primaryRole = "adopter";
  if (selectedRoles.includes("admin")) primaryRole = "admin";
  else if (selectedRoles.includes("shelter_staff"))
    primaryRole = "shelter_staff";

  // Create user
  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    role: primaryRole,
    roles: selectedRoles,
  });

  // Generate verification token
  const verificationToken = generateEmailVerificationToken(user._id.toString());

  // Send verification email
  await sendVerificationEmail(email, verificationToken);

  // Log action
  await AuditLog.create({
    userId: user._id,
    action: "register",
    resource: "user",
    resourceId: user._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  res.status(201).json({
    success: true,
    message:
      "Registration successful. Please check your email to verify your account.",
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        roles: user.roles,
        isEmailVerified: user.isEmailVerified,
        staffApplications: [],
      },
    },
  });
});

export const login = catchAsync(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  // Find user with password field
  const user = await User.findOne({ email })
    .select("+password")
    .populate("shelterId")
    .populate("memberships.shelterId");

  if (!user) {
    throw new AppError(401, "Invalid credentials");
  }

  // Check password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new AppError(401, "Invalid credentials");
  }

  // Check if user is active
  if (!user.isActive) {
    throw new AppError(403, "Account is deactivated");
  }

  // Check if email is verified
  if (!user.isEmailVerified) {
    throw new AppError(403, "Please verify your email address to log in.");
  }

  // Fetch staff applications if they're staff
  let staffApplications: IStaffApplication[] = [];
  if (user.role === "shelter_staff") {
    const { StaffApplication } =
      await import("../shelter/staff-application.model");
    staffApplications = (await StaffApplication.find({
      userId: user._id,
    }).populate("shelterId")) as unknown as IStaffApplication[];
  }

  // Aggregate all roles from memberships and primary role
  const allRoles = new Set<string>();
  if (user.role) allRoles.add(user.role);
  user.roles?.forEach((r) => allRoles.add(r));
  const safeMemberships = normalizeMemberships(
    (user.memberships || []) as unknown as Array<{
      shelterId?: { toString: () => string } | string | null;
      role: "admin" | "shelter_staff" | "adopter";
    }>,
  );
  safeMemberships.forEach((m) => allRoles.add(m.role));

  // Generate tokens
  const tokenPayload = {
    id: user._id.toString(),
    email: user.email,
    role: user.role,
    roles: Array.from(allRoles),
    memberships: safeMemberships,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store refresh token
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await RefreshToken.create({
    userId: user._id,
    token: refreshToken,
    expiresAt,
  });

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };

  // Set refresh token cookie
  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Set access token cookie
  res.cookie("accessToken", accessToken, {
    ...cookieOptions,
    maxAge: 15 * 60 * 1000, // 15 mins (matching jwt expiry usually)
  });

  // Log action
  await AuditLog.create({
    userId: user._id,
    action: "login",
    resource: "user",
    resourceId: user._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  res.json({
    success: true,
    message: "Login successful",
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        roles: user.roles,
        isEmailVerified: user.isEmailVerified,
        shelterId: user.shelterId,
        memberships: safeMemberships,
        staffApplications,
      },
    },
  });
});

export const logout = catchAsync(async (req: Request, res: Response) => {
  const refreshToken = req.cookies.refreshToken;

  if (refreshToken) {
    await RefreshToken.deleteOne({ token: refreshToken });
  }

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
  };

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", cookieOptions);

  // Log action
  if (req.user) {
    await AuditLog.create({
      userId: req.user.id,
      action: "logout",
      resource: "user",
      resourceId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });
  }

  res.json({
    success: true,
    message: "Logout successful",
  });
});

export const verifyEmail = catchAsync(async (req: Request, res: Response) => {
  const { token } = req.body;

  const userId = verifyEmailVerificationToken(token);

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  if (user.isEmailVerified) {
    throw new AppError(400, "Email already verified");
  }

  user.isEmailVerified = true;
  await user.save();

  // Log action
  await AuditLog.create({
    userId: user._id,
    action: "verify_email",
    resource: "user",
    resourceId: user._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  res.json({
    success: true,
    message: "Email verified successfully",
  });
});

export const forgotPassword = catchAsync(
  async (req: Request, res: Response) => {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists
      res.json({
        success: true,
        message: "If an account exists, a password reset email has been sent",
      });
      return;
    }

    const resetToken = generatePasswordResetToken(user._id.toString());
    await sendPasswordResetEmail(email, resetToken);

    // Log action
    await AuditLog.create({
      userId: user._id,
      action: "forgot_password",
      resource: "user",
      resourceId: user._id,
      ipAddress: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({
      success: true,
      message: "If an account exists, a password reset email has been sent",
    });
  },
);

export const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const { token, password } = req.body;

  const userId = verifyPasswordResetToken(token);

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  user.password = password;
  await user.save();

  // Invalidate all refresh tokens
  await RefreshToken.deleteMany({ userId: user._id });

  // Log action
  await AuditLog.create({
    userId: user._id,
    action: "reset_password",
    resource: "user",
    resourceId: user._id,
    ipAddress: req.ip,
    userAgent: req.get("user-agent"),
  });

  res.json({
    success: true,
    message: "Password reset successful",
  });
});

export const refreshAccessToken = catchAsync(
  async (req: Request, res: Response) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      throw new AppError(401, "Refresh token not provided");
    }

    // Verify refresh token
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
    };

    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);

      // Check if token exists in database
      const storedToken = await RefreshToken.findOne({ token: refreshToken });
      if (!storedToken) {
        throw new AppError(401, "Invalid refresh token");
      }
    } catch (error) {
      res.clearCookie("accessToken", cookieOptions);
      res.clearCookie("refreshToken", cookieOptions);
      throw error;
    }

    // Fetch fresh user data
    const user = await User.findById(decoded.id);
    if (!user) {
      res.clearCookie("accessToken", cookieOptions);
      res.clearCookie("refreshToken", cookieOptions);
      throw new AppError(401, "User no longer exists");
    }

    // Aggregate all roles
    const allRoles = new Set<string>();
    if (user.role) allRoles.add(user.role);
    user.roles?.forEach((r) => allRoles.add(r));
    const safeMemberships = normalizeMemberships(
      (user.memberships || []) as unknown as Array<{
        shelterId?: { toString: () => string } | string | null;
        role: "admin" | "shelter_staff" | "adopter";
      }>,
    );
    safeMemberships.forEach((m) => allRoles.add(m.role));

    // Generate new access token with fresh data
    const accessToken = generateAccessToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      roles: Array.from(allRoles),
      memberships: safeMemberships,
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 15 * 60 * 1000,
    });

    res.json({
      success: true,
      message: "Access token refreshed",
    });
  },
);

export const getMe = catchAsync(async (req: Request, res: Response) => {
  const user = await User.findById(req.user!.id)
    .populate("shelterId")
    .populate("memberships.shelterId");

  if (!user) {
    throw new AppError(404, "User not found");
  }

  let staffApplications: IStaffApplication[] = [];
  if (user.role === "shelter_staff") {
    const { StaffApplication } =
      await import("../shelter/staff-application.model");
    staffApplications = (await StaffApplication.find({
      userId: user._id,
    }).populate("shelterId")) as unknown as IStaffApplication[];
  }

  const safeMemberships = normalizeMemberships(
    (user.memberships || []) as unknown as Array<{
      shelterId?: { toString: () => string } | string | null;
      role: "admin" | "shelter_staff" | "adopter";
    }>,
  );

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        address: user.address,
        role: user.role,
        roles: Array.from(
          new Set([
            user.role,
            ...(user.roles || []),
            ...safeMemberships.map((m) => m.role),
          ]),
        ),
        isEmailVerified: user.isEmailVerified,
        shelterId: user.shelterId,
        memberships: safeMemberships,
        staffApplications,
      },
    },
  });
});
