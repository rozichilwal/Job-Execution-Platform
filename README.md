# Job Execution Platform

A highly scalable, distributed Job Execution Platform built with the MERN stack (MongoDB, Express, React/Next.js, Node.js). The platform allows users to submit background jobs, monitor execution, manage worker nodes, and track detailed execution history and system health.

## Table of Contents
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Running the Application](#running-the-application)
- [Architecture & AI Usage](#architecture--ai-usage)
- [Assumptions](#assumptions)

## Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v16.x or higher)
- [npm](https://www.npmjs.com/) (v8.x or higher)
- A [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster (or local MongoDB instance)

### Setup Steps
1. Clone the repository to your local machine.
2. Install dependencies for the backend:
   ```bash
   cd backend
   npm install
   ```
3. Install dependencies for the frontend:
   ```bash
   cd frontend
   npm install
   ```
4. Install dependencies for the worker (if separated):
   ```bash
   cd worker
   npm install
   ```

## Environment Configuration

You need to set up environment variables for both the backend and frontend.

### Backend (`backend/.env`)
Create a `.env` file in the `backend` directory:
```env
PORT=5000
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
JWT_SECRET=your_super_secret_jwt_key
API_URL=http://localhost:5000/api
```

### Frontend (`frontend/.env.local`)
Create a `.env.local` file in the `frontend` directory:
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

## Running the Application

The platform consists of three distinct processes that need to be running simultaneously.

### 1. Start the Backend API & Scheduler
Open a terminal and run:
```bash
cd backend
npm run dev
```
*This starts the Express server on port 5000 and initializes the background job scheduler.*

### 2. Start the Frontend Application
Open a second terminal and run:
```bash
cd frontend
npm run dev
```
*This starts the Next.js frontend on port 3000. You can view the dashboard at `http://localhost:3000`.*

### 3. Start the Worker Node(s)
Jobs will remain in a "Pending" state until a worker is available to execute them. You can spawn workers in two ways:
- **Via the UI:** Navigate to the "Workers" page on the frontend and click **"Spawn Worker"**. This will instruct the backend to fork child processes.
- **Manually (Recommended for testing):** Open a third terminal and run:
  ```bash
  cd worker
  node index.js
  ```
*You can run this command in multiple terminals to simulate a cluster of worker nodes.*

## Architecture & AI Usage
- For a detailed breakdown of the system architecture, load balancing, and failure handling strategies, please refer to [Architecture.md](./Architecture.md).
- For details regarding the AI tools, workflows, and prompts used to build this platform, please refer to [Agent.md](./Agent.md).

## Assumptions Made

During the development of this platform, the following assumptions were made:

1. **Worker Environment:** It is assumed that worker processes are running in environments that have network access to the backend API (`API_URL`). Workers do not need a public IP address, as they use a pull-based polling mechanism.
2. **Payload Execution:** The `worker/tasks/executor.js` file currently simulates job execution using `setTimeout`. In a production scenario, this module would be replaced with actual business logic (e.g., video processing, sending emails, or running ML models).
3. **Database Consistency:** MongoDB is used as the single source of truth. It is assumed that the MongoDB cluster provides sufficient read/write performance to handle the aggressive 5-second polling from the scheduler and the 10-second heartbeats from the workers.
4. **Authentication:** The system assumes a single-tenant environment where any registered user can submit jobs and manage worker nodes. Role-Based Access Control (RBAC) is not strictly enforced at the worker management level.
