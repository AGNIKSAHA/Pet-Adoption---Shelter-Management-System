import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: "admin" | "shelter_staff" | "adopter";
        shelterId?: string;
      };
    }
  }
}

export {};
