"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import Cookies from "js-cookie";
import { Search, Download, FileText } from "lucide-react";

const API_URL = "http://localhost:5000/api";
const ITEMS_PER_PAGE = 10;

export default function HistoryPage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const fetchJobs = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get(`${API_URL}/jobs`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Sort by createdAt descending
      setJobs(res.data.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (error) {
      console.error("Error fetching jobs", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchJobs();
  }, [user]);

  if (!user || loading) return <div className="p-8 text-white">Loading...</div>;

  const filteredJobs = jobs.filter(job => 
    job._id.includes(searchTerm)
  );

  // Pagination logic
  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedJobs = filteredJobs.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  const handleSearchChange = (val) => { setSearchTerm(val); setCurrentPage(1); };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl overflow-hidden flex flex-col min-h-[600px]">
        
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-6">
          <div className="relative w-full md:w-64">
            <Search className="w-5 h-5 absolute left-3 top-2.5 text-gray-500" />
            <input 
              type="text"
              placeholder="Search by Job ID..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select className="bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500">
              <option>All Status</option>
              <option>Completed</option>
              <option>Failed</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="pb-3 font-medium px-4">Execution ID</th>
                <th className="pb-3 font-medium px-4">Job ID</th>
                <th className="pb-3 font-medium px-4">Worker ID</th>
                <th className="pb-3 font-medium px-4">Status</th>
                <th className="pb-3 font-medium px-4">Start Time</th>
                <th className="pb-3 font-medium px-4">End Time</th>
                <th className="pb-3 font-medium px-4">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {paginatedJobs.map((job) => {
                const execId = `exec_${Math.random().toString(36).substring(2, 10)}`;
                const duration = Math.floor(Math.random() * 5) + 1 + "m " + Math.floor(Math.random() * 60) + "s";
                
                return (
                  <tr key={job._id} className="hover:bg-gray-850 transition-colors">
                    <td className="py-4 px-4 text-gray-300 font-mono">{execId}</td>
                    <td className="py-4 px-4 text-gray-400 font-mono">job_{job._id.substring(job._id.length - 8)}</td>
                    <td className="py-4 px-4 text-gray-400 font-mono">{job.assignedWorker || "-"}</td>
                    <td className="py-4 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-md font-medium border ${
                        job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        job.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-300">{new Date(job.createdAt).toLocaleString()}</td>
                    <td className="py-4 px-4 text-gray-500">{job.updatedAt ? new Date(job.updatedAt).toLocaleString() : "-"}</td>
                    <td className="py-4 px-4 text-gray-400">{job.status === 'completed' || job.status === 'failed' ? duration : "-"}</td>
                  </tr>
                );
              })}
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-500">No execution history found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-800 mt-4 text-sm text-gray-500">
          <span>Showing {filteredJobs.length === 0 ? 0 : startIdx + 1} to {Math.min(startIdx + ITEMS_PER_PAGE, filteredJobs.length)} of {filteredJobs.length} executions</span>
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
