const Worker = require('../models/Worker');
const Job = require('../models/Job');
const Notification = require('../models/Notification');

const { fork } = require('child_process');
const path = require('path');

const RETRY_BASE_DELAY_MS = 5000; // 5 second base for exponential backoff

// @desc    Register a new worker (Legacy/Mock)
// @route   POST /api/workers/register
exports.registerWorker = async (req, res) => {
  try {
    const workerId = `worker-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const worker = await Worker.create({ workerId, status: 'idle', lastHeartbeat: Date.now() });
    res.status(201).json(worker);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Spawn real Node.js worker processes
// @route   POST /api/workers/spawn
exports.spawnWorker = async (req, res) => {
  try {
    const { count } = req.body;
    const numWorkers = parseInt(count) || 1;
    const workerPath = path.join(__dirname, '../../worker/index.js');
    const pids = [];

    for (let i = 0; i < numWorkers; i++) {
      const child = fork(workerPath, [], {
        env: process.env,
        detached: true,
        stdio: 'ignore'
      });
      child.unref();
      pids.push(child.pid);
    }
    
    res.status(200).json({ message: `${numWorkers} Worker processes spawned successfully`, pids });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Worker heartbeat with health metrics
// @route   POST /api/workers/:id/heartbeat
exports.heartbeat = async (req, res) => {
  try {
    const { id } = req.params;
    const { cpu, memory, uptime } = req.body;

    const worker = await Worker.findOne({ workerId: id });
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    worker.lastHeartbeat = Date.now();
    worker.missedHeartbeats = 0;
    
    // Auto-recover offline workers when their network resumes
    if (worker.status === 'offline') {
      worker.status = 'idle';
      console.log(`Worker ${id} automatically recovered to idle state via heartbeat.`);
    }

    // Update health metrics
    if (!worker.healthMetrics) worker.healthMetrics = {};
    if (cpu !== undefined) worker.healthMetrics.cpu = cpu;
    if (memory !== undefined) worker.healthMetrics.memory = memory;
    if (uptime !== undefined) worker.healthMetrics.uptime = uptime;

    await worker.save();
    
    res.status(200).json({ message: 'Heartbeat acknowledged' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Poll for assigned jobs
// @route   GET /api/workers/:id/jobs
exports.pollJobs = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if worker exists
    const worker = await Worker.findOne({ workerId: id });
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    // Find a job assigned to this worker that is still processing
    const job = await Job.findOne({ assignedWorker: id, status: 'processing' });
    
    if (job) {
      return res.status(200).json({ job });
    }
    
    res.status(200).json({ job: null, message: 'No jobs assigned' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Update job status (by worker)
// @route   PUT /api/workers/jobs/:jobId
exports.updateJobStatus = async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status, result, error, workerId } = req.body;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    
    // Only the assigned worker should update it
    if (job.assignedWorker !== workerId) {
      return res.status(403).json({ error: 'Worker not assigned to this job' });
    }

    const maxRetries = job.maxRetries !== undefined ? job.maxRetries : 3;

    if (status === 'failed' && job.retries < maxRetries) {
      // Push failure to retry history
      job.retryHistory.push({
        attempt: job.retries + 1,
        error: error || 'Unknown execution error',
        failedAt: new Date(),
        workerId: workerId,
        failureReason: 'execution_error',
      });

      job.status = 'pending';
      job.retries += 1;
      job.assignedWorker = null;
      job.startedAt = null;
      job.failureReason = 'execution_error';
      // Exponential backoff: 5s, 10s, 20s, 40s...
      job.retryAfter = new Date(Date.now() + RETRY_BASE_DELAY_MS * Math.pow(2, job.retries - 1));
      console.log(`Job ${job._id} failed. Retrying ${job.retries}/${maxRetries} (backoff until ${job.retryAfter.toISOString()})`);

      // Increment worker's jobsFailed and free it
      await Worker.findOneAndUpdate(
        { workerId },
        { status: 'idle', currentJob: null, $inc: { jobsFailed: 1 } }
      );
    } else if (status === 'failed') {
      // Max retries exhausted — permanent failure
      job.retryHistory.push({
        attempt: job.retries + 1,
        error: error || 'Unknown execution error',
        failedAt: new Date(),
        workerId: workerId,
        failureReason: 'execution_error',
      });

      job.status = 'failed';
      job.failureReason = 'execution_error';
      job.completedAt = new Date();

      if (job.notifyOnCompletion && job.createdBy) {
        await Notification.create({
          user: job.createdBy,
          job: job._id,
          message: `Job '${job.title}' failed after ${job.retries + 1} attempts.`,
          type: 'error'
        });
      }

      await Worker.findOneAndUpdate(
        { workerId },
        { status: 'idle', currentJob: null, $inc: { jobsFailed: 1 } }
      );
    } else if (status === 'completed') {
      job.status = 'completed';
      job.completedAt = new Date();

      if (job.notifyOnCompletion && job.createdBy) {
        await Notification.create({
          user: job.createdBy,
          job: job._id,
          message: `Job '${job.title}' completed successfully.`,
          type: 'success'
        });
      }

      await Worker.findOneAndUpdate(
        { workerId },
        { status: 'idle', currentJob: null, $inc: { jobsCompleted: 1 } }
      );
    } else {
      job.status = status;
    }

    if (result) job.result = result;
    if (error) job.error = error;
    
    await job.save();
    
    res.status(200).json(job);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// @desc    Graceful worker deregistration
// @route   POST /api/workers/:id/deregister
exports.deregisterWorker = async (req, res) => {
  try {
    const { id } = req.params;

    const worker = await Worker.findOneAndUpdate(
      { workerId: id },
      { 
        status: 'offline', 
        deregisteredAt: new Date(), 
        currentJob: null,
        missedHeartbeats: 0,
      },
      { returnDocument: 'after' }
    );

    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    // Re-queue any in-progress jobs that were assigned to this worker
    const orphanedJobs = await Job.find({
      assignedWorker: id,
      status: 'processing'
    });

    for (const job of orphanedJobs) {
      job.retryHistory.push({
        attempt: job.retries + 1,
        error: `Worker ${id} gracefully deregistered while processing`,
        failedAt: new Date(),
        workerId: id,
        failureReason: 'worker_crash',
      });

      job.status = 'pending';
      job.retries += 1;
      job.assignedWorker = null;
      job.startedAt = null;
      job.failureReason = 'worker_crash';
      job.retryAfter = new Date(Date.now() + RETRY_BASE_DELAY_MS * Math.pow(2, job.retries - 1));
      await job.save();
      console.log(`Job ${job._id} re-queued after worker ${id} deregistered.`);
    }

    res.status(200).json({ message: `Worker ${id} deregistered. ${orphanedJobs.length} jobs re-queued.` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get all workers
// @route   GET /api/workers
exports.getWorkers = async (req, res) => {
  try {
    const workers = await Worker.find().sort({ lastHeartbeat: -1 });
    res.status(200).json(workers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get a single worker
// @route   GET /api/workers/:id
exports.getWorker = async (req, res) => {
  try {
    const worker = await Worker.findOne({ workerId: req.params.id });
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    res.status(200).json(worker);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Update a worker
// @route   PUT /api/workers/:id
exports.updateWorker = async (req, res) => {
  try {
    const { status } = req.body;
    
    const updatePayload = { status };
    
    // If manually bringing the worker back online, reset its heartbeat tracking
    // so the scheduler doesn't instantly mark it offline again.
    if (status !== 'offline') {
      updatePayload.lastHeartbeat = Date.now();
      updatePayload.missedHeartbeats = 0;
      updatePayload.deregisteredAt = null;
    }
    
    const worker = await Worker.findOneAndUpdate(
      { workerId: req.params.id },
      updatePayload,
      { returnDocument: 'after' }
    );
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }

    // If the worker was just made idle, instantly trigger job assignment
    // so it doesn't have to wait for the next scheduler tick.
    if (status === 'idle') {
      const scheduler = require('../services/scheduler');
      // We don't await it so we don't block the API response
      scheduler.assignJobs().catch(err => console.error('Error auto-assigning jobs:', err.message));
    }

    res.status(200).json(worker);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Delete a worker
// @route   DELETE /api/workers/:id
exports.deleteWorker = async (req, res) => {
  try {
    const worker = await Worker.findOneAndDelete({ workerId: req.params.id });
    if (!worker) {
      return res.status(404).json({ error: 'Worker not found' });
    }
    res.status(200).json({ message: 'Worker deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get health summary of all workers
// @route   GET /api/workers/health/summary
exports.getHealthSummary = async (req, res) => {
  try {
    const workers = await Worker.find();

    const total = workers.length;
    const online = workers.filter(w => w.status !== 'offline').length;
    const offline = workers.filter(w => w.status === 'offline').length;
    const busy = workers.filter(w => w.status === 'busy').length;
    const idle = workers.filter(w => w.status === 'idle').length;
    const withWarnings = workers.filter(w => w.missedHeartbeats > 0 && w.status !== 'offline').length;

    const onlineWorkers = workers.filter(w => w.status !== 'offline');
    const avgCpu = onlineWorkers.length > 0
      ? onlineWorkers.reduce((sum, w) => sum + (w.healthMetrics?.cpu || 0), 0) / onlineWorkers.length
      : 0;
    const avgMemory = onlineWorkers.length > 0
      ? onlineWorkers.reduce((sum, w) => sum + (w.healthMetrics?.memory || 0), 0) / onlineWorkers.length
      : 0;

    const recentlyCrashed = workers
      .filter(w => w.status === 'offline' && w.deregisteredAt === null)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 5)
      .map(w => ({
        workerId: w.workerId,
        lastHeartbeat: w.lastHeartbeat,
        crashedAt: w.updatedAt,
      }));

    res.status(200).json({
      total,
      online,
      offline,
      busy,
      idle,
      withWarnings,
      avgCpu: Math.round(avgCpu * 10) / 10,
      avgMemory: Math.round(avgMemory * 10) / 10,
      recentlyCrashed,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
