import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { JWT_SECRET } from "../middleware/authMiddleware.js"; // Middleware to verify token
import Notification from "../models/Notification.js";
const router = express.Router();
const sendNotification = (io, message) => {
  io.emit("notification", { message });
};
// Register
router.post("/register", async (req, res) => {
  try {
      const { name, email, password } = req.body;

      let user = await User.findOne({ email });
      if (user) return res.status(400).json({ message: "User already exists" });

      const hashedPassword = await bcrypt.hash(password, 10);
      user = new User({ name, email, password: hashedPassword, approved: false });

      await user.save();
      res.status(201).json({ message: "Registration successful wait" });
  } catch (error) {
      res.status(500).json({ message: "Server error" });
  }
}); 
// Login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    // ✅ Ensure user is approved
    if (!user.approved) {
      return res.status(403).json({ message: "Waiting for admin approval." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "2m" });

    res.json({
      token,
      user: {
        userId: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approved: user.approved,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/users", async (req, res) => {
  try {
      const users = await User.find(); // Get all users (Admin Only)

      res.json(users);
  } catch (error) {
      res.status(500).json({ message: "Server error" });
  }
});
// Approve User (Admin Only)
router.put("/users/approve", async (req, res) => {
  try {
    const { email } = req.body; // Extract email from request body

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.approved) {
      return res.status(400).json({ message: "User is already approved" });
    }

    user.approved = true;
    await user.save();

    res.json({ message: `User ${email} approved successfully.` });
  } catch (error) {
    console.error("User Approval Error:", error);
    res.status(500).json({ message: "Internal server error", error: error.message });
  }
});

// ✅ Route to update user password
router.put("/:email", async (req, res) => {
  try {
    const { password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.findOneAndUpdate(
      { email: req.params.email },
      { password: hashedPassword },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Create a notification for profile update
    await Notification.create({
      userId: user._id,
      message: "Your profile has been updated.with the password"+password,
      type: "profile",
    });

    // ✅ Emit notification in real-time
    const io = req.app.get("socketio");
    if (io) {
      io.emit("new-notification", {
        userId: user._id.toString(),
        message: "Your profile has been updated.with the password="+password,
      });
    }

    res.status(200).json({ message: "Profile updated successfully!" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ message: "Server error" });
  }
});



export default router;

// Get all users (Admin Only)

// Approve User (Admin Only)


