import { body } from "express-validator";

export const createShelterValidation = [
  body("name").notEmpty().withMessage("Shelter name is required").trim(),
  body("description").notEmpty().withMessage("Description is required"),
  body("email").isEmail().withMessage("Invalid email address").normalizeEmail(),
  body("phone").notEmpty().withMessage("Phone is required"),
  body("address.street").notEmpty().withMessage("Street is required"),
  body("address.city").notEmpty().withMessage("City is required"),
  body("address.state").notEmpty().withMessage("State is required"),
  body("address.zipCode").notEmpty().withMessage("Zip code is required"),
  body("address.country").notEmpty().withMessage("Country is required"),
  body("location.coordinates")
    .isArray({ min: 2, max: 2 })
    .withMessage("Coordinates must be [longitude, latitude]"),
  body("capacity").isInt({ min: 1 }).withMessage("Capacity must be at least 1"),
];

export const applyToShelterValidation = [
  body("shelterId").isMongoId().withMessage("Invalid shelter ID"),
];
