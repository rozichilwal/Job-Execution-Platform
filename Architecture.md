# System Architecture

The Job Execution Platform is built using a modern, distributed, microservices-inspired architecture designed for executing background jobs reliably at scale.

## Overall System Architecture

The system is logically divided into four primary components:

1. **Frontend Application** (Next.js, Tailwind CSS)
   - Provides a responsive, real-time dashboard for users to submit jobs, monitor execution status, view cluster health, and manage worker nodes.
   - Built with Server-Side Rendering (SSR) capabilities but heavily relies on Client-Side Rendering (CSR) for real-time polling and interactive UI elements.
   
2. **Backend API & Scheduler** (Node.js, Express, MongoDB)
   - Serves as the central orchestrator and data gateway.
   - Handles REST API requests from the frontend and worker nodes.
   - Contains a continuous background **Scheduler** that manages job queues, handles worker heartbeat monitoring, and recovers orphaned jobs when workers fail.

3. **Worker Nodes** (Node.js Processes)
   - Separate, decoupled Node.js processes responsible for doing the heavy lifting.
   - They continuously poll the backend for new assigned work, execute the job payloads, and report the results.
   - They send periodic heartbeats to the backend to prove they are alive and healthy.

4. **Database** (MongoDB Atlas)
   - A highly available NoSQL database acting as the single source of truth.
   - Stores Jobs, Worker states, User profiles, and Notifications.

---

## Component Interactions

1. **Job Submission Flow**
   - User submits a job via the Frontend.
   - Backend receives the request, creates a `Job` document in MongoDB with a status of `pending`, and optionally fires a notification.
2. **Worker Registration & Heartbeat**
   - Worker processes start up and call the `/workers/register` endpoint to receive a unique `workerId`.
   - Every 10 seconds, workers send their system metrics (CPU, Memory) to the `/workers/:id/heartbeat` endpoint.
3. **Job Assignment Flow**
   - The Backend Scheduler ticks every 5 seconds. It queries the database for `pending` jobs and `idle` workers.
   - It assigns jobs to available workers by updating the Job's `assignedWorker` field and changing the status to `processing`. The worker's status is changed to `busy`.
4. **Execution Flow**
   - Workers poll the backend `/workers/:id/jobs` endpoint every 5 seconds.
   - If a job is found, the worker executes the payload.
   - Upon completion or failure, the worker calls the PUT `/workers/jobs/:jobId` endpoint to update the result.
   - The worker returns to an `idle` state and begins polling for the next job.

---

## Design Decisions

- **Decoupled Workers:** By separating the workers from the main backend API, the system prevents heavy job execution from blocking the main Event Loop that serves user API requests.
- **Pull-Based Execution:** Workers actively *pull* jobs from the backend rather than the backend pushing to them. This simplifies load balancing and network routing, as workers do not need to expose a public port to receive push requests.
- **Stateless API:** The backend is completely stateless (authenticating via JWTs). This allows it to be scaled horizontally behind a load balancer without sticky sessions.
- **Heartbeat Mechanism:** Relying on active heartbeats allows the backend to proactively detect dead physical nodes or network partitions, rather than waiting for a job timeout.

---

## Scalability Considerations

- **Horizontal Worker Scaling:** Because the worker nodes use a pull-based model and maintain no persistent state, you can scale them infinitely. You simply spawn more worker processes across multiple servers, and they will organically drain the central queue.
- **Database Bottlenecks:** Currently, the Scheduler queries MongoDB every 5 seconds to find jobs and workers. At massive scale, this could lead to heavy database load. A future iteration could introduce Redis to manage the job queue and worker states in memory, drastically reducing MongoDB read/write operations.
- **Load Balancing the API:** The backend API can be replicated across multiple instances. However, care must be taken to ensure only *one* instance of the Scheduler runs to prevent race conditions during job assignment, or implement distributed locking (e.g., Redlock) around the `assignJobs` function.

---

## Failure Handling Strategies

1. **Worker Crashes & Zombie Jobs:**
   - If a worker crashes, it stops sending heartbeats. The backend Scheduler detects this (after 2 missed heartbeats, ~15-20 seconds).
   - The Scheduler marks the worker as `offline` and automatically finds the job that was currently assigned to it.
   - That "zombie" job is returned to the queue (status: `pending`) and assigned to a different worker.
   
2. **Job Timeouts:**
   - If a job takes longer than its configured `timeout` limit, the worker itself will abort the execution and report a failure.
   - Additionally, as a failsafe against the worker completely hanging, the backend Scheduler sweeps for `processing` jobs that have exceeded their timeout limits and forces them to fail.

3. **Exponential Backoff Retries:**
   - When a job fails (due to execution errors or a worker crash), the system automatically retries it up to a maximum limit (default: 3).
   - To prevent overwhelming the system, retries are subject to an exponential backoff algorithm (e.g., retrying after 5s, then 10s, then 20s).
