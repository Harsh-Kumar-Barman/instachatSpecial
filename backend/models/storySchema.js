// models/storySchema.js
const mongoose = require("mongoose");

const storySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  media: { type: String, required: true }, // URL for image/video
  type: { type: String, enum: ['image', 'video'], required: true },
  createdAt: { type: Date, default: Date.now, expires: 86400 }, // Auto delete after 24 hours
});

const Story = mongoose.model("Story", storySchema);
module.exports = Story;
