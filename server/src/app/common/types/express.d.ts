import { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: "admin" | "shelter_staff" | "adopter";
        roles?: string[];
        shelterId?: string;
        memberships?: {
          shelterId: string;
          role: "admin" | "shelter_staff" | "adopter";
        }[];
      };
    }
  }
}

export {};
