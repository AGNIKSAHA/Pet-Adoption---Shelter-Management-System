import { Request, Response } from "express";
import { User } from "./user.model";
import { AppError } from "../../common/middlewares/error.middleware";
import { catchAsync } from "../../common/middlewares/catch.middleware";
import { IStaffApplication } from "../shelter/staff-application.model";

export const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { firstName, lastName, phone, address, roles } = req.body;

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError(404, "User not found");
  }

  // Update fields
  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (phone) user.phone = phone;
  if (roles && Array.isArray(roles)) {
    user.roles = roles;
    if (roles.includes("admin")) user.role = "admin";
    else if (roles.includes("shelter_staff")) user.role = "shelter_staff";
    else user.role = "adopter";
  }
  if (address) {
    user.address = {
      ...user.address,
      ...address,
    };
  }

  await user.save();

  let staffApplications: IStaffApplication[] = [];
  if (user.role === "shelter_staff") {
    const { StaffApplication } =
      await import("../shelter/staff-application.model");
    staffApplications = await StaffApplication.find({
      userId: user._id,
    }).populate("shelterId");
  }

  res.json({
    success: true,
    message: "Profile updated successfully",
    data: {
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        address: user.address,
        role: user.role,
        roles: user.roles,
        isEmailVerified: user.isEmailVerified,
        memberships: user.memberships,
        staffApplications,
      },
    },
  });
});
