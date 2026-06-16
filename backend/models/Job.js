const mongoose = require('mongoose');

const RetryHistorySchema = new mongoose.Schema({
  attempt: { type: Number, required: true },
  error: { type: String, default: null },
  failedAt: { type: Date, default: Date.now },
  workerId: { type: String, default: null },
  failureReason: { type: String, default: null },
}, { _id: false });

const JobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    default: '',
  },
  payload: {
    type: Object,
    default: {},
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium',
  },
  maxRetries: {
    type: Number,
    default: 3,
  },
  timeout: {
    type: Number,
    default: 300, // seconds
  },
  scheduleJob: {
    type: Boolean,
    default: false,
  },
  notifyOnCompletion: {
    type: Boolean,
    default: false,
  },
  assignedWorker: {
    type: String,
    default: null,
  },
  scheduledAt: {
    type: Date,
    default: null,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  result: {
    type: Object,
    default: null,
  },
  error: {
    type: String,
    default: null,
  },
  retries: {
    type: Number,
    default: 0,
  },
  startedAt: {
    type: Date,
    default: null,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  retryAfter: {
    type: Date,
    default: null,
  },
  failureReason: {
    type: String,
    enum: ['worker_crash', 'timeout', 'execution_error', 'manual', null],
    default: null,
  },
  retryHistory: {
    type: [RetryHistorySchema],
    default: [],
  },
}, { timestamps: true });

module.exports = mongoose.model('Job', JobSchema);
