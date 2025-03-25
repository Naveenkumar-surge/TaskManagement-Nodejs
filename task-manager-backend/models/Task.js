import mongoose from "mongoose";
import { io } from "../server.js"; // Import the existing io instance

const TaskSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  priority: { type: String, enum: ["Low", "Medium", "High"], required: true },
  deadline: { type: Date, required: true },
  status: { type: String, enum: ["Pending", "In Progress", "Completed"], default: "Pending" } // New status field
}, { timestamps: true });

// Trigger a notification when a new task is inserted
TaskSchema.post("save", async function (doc) {
  try {
    const Notification = mongoose.model("Notification");
    await Notification.create({
      userId: doc.userId,
      message: `New Task Added: ${doc.name}`,
      type: "task",
    });

    // Emit real-time event using the existing io instance
    io.emit("new-notification", {
      userId: doc.userId.toString(),
      message: `New Task Added: ${doc.name}`,
    });
  } catch (error) {
    console.error("Error sending notification:", error);
  }
});

export default mongoose.model("Task", TaskSchema);
