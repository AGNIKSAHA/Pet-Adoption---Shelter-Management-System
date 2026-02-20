import dotenv from "dotenv";
dotenv.config();
interface EnvConfig {
    NODE_ENV: string;
    PORT: number;
    MONGODB_URI: string;
    JWT_SECRET: string;
    JWT_REFRESH_SECRET: string;
    JWT_EXPIRES_IN: string;
    JWT_REFRESH_EXPIRES_IN: string;
    CLIENT_URL: string;
    EMAIL_HOST: string;
    EMAIL_PORT: number;
    EMAIL_USER: string;
    EMAIL_PASSWORD: string;
    EMAIL_FROM: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    STRIPE_PUBLISHABLE_KEY: string;
    MAX_FILE_SIZE: number;
    UPLOAD_DIR: string;
    ENCRYPTION_KEY: string;
}
const getEnvVar = (key: string, defaultValue?: string): string => {
    const value = process.env[key] || defaultValue;
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
};
export const env: EnvConfig = {
    NODE_ENV: getEnvVar("NODE_ENV", "development"),
    PORT: parseInt(getEnvVar("PORT", "5000"), 10),
    MONGODB_URI: getEnvVar("MONGODB_URI"),
    JWT_SECRET: getEnvVar("JWT_SECRET"),
    JWT_REFRESH_SECRET: getEnvVar("JWT_REFRESH_SECRET"),
    JWT_EXPIRES_IN: getEnvVar("JWT_EXPIRES_IN", "15m"),
    JWT_REFRESH_EXPIRES_IN: getEnvVar("JWT_REFRESH_EXPIRES_IN", "7d"),
    CLIENT_URL: getEnvVar("CLIENT_URL", "http://localhost:5173"),
    EMAIL_HOST: getEnvVar("EMAIL_HOST"),
    EMAIL_PORT: parseInt(getEnvVar("EMAIL_PORT", "587"), 10),
    EMAIL_USER: getEnvVar("EMAIL_USER"),
    EMAIL_PASSWORD: getEnvVar("EMAIL_PASSWORD"),
    EMAIL_FROM: getEnvVar("EMAIL_FROM"),
    STRIPE_SECRET_KEY: getEnvVar("STRIPE_SECRET_KEY"),
    STRIPE_WEBHOOK_SECRET: getEnvVar("STRIPE_WEBHOOK_SECRET"),
    STRIPE_PUBLISHABLE_KEY: getEnvVar("STRIPE_PUBLISHABLE_KEY"),
    MAX_FILE_SIZE: parseInt(getEnvVar("MAX_FILE_SIZE", "5242880"), 10),
    UPLOAD_DIR: getEnvVar("UPLOAD_DIR", "uploads"),
    ENCRYPTION_KEY: getEnvVar("ENCRYPTION_KEY"),
};
