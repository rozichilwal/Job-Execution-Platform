const Job = require('../models/Job');

// @desc    Submit a new job
// @route   POST /api/jobs
exports.submitJob = async (req, res) => {
  try {
    const { title, description, payload, priority, maxRetries, timeout, notifyOnCompletion, count } = req.body;
    
    if (!title || !payload) {
      return res.status(400).json({ error: 'Title and payload are required' });
    }

    const numJobs = parseInt(count) || 1;
    const jobs = [];

    for (let i = 0; i < numJobs; i++) {
      const jobTitle = numJobs > 1 ? `${title} - ${i + 1}` : title;
      const job = await Job.create({ 
        title: jobTitle, 
        description,
        payload, 
        priority, 
        maxRetries, 
        timeout, 
        notifyOnCompletion,
        createdBy: req.user ? req.user.id : null,
      });
      jobs.push(job);
    }

    res.status(201).json(numJobs === 1 ? jobs[0] : jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get all jobs
// @route   GET /api/jobs
exports.getJobs = async (req, res) => {
  try {
    const jobs = await Job.find().sort({ createdAt: -1 });
    res.status(200).json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Get specific job status
// @route   GET /api/jobs/:id
exports.getJobStatus = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    res.status(200).json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Retry a specific failed job
// @route   POST /api/jobs/:id/retry
exports.retryJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    if (job.status !== 'failed') {
      return res.status(400).json({ error: 'Only failed jobs can be retried' });
    }
    
    // Reset job to pending
    job.status = 'pending';
    job.assignedWorker = null;
    job.error = null;
    job.retries = 0;
    await job.save();

    res.json(job);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Retry all failed jobs
// @route   POST /api/jobs/retry-all
exports.retryAllFailedJobs = async (req, res) => {
  try {
    const result = await Job.updateMany(
      { status: 'failed' },
      { $set: { status: 'pending', assignedWorker: null, error: null, retries: 0 } }
    );
    res.json({ message: `Successfully queued ${result.modifiedCount} failed jobs for retry` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// @desc    Delete a job
// @route   DELETE /api/jobs/:id
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    await job.deleteOne();
    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
