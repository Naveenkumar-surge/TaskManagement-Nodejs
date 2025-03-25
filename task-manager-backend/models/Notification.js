import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: String,
  type: String,
  date: { type: Date, default: Date.now },
});

export default mongoose.model("Notification", NotificationSchema);
