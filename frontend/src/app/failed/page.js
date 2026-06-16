"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import Cookies from "js-cookie";
import { Search, RotateCw, ChevronDown, ChevronUp, Clock, AlertTriangle, Wifi, WrenchIcon } from "lucide-react";

const API_URL = "http://localhost:5000/api";
const ITEMS_PER_PAGE = 10;

const FAILURE_REASON_MAP = {
  execution_error: { label: "Execution Error", icon: AlertTriangle, color: "text-red-400" },
  timeout: { label: "Timeout", icon: Clock, color: "text-amber-400" },
  worker_crash: { label: "Worker Crash", icon: Wifi, color: "text-orange-400" },
  manual: { label: "Manual", icon: WrenchIcon, color: "text-gray-400" },
};

export default function FailedJobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [expandedJob, setExpandedJob] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchFailedJobs = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get(`${API_URL}/jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJobs(res.data.filter(job => job.status === 'failed'));
    } catch (error) {
      console.error("Error fetching failed jobs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchFailedJobs();
      const interval = setInterval(fetchFailedJobs, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleRetryJob = async (id) => {
    try {
      setActionLoading(true);
      const token = Cookies.get("token");
      await axios.post(`${API_URL}/jobs/${id}/retry`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFailedJobs();
    } catch (error) {
      console.error("Error retrying job", error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryAll = async () => {
    try {
      setActionLoading(true);
      const token = Cookies.get("token");
      await axios.post(`${API_URL}/jobs/retry-all`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchFailedJobs();
    } catch (error) {
      console.error("Error retrying all jobs", error);
    } finally {
      setActionLoading(false);
    }
  };

  if (!user || loading) return <div className="p-8 text-white">Loading...</div>;

  const filteredJobs = jobs.filter(job => 
    job._id.includes(searchTerm) || job.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedJobs = filteredJobs.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const handleSearchChange = (val) => { setSearchTerm(val); setCurrentPage(1); };

  const getFailureInfo = (reason) => {
    return FAILURE_REASON_MAP[reason] || { label: reason || "Unknown", icon: AlertTriangle, color: "text-gray-400" };
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl overflow-hidden flex flex-col min-h-[600px]">
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
          <div className="relative w-full md:w-96">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-500" />
            <input 
              type="text"
              placeholder="Search failed jobs..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select className="bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
              <option>All Priority</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <select className="bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
              <option>All Reasons</option>
              <option>Execution Error</option>
              <option>Timeout</option>
              <option>Worker Crash</option>
            </select>
            <button 
              onClick={handleRetryAll}
              disabled={actionLoading || jobs.length === 0}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 rounded-lg text-sm text-white font-medium transition-colors shadow-lg shadow-indigo-500/20"
            >
              <RotateCw className="w-4 h-4" /> Retry All
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="pb-3 font-medium px-4 w-8"></th>
                <th className="pb-3 font-medium px-4">Job ID</th>
                <th className="pb-3 font-medium px-4">Name</th>
                <th className="pb-3 font-medium px-4">Failure Reason</th>
                <th className="pb-3 font-medium px-4">Error</th>
                <th className="pb-3 font-medium px-4">Failed At</th>
                <th className="pb-3 font-medium px-4 text-center">Retries</th>
                <th className="pb-3 font-medium px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {paginatedJobs.map((job) => {
                const failureInfo = getFailureInfo(job.failureReason);
                const FailureIcon = failureInfo.icon;
                const isExpanded = expandedJob === job._id;

                return (
                  <React.Fragment key={job._id}>
                    <tr className="hover:bg-gray-850 transition-colors">
                      <td className="py-4 px-4">
                        {job.retryHistory && job.retryHistory.length > 0 && (
                          <button
                            onClick={() => setExpandedJob(isExpanded ? null : job._id)}
                            className="text-gray-500 hover:text-white transition-colors"
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                      <td className="py-4 px-4 text-gray-400 font-mono">job_{job._id.substring(job._id.length - 8)}</td>
                      <td className="py-4 px-4 text-gray-300 font-medium">{job.title}</td>
                      <td className="py-4 px-4">
                        <span className={`flex items-center gap-1.5 ${failureInfo.color} font-medium text-xs`}>
                          <FailureIcon className="w-3.5 h-3.5" />
                          {failureInfo.label}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="text-red-400 font-medium text-xs max-w-[200px] truncate block" title={job.error}>
                          {job.error || "—"}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-gray-300">
                        {job.completedAt ? new Date(job.completedAt).toLocaleString() :
                         job.updatedAt ? new Date(job.updatedAt).toLocaleString() : "—"}
                      </td>
                      <td className="py-4 px-4 text-center text-gray-400">
                        {job.retries}/{job.maxRetries}
                      </td>
                      <td className="py-4 px-4 text-right">
                        <button 
                          onClick={() => handleRetryJob(job._id)}
                          disabled={actionLoading}
                          className="flex items-center gap-1.5 ml-auto text-indigo-400 hover:text-indigo-300 font-medium disabled:opacity-50 transition-colors"
                        >
                          <RotateCw className="w-4 h-4" /> Retry
                        </button>
                      </td>
                    </tr>

                    {/* Expanded Retry History */}
                    {isExpanded && job.retryHistory && job.retryHistory.length > 0 && (
                      <tr key={`${job._id}-history`}>
                        <td colSpan="8" className="px-4 pb-4">
                          <div className="bg-gray-950 border border-gray-800 rounded-xl p-4 ml-8">
                            <h4 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                              <Clock className="w-4 h-4" />
                              Retry History ({job.retryHistory.length} attempts)
                            </h4>
                            <div className="space-y-2">
                              {job.retryHistory.map((attempt, idx) => {
                                const attemptInfo = getFailureInfo(attempt.failureReason);
                                const AttemptIcon = attemptInfo.icon;
                                return (
                                  <div key={idx} className="flex items-start gap-3 text-sm border-l-2 border-gray-700 pl-3 py-1">
                                    <div className="flex items-center gap-2 min-w-[140px]">
                                      <span className="text-gray-500 font-mono">#{attempt.attempt}</span>
                                      <span className={`flex items-center gap-1 text-xs ${attemptInfo.color}`}>
                                        <AttemptIcon className="w-3 h-3" />
                                        {attemptInfo.label}
                                      </span>
                                    </div>
                                    <span className="text-red-400/80 text-xs flex-1 truncate" title={attempt.error}>
                                      {attempt.error || "—"}
                                    </span>
                                    {attempt.workerId && (
                                      <span className="text-gray-600 font-mono text-xs">{attempt.workerId}</span>
                                    )}
                                    <span className="text-gray-600 text-xs whitespace-nowrap">
                                      {attempt.failedAt ? new Date(attempt.failedAt).toLocaleString() : "—"}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500">No failed jobs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-800 mt-4 text-sm text-gray-500">
          <span>Showing {filteredJobs.length === 0 ? 0 : startIdx + 1} to {Math.min(startIdx + ITEMS_PER_PAGE, filteredJobs.length)} of {filteredJobs.length} failed jobs</span>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage <= 1}
              className="px-3 py-1 bg-gray-800 rounded hover:bg-gray-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >&lt;</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                acc.push(p);
                return acc;
              }, [])
              .map((item, idx) => 
                item === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-600">...</span>
                ) : (
                  <button 
                    key={item}
                    onClick={() => setCurrentPage(item)}
                    className={`px-3 py-1 rounded font-medium transition-colors ${
                      item === safePage 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-gray-800 hover:bg-gray-700 text-white'
                    }`}
                  >{item}</button>
                )
              )}
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage >= totalPages}
              className="px-3 py-1 bg-gray-800 rounded hover:bg-gray-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >&gt;</button>
          </div>
        </div>

      </div>
    </div>
  );
}
