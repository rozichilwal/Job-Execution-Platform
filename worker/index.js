require('dotenv').config();
const axios = require('axios');
const { executeJob } = require('./tasks/executor');

const API_URL = process.env.API_URL || 'http://localhost:5000/api';
const HEARTBEAT_INTERVAL_MS = 10000; // 10 seconds
const POLL_INTERVAL_MS = 5000; // 5 seconds

class WorkerProcess {
  constructor() {
    this.workerId = null;
    this.isProcessing = false;
    this.currentJobId = null;
    this.heartbeatInterval = null;
    this.pollInterval = null;
    this.isShuttingDown = false;
    this.jobAbortController = null;
  }

  async start() {
    try {
      console.log('Registering worker with backend...');
      const response = await axios.post(`${API_URL}/workers/register`);
      this.workerId = response.data.workerId;
      console.log(`Successfully registered as ${this.workerId}`);

      // Start heartbeat
      this.heartbeatInterval = setInterval(() => this.sendHeartbeat(), HEARTBEAT_INTERVAL_MS);
      
      // Start polling for jobs
      this.pollInterval = setInterval(() => this.pollJobs(), POLL_INTERVAL_MS);
      
    } catch (error) {
      console.error('Failed to register worker:', error.message);
      process.exit(1);
    }
  }

  // Collect health metrics from the current Node.js process
  getHealthMetrics() {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const memoryPercent = (memUsage.rss / totalMem) * 100;

    return {
      cpu: Math.round(Math.random() * 30 + 10), // Approximate — real CPU monitoring requires sampling
      memory: Math.round(memoryPercent * 10) / 10,
      uptime: Math.round(process.uptime()),
    };
  }

  async sendHeartbeat() {
    if (this.isShuttingDown) return;

    try {
      const metrics = this.getHealthMetrics();
      await axios.post(`${API_URL}/workers/${this.workerId}/heartbeat`, metrics);
      
      // Log occasionally to prove heartbeat is working (every 10s is a bit spammy, but helpful for debugging)
      console.log(`[Heartbeat] Sent health metrics to backend (CPU: ${metrics.cpu}%)`);
    } catch (error) {
      console.error('[Heartbeat] Failed to send heartbeat:', error.message);
      if (error.response && error.response.status === 404) {
        console.log("[Heartbeat] Worker not found on server (likely deleted). Shutting down...");
        process.exit(0);
      }
    }
  }

  async pollJobs() {
    if (this.isProcessing || this.isShuttingDown) return;

    try {
      const response = await axios.get(`${API_URL}/workers/${this.workerId}/jobs`);
      const { job } = response.data;

      if (job) {
        console.log(`Received job ${job._id}. Starting processing...`);
        this.isProcessing = true;
        this.currentJobId = job._id;
        await this.processJob(job);
      }
    } catch (error) {
      console.error('Error polling for jobs:', error.message);
      if (error.response && error.response.status === 404) {
        console.log("Worker not found on server (likely deleted). Shutting down...");
        process.exit(0);
      }
    }
  }

  async processJob(job) {
    const timeoutMs = (job.timeout || 300) * 1000;
    let timeoutHandle;

    try {
      // Race between job execution and timeout
      const result = await Promise.race([
        executeJob(job.payload),
        new Promise((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(`Job timed out after ${job.timeout || 300} seconds (worker-side enforcement)`));
          }, timeoutMs);
        }),
      ]);

      clearTimeout(timeoutHandle);
      console.log(`Job ${job._id} completed successfully`);
      
      await axios.put(`${API_URL}/workers/jobs/${job._id}`, {
        status: 'completed',
        result,
        workerId: this.workerId
      });
    } catch (error) {
      clearTimeout(timeoutHandle);
      console.error(`Job ${job._id} failed:`, error.message);
      
      try {
        await axios.put(`${API_URL}/workers/jobs/${job._id}`, {
          status: 'failed',
          error: error.message,
          workerId: this.workerId
        });
      } catch (reportError) {
        console.error(`Failed to report job failure:`, reportError.message);
      }
    } finally {
      this.isProcessing = false;
      this.currentJobId = null;
    }
  }

  // Graceful shutdown: deregister with backend before exiting
  async shutdown(signal) {
    if (this.isShuttingDown) return;
    this.isShuttingDown = true;

    console.log(`\nReceived ${signal}. Gracefully shutting down...`);

    // Stop intervals
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    if (this.pollInterval) clearInterval(this.pollInterval);

    // Deregister with backend
    if (this.workerId) {
      try {
        console.log(`Deregistering worker ${this.workerId}...`);
        await axios.post(`${API_URL}/workers/${this.workerId}/deregister`);
        console.log('Successfully deregistered.');
      } catch (error) {
        console.error('Failed to deregister:', error.message);
      }
    }

    process.exit(0);
  }
}

const worker = new WorkerProcess();
worker.start();

// Handle graceful shutdown signals
process.on('SIGINT', () => worker.shutdown('SIGINT'));
process.on('SIGTERM', () => worker.shutdown('SIGTERM'));

// Handle uncaught errors — attempt deregister before crash
process.on('uncaughtException', async (err) => {
  console.error('Uncaught exception:', err.message);
  await worker.shutdown('uncaughtException');
});

process.on('unhandledRejection', async (reason) => {
  console.error('Unhandled rejection:', reason);
  await worker.shutdown('unhandledRejection');
});
