import { Request, Response, NextFunction } from "express";
export class AppError extends Error {
    constructor(public statusCode: number, public message: string, public isOperational = true, public details?: unknown) {
        super(message);
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
export const errorHandler = (err: Error | AppError, _req: Request, res: Response, _next: NextFunction): void => {
    console.error("❌ Error:", err);
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            message: err.message,
            ...(err.details !== undefined ? { details: err.details } : {}),
        });
        return;
    }
    if (err.name === "ValidationError") {
        res.status(400).json({
            success: false,
            message: "Validation error",
            errors: err.message,
        });
        return;
    }
    interface MongoServerError extends Error {
        code: number;
    }
    if (err.name === "MongoServerError" &&
        (err as MongoServerError).code === 11000) {
        res.status(409).json({
            success: false,
            message: "Duplicate entry",
        });
        return;
    }
    if (err.name === "CastError") {
        res.status(400).json({
            success: false,
            message: "Invalid ID format",
        });
        return;
    }
    if (err.name === "JsonWebTokenError") {
        res.status(401).json({
            success: false,
            message: "Invalid token",
        });
        return;
    }
    if (err.name === "TokenExpiredError") {
        res.status(401).json({
            success: false,
            message: "Token expired",
        });
        return;
    }
    res.status(500).json({
        success: false,
        message: process.env.NODE_ENV === "production"
            ? "Internal server error"
            : err.message,
    });
};
export const notFound = (req: Request, res: Response): void => {
    res.status(404).json({
        success: false,
        message: `Route ${req.originalUrl} not found`,
    });
};
