import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import compression from "compression";
import rateLimit from "express-rate-limit";
import http from "http";
import { Server } from "socket.io";
import { env } from "./app/common/config/env";
import { errorHandler, notFound, } from "./app/common/middlewares/error.middleware";
import routes from "./app/routes";
import { connectDB } from "./app/common/config/db";
const app: Application = express();
const server = http.createServer(app);
export const io = new Server(server, {
    cors: {
        origin: env.CLIENT_URL,
        methods: ["GET", "POST"],
        credentials: true,
    },
});
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);
    socket.on("join", (userId: string) => {
        socket.join(userId);
        console.log(`User ${userId} joined their notification room`);
    });
    interface ChatMessage {
        receiverId?: string;
        senderId: string;
        content: string;
        [key: string]: unknown;
    }
    socket.on("chat_message", (msg: ChatMessage) => {
        if (msg.receiverId) {
            io.to(msg.receiverId).emit("chat_message", msg);
        }
        else {
            io.emit("chat_message", msg);
        }
    });
    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});
app.use(helmet());
app.use(cors({
    origin: env.CLIENT_URL,
    credentials: true,
}));
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.NODE_ENV === "development" ? 1000 : 100,
    message: "Too many requests from this IP, please try again later",
});
app.use("/api/v1", limiter);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser());
app.use(compression());
if (env.NODE_ENV === "development") {
    app.use(morgan("dev"));
}
else {
    app.use(morgan("combined"));
}
app.use("/uploads", express.static(env.UPLOAD_DIR));
app.use("/api/v1", routes);
app.use(notFound);
app.use(errorHandler);
const PORT = env.PORT || 5000;
const startServer = async () => {
    try {
        await connectDB();
        server.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT} in ${env.NODE_ENV} mode`);
            console.log(`📍 API: http://localhost:${PORT}/api/v1`);
            console.log(`🔌 Socket.IO enabled`);
        });
    }
    catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
};
startServer();
export default app;
