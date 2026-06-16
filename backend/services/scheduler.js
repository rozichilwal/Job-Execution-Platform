const Worker = require('../models/Worker');
const Job = require('../models/Job');
const Notification = require('../models/Notification');

const HEARTBEAT_INTERVAL_MS = 10000;   // Workers send heartbeat every 10s
const MISSED_HEARTBEAT_WARN = 1;       // Warn after 1 missed beat
const MISSED_HEARTBEAT_OFFLINE = 2;    // Mark offline after 2 missed beats
const RETRY_BASE_DELAY_MS = 5000;      // 5 second base for exponential backoff

class Scheduler {
  constructor() {
    this.interval = null;
  }

  start() {
    console.log('Scheduler started...');
    // Run every 5 seconds
    this.interval = setInterval(() => this.tick(), 5000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  async tick() {
    try {
      await this.monitorHeartbeats();
      await this.handleTimedOutJobs();
      await this.assignJobs();
    } catch (error) {
      console.error('Scheduler error:', error.message);
    }
  }

  // ─── Heartbeat Monitoring ────────────────────────────────────────
  // Instead of immediately marking workers offline, we use a graduated
  // approach: increment missedHeartbeats on each tick where the worker
  // hasn't sent a heartbeat. Warn at threshold, offline at limit.
  async monitorHeartbeats() {
    const cutoffTime = new Date(Date.now() - HEARTBEAT_INTERVAL_MS);

    // Find workers that should have sent a heartbeat by now
    const staleWorkers = await Worker.find({
      lastHeartbeat: { $lt: cutoffTime },
      status: { $ne: 'offline' }
    });

    for (const worker of staleWorkers) {
      worker.missedHeartbeats = (worker.missedHeartbeats || 0) + 1;

      if (worker.missedHeartbeats >= MISSED_HEARTBEAT_OFFLINE) {
        // Worker is dead — mark offline and recover its jobs
        console.log(`Worker ${worker.workerId} missed ${worker.missedHeartbeats} heartbeats. Marking OFFLINE.`);
        worker.status = 'offline';
        worker.currentJob = null;
        await worker.save();

        await this.recoverJobsFromWorker(worker.workerId, 'worker_crash');

      } else if (worker.missedHeartbeats >= MISSED_HEARTBEAT_WARN) {
        // Warning level — just log and save
        console.log(`⚠ Worker ${worker.workerId} missed ${worker.missedHeartbeats} heartbeats (warning).`);
        await worker.save();
      } else {
        await worker.save();
      }
    }
  }

  // ─── Job Timeout Enforcement ─────────────────────────────────────
  // Find processing jobs that have exceeded their configured timeout.
  async handleTimedOutJobs() {
    const processingJobs = await Job.find({ status: 'processing', startedAt: { $ne: null } });

    for (const job of processingJobs) {
      const timeoutMs = (job.timeout || 300) * 1000;
      const elapsed = Date.now() - new Date(job.startedAt).getTime();

      if (elapsed > timeoutMs) {
        console.log(`Job ${job._id} timed out (${Math.round(elapsed / 1000)}s > ${job.timeout}s). Recovering...`);

        // Push to retry history
        job.retryHistory.push({
          attempt: job.retries + 1,
          error: `Job timed out after ${Math.round(elapsed / 1000)} seconds`,
          failedAt: new Date(),
          workerId: job.assignedWorker,
          failureReason: 'timeout',
        });

        const maxRetries = job.maxRetries !== undefined ? job.maxRetries : 3;

        if (job.retries < maxRetries) {
          // Retry with backoff
          job.retries += 1;
          job.status = 'pending';
          job.failureReason = 'timeout';
          job.retryAfter = new Date(Date.now() + RETRY_BASE_DELAY_MS * Math.pow(2, job.retries - 1));
          job.startedAt = null;
          const timedOutWorker = job.assignedWorker;
          job.assignedWorker = null;
          await job.save();

          console.log(`Job ${job._id} re-queued for retry ${job.retries}/${maxRetries} (backoff until ${job.retryAfter.toISOString()})`);

          // Free the worker
          if (timedOutWorker) {
            await Worker.findOneAndUpdate(
              { workerId: timedOutWorker },
              { status: 'idle', currentJob: null }
            );
          }
        } else {
          // Max retries exhausted
          job.status = 'failed';
          job.failureReason = 'timeout';
          job.completedAt = new Date();
          const timedOutWorker = job.assignedWorker;
          job.assignedWorker = null;
          await job.save();

          // Free the worker
          if (timedOutWorker) {
            await Worker.findOneAndUpdate(
              { workerId: timedOutWorker },
              { status: 'idle', currentJob: null, $inc: { jobsFailed: 1 } }
            );
          }

          // Notify owner
          if (job.notifyOnCompletion && job.createdBy) {
            await Notification.create({
              user: job.createdBy,
              job: job._id,
              message: `Job '${job.title}' failed due to timeout after ${job.retries} retries.`,
              type: 'error'
            });
          }

          console.log(`Job ${job._id} permanently FAILED (timeout, max retries exhausted).`);
        }
      }
    }
  }

  // ─── Job Assignment ──────────────────────────────────────────────
  // Assign pending jobs to idle workers, respecting priority order
  // and exponential backoff (retryAfter).
  async assignJobs() {
    const now = new Date();
    const timeCondition = { $or: [{ scheduledAt: null }, { scheduledAt: { $lte: now } }] };
    // Only pick up jobs whose backoff has expired (or never had one)
    const backoffCondition = { $or: [{ retryAfter: null }, { retryAfter: { $lte: now } }] };

    // Find pending jobs ordered by Priority (High -> Medium -> Low), then by createdAt, respecting schedule
    const pendingJobsHigh = await Job.find({ status: 'pending', priority: 'High', ...timeCondition, ...backoffCondition }).sort({ createdAt: 1 });
    const pendingJobsMedium = await Job.find({ status: 'pending', priority: 'Medium', ...timeCondition, ...backoffCondition }).sort({ createdAt: 1 });
    const pendingJobsLow = await Job.find({ status: 'pending', priority: 'Low', ...timeCondition, ...backoffCondition }).sort({ createdAt: 1 });

    // Combine them into a prioritized queue
    const pendingJobs = [...pendingJobsHigh, ...pendingJobsMedium, ...pendingJobsLow];

    if (pendingJobs.length === 0) return;

    // Find available idle workers
    const idleWorkers = await Worker.find({ status: 'idle' });
    if (idleWorkers.length === 0) return;

    // Simple round-robin assignment
    let workerIdx = 0;
    for (let i = 0; i < pendingJobs.length && workerIdx < idleWorkers.length; i++) {
      const job = pendingJobs[i];
      const worker = idleWorkers[workerIdx];

      job.status = 'processing';
      job.assignedWorker = worker.workerId;
      job.startedAt = new Date();
      await job.save();

      worker.status = 'busy';
      worker.currentJob = job._id.toString();
      await worker.save();

      console.log(`Assigned Job ${job._id} to Worker ${worker.workerId}`);
      workerIdx++;
    }
  }

  // ─── Recovery Helper ─────────────────────────────────────────────
  // Re-queue all processing jobs that were assigned to a crashed worker.
  async recoverJobsFromWorker(workerId, reason) {
    const orphanedJobs = await Job.find({
      assignedWorker: workerId,
      status: 'processing'
    });

    for (const job of orphanedJobs) {
      const maxRetries = job.maxRetries !== undefined ? job.maxRetries : 3;

      // Log this failure in retry history
      job.retryHistory.push({
        attempt: job.retries + 1,
        error: `Worker ${workerId} crashed/went offline`,
        failedAt: new Date(),
        workerId: workerId,
        failureReason: reason,
      });

      if (job.retries < maxRetries) {
        job.retries += 1;
        job.status = 'pending';
        job.assignedWorker = null;
        job.startedAt = null;
        job.failureReason = reason;
        job.retryAfter = new Date(Date.now() + RETRY_BASE_DELAY_MS * Math.pow(2, job.retries - 1));
        await job.save();
        console.log(`Job ${job._id} recovered from ${workerId}. Retry ${job.retries}/${maxRetries} (backoff until ${job.retryAfter.toISOString()})`);
      } else {
        job.status = 'failed';
        job.assignedWorker = null;
        job.failureReason = reason;
        job.completedAt = new Date();
        await job.save();

        // Notify owner
        if (job.notifyOnCompletion && job.createdBy) {
          await Notification.create({
            user: job.createdBy,
            job: job._id,
            message: `Job '${job.title}' failed after worker ${workerId} crashed. Max retries exhausted.`,
            type: 'error'
          });
        }

        console.log(`Job ${job._id} permanently FAILED (${reason}, max retries exhausted).`);
      }
    }
  }
}

module.exports = new Scheduler();
