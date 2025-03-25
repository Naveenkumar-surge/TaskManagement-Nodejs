import express from "express";
import Notification from "../models/Notification.js";

const router = express.Router();

// Fetch notifications by userId
router.get("/:userId", async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.params.userId });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

// Clear all notifications for a user
router.delete("/:userId", async (req, res) => {
  try {
    await Notification.deleteMany({ userId: req.params.userId });
    res.json({ message: "Notifications cleared" });
  } catch (error) {
    res.status(500).json({ error: "Failed to clear notifications" });
  }
});

export default router;
