"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import Cookies from "js-cookie";
import { Search, Filter, Eye, Trash2, FileText, X, Clock, AlertTriangle, Wifi, WrenchIcon } from "lucide-react";

const API_URL = "http://localhost:5000/api";
const ITEMS_PER_PAGE = 10;

export default function JobsPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [priorityFilter, setPriorityFilter] = useState("All Priority");
  const [selectedJob, setSelectedJob] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchJobs = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get(`${API_URL}/jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setJobs(res.data);
    } catch (error) {
      console.error("Error fetching jobs", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this job?")) return;
    try {
      const token = Cookies.get("token");
      await axios.delete(`${API_URL}/jobs/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchJobs();
    } catch (error) {
      console.error("Error deleting job", error);
      alert("Failed to delete job");
    }
  };

  useEffect(() => {
    if (user) {
      fetchJobs();
      const interval = setInterval(fetchJobs, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user || loading) return <div className="p-8 text-white">Loading...</div>;

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || job._id.includes(searchTerm);
    const matchesStatus = statusFilter === "All Status" || job.status.toLowerCase() === statusFilter.toLowerCase();
    const matchesPriority = priorityFilter === "All Priority" || job.priority === priorityFilter;
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedJobs = filteredJobs.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  const handleSearchChange = (val) => { setSearchTerm(val); setCurrentPage(1); };
  const handleStatusChange = (val) => { setStatusFilter(val); setCurrentPage(1); };
  const handlePriorityChange = (val) => { setPriorityFilter(val); setCurrentPage(1); };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl overflow-hidden flex flex-col min-h-[600px]">
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
          <div className="relative w-full md:w-96">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-500" />
            <input 
              type="text"
              placeholder="Search jobs..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="pb-3 font-medium px-4">Job ID</th>
                <th className="pb-3 font-medium px-4">Name</th>
                <th className="pb-3 font-medium px-4">Status</th>
                <th className="pb-3 font-medium px-4">Priority</th>
                <th className="pb-3 font-medium px-4 w-48">Progress</th>
                <th className="pb-3 font-medium px-4 text-center">Retries</th>
                <th className="pb-3 font-medium px-4">Created At</th>
                <th className="pb-3 font-medium px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {paginatedJobs.map((job) => {
                const progressVal = job.status === 'completed' ? 100 : (job.status === 'processing' ? 65 : 0);
                return (
                  <tr key={job._id} className="hover:bg-gray-850 transition-colors">
                    <td className="py-4 px-4 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-300 font-mono">job_{job._id.substring(job._id.length - 8)}</span>
                    </td>
                    <td className="py-4 px-4 text-gray-300 font-medium">{job.title}</td>
                    <td className="py-4 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                        job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        job.status === 'processing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        job.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                        job.priority === 'High' ? 'bg-red-500/10 text-red-400' :
                        job.priority === 'Medium' ? 'bg-amber-500/10 text-amber-400' :
                        'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {job.priority}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 text-xs w-8">{progressVal}%</span>
                        <div className="w-full bg-gray-800 rounded-full h-1.5">
                          <div 
                            className={`h-1.5 rounded-full ${
                              job.status === 'completed' ? 'bg-emerald-500' : 
                              job.status === 'failed' ? 'bg-red-500' : 
                              'bg-amber-500'
                            }`}
                            style={{ width: `${progressVal}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center text-gray-400">
                      {job.retries}/{job.maxRetries}
                    </td>
                    <td className="py-4 px-4 text-gray-500">
                      {(() => {
                        const mins = Math.floor((Date.now() - new Date(job.createdAt)) / 60000);
                        return mins > 60 
                          ? new Date(job.createdAt).toLocaleString() 
                          : `${mins} mins ago`;
                      })()}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedJob(job); setIsViewModalOpen(true); }}
                          className="p-1.5 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(job._id)}
                          className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500">No jobs match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-800 mt-4 text-sm text-gray-500">
          <span>Showing {filteredJobs.length === 0 ? 0 : startIdx + 1} to {Math.min(startIdx + ITEMS_PER_PAGE, filteredJobs.length)} of {filteredJobs.length} jobs</span>
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

      {/* View Job Modal */}
      {isViewModalOpen && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                Job Details
              </h3>
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                  <div className="text-sm text-gray-500 mb-1">Job ID</div>
                  <div className="text-gray-200 font-mono text-sm">{selectedJob._id}</div>
                </div>
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                  <div className="text-sm text-gray-500 mb-1">Status</div>
                  <div className="text-gray-200">
                    <span className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                      selectedJob.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      selectedJob.status === 'processing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                      selectedJob.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-blue-500/10 text-blue-400 border-blue-500/20'
                    }`}>
                      {selectedJob.status.charAt(0).toUpperCase() + selectedJob.status.slice(1)}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                  <div className="text-sm text-gray-500 mb-1">Priority</div>
                  <div className="text-gray-200">{selectedJob.priority}</div>
                </div>
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                  <div className="text-sm text-gray-500 mb-1">Created At</div>
                  <div className="text-gray-200">{new Date(selectedJob.createdAt).toLocaleString()}</div>
                </div>
                {selectedJob.startedAt && (
                  <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                    <div className="text-sm text-gray-500 mb-1">Started At</div>
                    <div className="text-gray-200">{new Date(selectedJob.startedAt).toLocaleString()}</div>
                  </div>
                )}
                {selectedJob.completedAt && (
                  <div className="bg-gray-950 p-4 rounded-xl border border-gray-800">
                    <div className="text-sm text-gray-500 mb-1">Completed At</div>
                    <div className="text-gray-200">{new Date(selectedJob.completedAt).toLocaleString()}</div>
                  </div>
                )}
              </div>

              {/* Failure Reason Badge */}
              {selectedJob.failureReason && (
                <div className="flex items-center gap-2 bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                  {selectedJob.failureReason === 'timeout' && <Clock className="w-4 h-4 text-amber-400" />}
                  {selectedJob.failureReason === 'worker_crash' && <Wifi className="w-4 h-4 text-orange-400" />}
                  {selectedJob.failureReason === 'execution_error' && <AlertTriangle className="w-4 h-4 text-red-400" />}
                  {selectedJob.failureReason === 'manual' && <WrenchIcon className="w-4 h-4 text-gray-400" />}
                  <span className="text-sm text-gray-300">
                    Failure Reason: <span className="font-medium text-white capitalize">{selectedJob.failureReason.replace('_', ' ')}</span>
                  </span>
                  <span className="text-xs text-gray-500 ml-auto">{selectedJob.retries}/{selectedJob.maxRetries} retries used</span>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Job Name</h4>
                <div className="text-white bg-gray-950 p-4 rounded-xl border border-gray-800">
                  {selectedJob.title}
                </div>
              </div>

              {selectedJob.description && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Description</h4>
                  <div className="text-gray-300 bg-gray-950 p-4 rounded-xl border border-gray-800">
                    {selectedJob.description}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Payload (JSON)</h4>
                <div className="bg-gray-950 p-4 rounded-xl border border-gray-800 overflow-x-auto">
                  <pre className="text-gray-300 text-sm font-mono whitespace-pre-wrap">
                    {typeof selectedJob.payload === 'object' 
                      ? JSON.stringify(selectedJob.payload, null, 2) 
                      : selectedJob.payload}
                  </pre>
                </div>
              </div>

              {selectedJob.error && (
                <div>
                  <h4 className="text-sm font-medium text-red-400 mb-2">Error Message</h4>
                  <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 text-red-400 text-sm font-mono whitespace-pre-wrap">
                    {selectedJob.error}
                  </div>
                </div>
              )}

              {/* Retry History */}
              {selectedJob.retryHistory && selectedJob.retryHistory.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Retry History ({selectedJob.retryHistory.length} attempts)
                  </h4>
                  <div className="space-y-2">
                    {selectedJob.retryHistory.map((attempt, idx) => (
                      <div key={idx} className="bg-gray-950 border border-gray-800 rounded-lg p-3 flex items-start gap-3">
                        <span className="text-gray-500 font-mono text-xs mt-0.5">#{attempt.attempt}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-xs font-medium capitalize ${
                              attempt.failureReason === 'timeout' ? 'text-amber-400' :
                              attempt.failureReason === 'worker_crash' ? 'text-orange-400' :
                              'text-red-400'
                            }`}>
                              {(attempt.failureReason || 'error').replace('_', ' ')}
                            </span>
                            {attempt.workerId && (
                              <span className="text-gray-600 font-mono text-xs">{attempt.workerId}</span>
                            )}
                          </div>
                          <p className="text-red-400/70 text-xs truncate" title={attempt.error}>{attempt.error || '—'}</p>
                        </div>
                        <span className="text-gray-600 text-xs whitespace-nowrap">
                          {attempt.failedAt ? new Date(attempt.failedAt).toLocaleString() : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end">
              <button 
                onClick={() => setIsViewModalOpen(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
