import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import taskRoutes from "./routes/taskRoutes.js";
import { Server } from "socket.io";
import http from "http";
import notificationRoutes from "./routes/notificationRoutes.js";
dotenv.config();
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/tasks", taskRoutes);
app.use('/api/notifications', notificationRoutes);



// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI || "mongodb://localhost:27017/mongodb", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB Connection Error:", err));

// WebSockets for real-time notifications
const io = new Server(server, { cors: { origin: "*" } });
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("task-added", (task) => {
    io.emit("new-task", task);
  });

  socket.on("disconnect", () => console.log("User disconnected"));
});
app.set("socketio", io);
export { io };
// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
