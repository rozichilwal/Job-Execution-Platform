const mongoose = require('mongoose');

const WorkerSchema = new mongoose.Schema({
  workerId: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['idle', 'busy', 'offline'],
    default: 'idle',
  },
  lastHeartbeat: {
    type: Date,
    default: Date.now,
  },
  missedHeartbeats: {
    type: Number,
    default: 0,
  },
  healthMetrics: {
    cpu: { type: Number, default: 0 },       // CPU usage percentage
    memory: { type: Number, default: 0 },     // Memory usage percentage
    uptime: { type: Number, default: 0 },     // Process uptime in seconds
  },
  currentJob: {
    type: String,
    default: null,
  },
  jobsCompleted: {
    type: Number,
    default: 0,
  },
  jobsFailed: {
    type: Number,
    default: 0,
  },
  deregisteredAt: {
    type: Date,
    default: null,
  },
}, { timestamps: true });

module.exports = mongoose.model('Worker', WorkerSchema);
