"use client";

import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Cookies from "js-cookie";

const API_URL = "http://localhost:5000/api";


export default function SubmitJob() {
  const router = useRouter();
  const { user } = useAuth();
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [priority, setPriority] = useState("Medium");
  const [maxRetries, setMaxRetries] = useState(3);
  const [timeout, setTimeoutVal] = useState(300);
  const [notifyOnCompletion, setNotifyOnCompletion] = useState(false);
  const [jobCount, setJobCount] = useState(1);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);



  const handleReset = () => {
    setTitle("");
    setDescription("");

    setPriority("Medium");
    setMaxRetries(3);
    setTimeoutVal(300);
    setNotifyOnCompletion(false);
    setJobCount(1);
    setError("");
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);

    try {
      const token = Cookies.get("token");
      await axios.post(`${API_URL}/jobs`, {
        title,
        description,
        payload: {},
        priority,
        maxRetries: Number(maxRetries),
        timeout: Number(timeout),
        notifyOnCompletion,
        count: Number(jobCount)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(true);
      setTimeout(() => router.push("/"), 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to submit job");
    }
  };

  if (!user) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {error && <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg text-red-400 text-sm font-medium">{error}</div>}
      {success && <div className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/50 rounded-lg text-emerald-400 text-sm font-medium">Job submitted successfully! Redirecting...</div>}

      <form onSubmit={handleSubmit} className="flex flex-col lg:flex-row gap-6">
        
        {/* Left Column: Job Details */}
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl h-fit">
          <h3 className="text-white font-semibold mb-6">Job Details</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Job Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Enter job name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                placeholder="Enter job description (optional)"
              />
            </div>


          </div>
        </div>

        {/* Right Column: Execution Settings */}
        <div className="w-full lg:w-[400px] flex flex-col gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl flex-1">
            <h3 className="text-white font-semibold mb-6">Execution Settings</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Priority <span className="text-red-500">*</span></label>
                <select 
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">High priority jobs are processed first</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Max Retries</label>
                <select 
                  value={maxRetries}
                  onChange={(e) => setMaxRetries(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value={1}>1</option>
                  <option value={3}>3</option>
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                </select>
                <p className="text-xs text-gray-500 mt-2">Maximum number of retry attempts</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Timeout (seconds) <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  required
                  value={timeout}
                  onChange={(e) => setTimeoutVal(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-2">Job execution timeout</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Quantity (Bulk Create)</label>
                <input
                  type="number"
                  min="1"
                  max="500"
                  required
                  value={jobCount}
                  onChange={(e) => setJobCount(e.target.value)}
                  className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                />
                <p className="text-xs text-gray-500 mt-2">Number of jobs to submit at once</p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-800">
                <div>
                  <p className="text-sm font-medium text-white">Notify on Completion</p>
                  <p className="text-xs text-gray-500">Send email when job completes</p>
                </div>
                <button
                  type="button"
                  onClick={() => setNotifyOnCompletion(!notifyOnCompletion)}
                  className={`w-12 h-6 rounded-full transition-colors relative ${notifyOnCompletion ? 'bg-indigo-600' : 'bg-gray-700'}`}
                >
                  <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${notifyOnCompletion ? 'left-7' : 'left-1'}`}></div>
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 mt-auto pt-4">
            <button 
              type="button" 
              onClick={handleReset}
              className="px-6 py-3 rounded-xl border border-gray-700 text-gray-300 font-medium hover:bg-gray-800 transition-colors"
            >
              Reset
            </button>
            <button 
              type="submit" 
              className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20"
            >
              Submit Job
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
