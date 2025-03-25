import mongoose from "mongoose";
import express from "express";
import Task from "../models/Task.js";
import Notification from "../models/Notification.js";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../middleware/authMiddleware.js";
const router = express.Router();
const sendNotification = (io, message) => {
  io.emit("notification", { message });
};
// Get Tasks by Email
router.get('/:id', async (req, res) => {
  const tasks = await Task.find({userId: req.params.id });
  res.json(tasks);
});
// Create Task (Use auto-generated ID)
router.post('/tasks', async (req, res) => {
  try {
      const { name, description, category, priority, deadline, userId } = req.body; 

      // Check if all required fields are present
      if (!name || !description || !category || !priority || !deadline || !userId) {
          return res.status(400).json({ message: "All fields are required" });
      }

      // Validate userId format
      if (!mongoose.Types.ObjectId.isValid(userId)) {
          return res.status(400).json({ message: "Invalid userId format" });
      }

      // Convert userId to ObjectId
      const objectIdUserId = new mongoose.Types.ObjectId(userId);

      // Create new Task
      const newTask = new Task({
          name,
          description,
          category,
          priority,
          deadline,
          userId: objectIdUserId, // Store userId as ObjectId
      });

      // Save Task
      const savedTask = await newTask.save();
      res.status(201).json(savedTask);
  } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
});
router.put('/:id', async (req, res) => {
  console.log("Received update data:", req.body);
  try {
    const { id } = req.params;
    const updatedTask = await Task.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedTask) {
      return res.status(404).json({ message: "Task not found" });
    }

    // ✅ Use updatedTask instead of task
    await Notification.create({
      userId: updatedTask.userId,
      message: `Task updated: ${updatedTask.name}`,
      type: "task-updated",
    });

    // ✅ Emit notification in real-time
    const io = req.app.get("socketio");
    if (io) {
      io.emit("new-notification", {
        userId: updatedTask.userId.toString(),
        message: `Task updated: ${updatedTask.name}`,
      });
    }

    res.status(200).json({ message: "Task updated successfully", updatedTask });

  } catch (error) {
    console.error("Update error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
});


// ✅ Task Delete Route
router.delete("/:id", async (req, res) => {
  try {
    // Find the task first
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: "Task not found" });
    }

    // Delete the task
    await Task.findByIdAndDelete(req.params.id);

    // Create a notification
    await Notification.create({
      userId: task.userId,
      message: `Task Deleted: ${task.name}`,
      type: "task-delete",
    });

    // Emit notification in real-time
    const io = req.app.get("socketio");
    if (io) {
      io.emit("new-notification", {
        userId: task.userId.toString(),
        message: `Task Deleted: ${task.name}`,
      });
    }

    res.status(200).json({ message: "Task deleted successfully" });

  } catch (error) {
    console.error("Task deletion error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ✅ Fetch tasks based on multiple conditions
router.get("/tasks/:userId", async (req, res) => {
  const { userId } = req.params;
  const { category, priority, deadlineSort, date, search } = req.query;

  try {
    let query = { userId };

    // 🔹 **Filter by Category**
    if (category) {
      query.category = category;
    }

    // 🔹 **Filter by Priority (Ensure Case-Insensitive Matching)**
    if (priority) {
      query.priority = { $regex: new RegExp(`^${priority}$`, "i") };
    }

    // 🔹 **Fix Date Filtering (Exact Day Range)**
    if (date) {
      const startDate = new Date(date);
      startDate.setUTCHours(0, 0, 0, 0); // Start of the day (00:00:00 UTC)
      const endDate = new Date(date);
      endDate.setUTCHours(23, 59, 59, 999); // End of the day (23:59:59 UTC)

      query.deadline = { $gte: startDate, $lte: endDate };
    }

    // 🔹 **Search by Task Name or Description**
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    // 🔹 **Sorting Conditions**
    let sortQuery = {};
    if (deadlineSort) {
      sortQuery.deadline = deadlineSort === "asc" ? 1 : -1;
    }

    // 🔹 **Fetch Data from MongoDB**
    const tasks = await Task.find(query).sort(sortQuery);
    res.json(tasks);
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

export default router;
