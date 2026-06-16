const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { protect } = require('../middleware/authMiddleware');

router.post('/', protect, jobController.submitJob);
router.get('/', jobController.getJobs);
router.post('/retry-all', jobController.retryAllFailedJobs);
router.post('/:id/retry', jobController.retryJob);
router.get('/:id', jobController.getJobStatus);
router.delete('/:id', protect, jobController.deleteJob);

module.exports = router;
