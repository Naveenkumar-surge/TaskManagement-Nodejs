import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  approved: { type: Boolean, default: false },
  role: { type: String, enum: ["user", "admin"], default: "user" },
});

export default mongoose.model("User", UserSchema);
