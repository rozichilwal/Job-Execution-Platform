const express = require('express');
const router = express.Router();
const workerController = require('../controllers/workerController');

router.post('/register', workerController.registerWorker);
router.post('/spawn', workerController.spawnWorker);
router.get('/health/summary', workerController.getHealthSummary);
router.get('/', workerController.getWorkers);
router.get('/:id', workerController.getWorker);
router.put('/:id', workerController.updateWorker);
router.delete('/:id', workerController.deleteWorker);
router.post('/:id/heartbeat', workerController.heartbeat);
router.post('/:id/deregister', workerController.deregisterWorker);
router.get('/:id/jobs', workerController.pollJobs);
router.put('/jobs/:jobId', workerController.updateJobStatus);

module.exports = router;
