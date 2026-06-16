"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import Cookies from "js-cookie";
import { Search, Filter, Edit2, Trash2, Eye, X, Server, Cpu, HardDrive, Clock, AlertTriangle, Activity } from "lucide-react";

const API_URL = "http://localhost:5000/api";

export default function WorkersPage() {
  const { user } = useAuth();
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [workerCount, setWorkerCount] = useState(1);
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editStatus, setEditStatus] = useState("idle");

  const fetchWorkers = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get(`${API_URL}/workers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWorkers(res.data);
    } catch (error) {
      console.error("Error fetching workers", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterWorker = async () => {
    try {
      const token = Cookies.get("token");
      await axios.post(`${API_URL}/workers/spawn`, { count: workerCount }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // The worker will register itself asynchronously, so we fetch after a brief delay
      setTimeout(fetchWorkers, 1000);
      setWorkerCount(1);
    } catch (error) {
      console.error("Error registering worker", error);
      alert("Failed to register worker");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this worker?")) return;
    try {
      const token = Cookies.get("token");
      await axios.delete(`${API_URL}/workers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchWorkers();
    } catch (error) {
      console.error("Error deleting worker", error);
      alert("Failed to delete worker");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = Cookies.get("token");
      await axios.put(`${API_URL}/workers/${selectedWorker.workerId}`, { status: editStatus }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsEditModalOpen(false);
      fetchWorkers();
    } catch (error) {
      console.error("Error updating worker", error);
      alert("Failed to update worker");
    }
  };

  useEffect(() => {
    if (user) {
      fetchWorkers();
      const interval = setInterval(fetchWorkers, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (!user || loading) return <div className="p-8 text-white">Loading...</div>;

  const filteredWorkers = workers.filter(worker => {
    const matchesSearch = worker.workerId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "All Status" || 
      (statusFilter === "Online" && worker.status !== 'offline') ||
      (statusFilter === "Offline" && worker.status === 'offline') ||
      (statusFilter === "Warning" && worker.missedHeartbeats > 0 && worker.status !== 'offline');
    return matchesSearch && matchesStatus;
  });

  const formatUptime = (seconds) => {
    if (!seconds) return "-";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const getStatusDisplay = (worker) => {
    if (worker.status === 'offline') {
      return { label: "Offline", className: "text-gray-500 bg-gray-500/10 border-gray-500/20" };
    }
    if (worker.missedHeartbeats > 0) {
      return { label: `Warning (${worker.missedHeartbeats})`, className: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
    }
    if (worker.status === 'busy') {
      return { label: "Busy", className: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
    }
    return { label: "Idle", className: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" };
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
              placeholder="Search workers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-gray-950 border border-gray-800 rounded-lg px-4 py-2 text-sm text-gray-300 focus:outline-none focus:border-indigo-500"
            >
              <option>All Status</option>
              <option>Online</option>
              <option>Offline</option>
              <option>Warning</option>
            </select>
            <div className="flex items-center bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
              <input 
                type="number"
                min="1"
                max="50"
                value={workerCount}
                onChange={(e) => setWorkerCount(e.target.value)}
                className="w-16 bg-transparent px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 border-r border-gray-800"
                title="Number of workers to spawn"
              />
              <button 
                onClick={handleRegisterWorker}
                className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm text-white font-medium transition-colors"
              >
                Spawn Workers
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="text-gray-500 border-b border-gray-800">
                <th className="pb-3 font-medium px-4">Worker ID</th>
                <th className="pb-3 font-medium px-4">Status</th>
                <th className="pb-3 font-medium px-4">Health</th>
                <th className="pb-3 font-medium px-4">Current Job</th>
                <th className="pb-3 font-medium px-4">Jobs Completed</th>
                <th className="pb-3 font-medium px-4">Last Heartbeat</th>
                <th className="pb-3 font-medium px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filteredWorkers.map((worker) => {
                const statusInfo = getStatusDisplay(worker);
                const heartbeatAge = Math.floor((Date.now() - new Date(worker.lastHeartbeat)) / 1000);

                return (
                  <tr key={worker.workerId} className="hover:bg-gray-850 transition-colors">
                    <td className="py-4 px-4 text-gray-300 font-medium font-mono">{worker.workerId}</td>
                    <td className="py-4 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-md font-medium border ${statusInfo.className}`}>
                        {worker.missedHeartbeats > 0 && worker.status !== 'offline' && (
                          <AlertTriangle className="w-3 h-3 inline mr-1 animate-pulse" />
                        )}
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      {worker.status !== 'offline' ? (
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className="flex items-center gap-1" title="CPU Usage">
                            <Cpu className="w-3 h-3" />
                            {worker.healthMetrics?.cpu || 0}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-600">—</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-gray-500 font-mono">
                      {worker.currentJob 
                        ? <span className="text-blue-400">job_{worker.currentJob.substring(worker.currentJob.length - 8)}</span>
                        : "—"
                      }
                    </td>
                    <td className="py-4 px-4">
                      <div className="text-emerald-400 font-medium">
                        {worker.jobsCompleted || 0}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          worker.status === 'offline' ? 'bg-red-500' :
                          worker.missedHeartbeats > 0 ? 'bg-amber-500 animate-pulse' :
                          'bg-emerald-500 animate-pulse'
                        }`}></div>
                        <span className="text-gray-400 text-sm">
                          {heartbeatAge > 300 
                            ? new Date(worker.lastHeartbeat).toLocaleString() 
                            : `${heartbeatAge}s ago`}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => { setSelectedWorker(worker); setIsViewModalOpen(true); }}
                          className="p-1.5 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => { setSelectedWorker(worker); setEditStatus(worker.status); setIsEditModalOpen(true); }}
                          className="p-1.5 text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(worker.workerId)}
                          className="p-1.5 text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredWorkers.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-gray-500">No workers match your filters.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Worker Modal */}
      {isViewModalOpen && selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-400" />
                Worker Details
              </h3>
              <button onClick={() => setIsViewModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm text-gray-500 mb-1">Worker ID</label>
                <div className="text-white font-mono bg-gray-950 p-3 rounded-lg border border-gray-800">{selectedWorker.workerId}</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Status</label>
                  <div className="bg-gray-950 p-3 rounded-lg border border-gray-800">
                    <span className={`text-xs px-2.5 py-1 rounded-md font-medium border ${getStatusDisplay(selectedWorker).className}`}>
                      {getStatusDisplay(selectedWorker).label}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Missed Heartbeats</label>
                  <div className={`text-white bg-gray-950 p-3 rounded-lg border border-gray-800 ${
                    selectedWorker.missedHeartbeats > 0 ? 'text-amber-400' : ''
                  }`}>
                    {selectedWorker.missedHeartbeats || 0}
                  </div>
                </div>
              </div>

              {/* Health Metrics */}
              <div>
                <label className="block text-sm text-gray-500 mb-2">Health Metrics</label>
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 text-center">
                    <Cpu className="w-4 h-4 mx-auto text-blue-400 mb-1" />
                    <div className="text-white text-lg font-semibold">{selectedWorker.healthMetrics?.cpu || 0}%</div>
                    <div className="text-xs text-gray-500">CPU</div>
                  </div>
                  <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 text-center">
                    <HardDrive className="w-4 h-4 mx-auto text-purple-400 mb-1" />
                    <div className="text-white text-lg font-semibold">{selectedWorker.healthMetrics?.memory || 0}%</div>
                    <div className="text-xs text-gray-500">Memory</div>
                  </div>
                  <div className="bg-gray-950 p-3 rounded-lg border border-gray-800 text-center">
                    <Clock className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
                    <div className="text-white text-lg font-semibold">{formatUptime(selectedWorker.healthMetrics?.uptime)}</div>
                    <div className="text-xs text-gray-500">Uptime</div>
                  </div>
                </div>
              </div>

              {/* Job Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Jobs Completed</label>
                  <div className="text-emerald-400 font-semibold bg-gray-950 p-3 rounded-lg border border-gray-800">
                    {selectedWorker.jobsCompleted || 0}
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Jobs Failed</label>
                  <div className="text-red-400 font-semibold bg-gray-950 p-3 rounded-lg border border-gray-800">
                    {selectedWorker.jobsFailed || 0}
                  </div>
                </div>
              </div>

              {selectedWorker.currentJob && (
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Current Job</label>
                  <div className="text-blue-400 font-mono bg-gray-950 p-3 rounded-lg border border-gray-800">{selectedWorker.currentJob}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Last Heartbeat</label>
                  <div className="text-white bg-gray-950 p-3 rounded-lg border border-gray-800 text-sm">{new Date(selectedWorker.lastHeartbeat).toLocaleString()}</div>
                </div>
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Created At</label>
                  <div className="text-white bg-gray-950 p-3 rounded-lg border border-gray-800 text-sm">{new Date(selectedWorker.createdAt).toLocaleString()}</div>
                </div>
              </div>

              {selectedWorker.deregisteredAt && (
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Deregistered At</label>
                  <div className="text-amber-400 bg-gray-950 p-3 rounded-lg border border-gray-800 text-sm">
                    {new Date(selectedWorker.deregisteredAt).toLocaleString()} (graceful shutdown)
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end">
              <button onClick={() => setIsViewModalOpen(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Worker Modal */}
      {isEditModalOpen && selectedWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-800">
              <h3 className="text-xl font-semibold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-indigo-400" />
                Edit Worker Status
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="flex flex-col">
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm text-gray-500 mb-1">Worker ID</label>
                  <div className="text-gray-400 font-mono bg-gray-950 p-3 rounded-lg border border-gray-800 cursor-not-allowed">{selectedWorker.workerId}</div>
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Status</label>
                  <select 
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="idle">Idle</option>
                    <option value="busy">Busy</option>
                    <option value="offline">Offline</option>
                  </select>
                </div>
              </div>
              <div className="p-4 border-t border-gray-800 bg-gray-900/50 flex justify-end gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors text-sm font-medium shadow-lg shadow-indigo-500/20">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
