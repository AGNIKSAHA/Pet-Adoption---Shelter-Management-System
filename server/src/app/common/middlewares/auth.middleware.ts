import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import { verifyAccessToken } from "../utils/jwt";
const normalizeShelterId = (value: unknown): string | undefined => {
    if (!value)
        return undefined;
    if (typeof value === "object") {
        const objectValue = value as {
            _id?: unknown;
            id?: unknown;
        };
        return normalizeShelterId(objectValue._id ?? objectValue.id);
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        if (!trimmed)
            return undefined;
        if (mongoose.isValidObjectId(trimmed))
            return trimmed;
        const objectIdMatch = trimmed.match(/[a-fA-F0-9]{24}/);
        if (objectIdMatch && mongoose.isValidObjectId(objectIdMatch[0])) {
            return objectIdMatch[0];
        }
    }
    return undefined;
};
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
    try {
        let token;
        if (req.cookies.accessToken) {
            token = req.cookies.accessToken;
        }
        else if (req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }
        if (!token) {
            res.status(401).json({
                success: false,
                message: "No token provided",
            });
            return;
        }
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });
    }
};
export const authorize = (...roles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: "Authentication required",
            });
            return;
        }
        const isAdmin = req.user.role === "admin";
        const hasAllowedRole = roles.includes(req.user.role);
        const hasAllowedSecondaryRole = req.user.roles && req.user.roles.some((r: string) => roles.includes(r));
        if (!isAdmin &&
            !hasAllowedRole &&
            !hasAllowedSecondaryRole &&
            !roles.includes("adopter")) {
            res.status(403).json({
                success: false,
                message: "Insufficient permissions",
            });
            return;
        }
        next();
    };
};
export const checkShelterAccess = (requiredRole?: "admin" | "shelter_staff") => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (!req.user) {
            res
                .status(401)
                .json({ success: false, message: "Authentication required" });
            return;
        }
        if (req.user.role === "admin") {
            return next();
        }
        const rawShelterId = req.params.shelterId || req.query.shelterId || req.body.shelterId;
        const requestedShelterId = normalizeShelterId(rawShelterId);
        if (!rawShelterId) {
            return next();
        }
        if (!requestedShelterId) {
            res.status(400).json({
                success: false,
                message: "Invalid shelterId",
            });
            return;
        }
        const memberships = req.user.memberships || [];
        const membership = memberships.find((m: {
            shelterId: mongoose.Types.ObjectId | string;
        }) => m.shelterId.toString() === requestedShelterId.toString());
        if (!membership) {
            if (req.user.role === "shelter_staff") {
                const { StaffApplication } = await import("../../modules/shelter/staff-application.model");
                const approvedAccess = await StaffApplication.findOne({
                    userId: req.user.id,
                    shelterId: requestedShelterId,
                    status: "approved",
                });
                if (approvedAccess) {
                    next();
                    return;
                }
            }
            res.status(403).json({
                success: false,
                message: "You do not have permission to access this shelter's data",
            });
            return;
        }
        if (requiredRole &&
            membership.role !== "admin" &&
            membership.role !== requiredRole) {
            res.status(403).json({
                success: false,
                message: `This operation requires ${requiredRole} privileges for this shelter`,
            });
            return;
        }
        next();
    };
};
export const restrictToAdmin = (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
        res
            .status(401)
            .json({ success: false, message: "Authentication required" });
        return;
    }
    if (req.user.role !== "admin") {
        res.status(403).json({
            success: false,
            message: "This operation is restricted to administrators only",
        });
        return;
    }
    next();
};
export const optionalAuth = (req: Request, _res: Response, next: NextFunction): void => {
    try {
        let token;
        if (req.cookies.accessToken) {
            token = req.cookies.accessToken;
        }
        else if (req.headers.authorization &&
            req.headers.authorization.startsWith("Bearer")) {
            token = req.headers.authorization.split(" ")[1];
        }
        if (token) {
            const decoded = verifyAccessToken(token);
            req.user = decoded;
        }
        next();
    }
    catch (error) {
        next();
    }
};
