import { body, query } from "express-validator";

export const createPetValidation = [
  body("name").trim().notEmpty().withMessage("Pet name is required"),
  body("species")
    .isIn(["dog", "cat", "bird", "rabbit", "other"])
    .withMessage("Invalid species"),
  body("breed").trim().notEmpty().withMessage("Breed is required"),
  body("age").isInt({ min: 0 }).withMessage("Age must be a positive number"),
  body("gender")
    .isIn(["male", "female"])
    .withMessage("Gender must be male or female"),
  body("size")
    .isIn(["small", "medium", "large"])
    .withMessage("Size must be small, medium, or large"),
  body("color").trim().notEmpty().withMessage("Color is required"),
  body("description").trim().notEmpty().withMessage("Description is required"),
  body("shelterId").optional().isMongoId().withMessage("Invalid shelter ID"),
  // Health & Medical validation
  body("health.vaccinated")
    .isBoolean()
    .withMessage("Vaccination status is required"),
  body("health.spayedNeutered")
    .isBoolean()
    .withMessage("Spayed/neutered status is required"),
  body("health.microchipped")
    .isBoolean()
    .withMessage("Microchip status is required"),
];

export const updatePetValidation = [
  body("name").optional().trim().notEmpty(),
  body("species").optional().isIn(["dog", "cat", "bird", "rabbit", "other"]),
  body("breed").optional().trim().notEmpty(),
  body("age").optional().isInt({ min: 0 }),
  body("gender").optional().isIn(["male", "female"]),
  body("size").optional().isIn(["small", "medium", "large"]),
  body("color").optional().trim().notEmpty(),
  body("description").optional().trim().notEmpty(),
];

export const updateStatusValidation = [
  body("status")
    .isIn([
      "intake",
      "medical_hold",
      "available",
      "meet",
      "adopted",
      "returned",
      "fostered",
      "transferred",
      "deceased",
    ])
    .withMessage("Invalid status"),
];

export const searchPetsValidation = [
  query("species").optional().isIn(["dog", "cat", "bird", "rabbit", "other"]),
  query("breed").optional().trim(),
  query("minAge").optional().isInt({ min: 0 }),
  query("maxAge").optional().isInt({ min: 0 }),
  query("gender").optional().isIn(["male", "female"]),
  query("size").optional().isIn(["small", "medium", "large"]),
  query("page").optional().isInt({ min: 1 }),
  query("limit").optional().isInt({ min: 1, max: 100 }),
];
