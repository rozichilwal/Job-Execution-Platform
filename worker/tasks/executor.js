/**
 * Simulates a job execution
 * In a real application, this might process video, send emails, run ML models, etc.
 * @param {Object} payload The job payload
 * @returns {Promise<Object>} The result of the job
 */
const executeJob = async (payload = {}) => {
  return new Promise((resolve, reject) => {
    console.log(`Starting execution of job with payload:`, payload);
    
    // Simulate some work with a delay based on payload or random
    const delay = payload.delay || Math.floor(Math.random() * 5000) + 2000;
    
    setTimeout(() => {
      // Simulate a random failure (10% chance)
      if (Math.random() < 0.1) {
        return reject(new Error('Simulated random job failure'));
      }
      
      const result = {
        processed: true,
        executionTimeMs: delay,
        data: `Processed data for ${payload.id || 'unknown'}`,
        timestamp: new Date().toISOString()
      };
      
      resolve(result);
    }, delay);
  });
};

module.exports = { executeJob };
