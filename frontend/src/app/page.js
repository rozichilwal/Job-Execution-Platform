"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import StatCard from "@/components/StatCard";
import { 
  Folder, 
  PlayCircle, 
  Clock, 
  XOctagon, 
  Users, 
  Database,
  FileText
} from "lucide-react";
import {
  PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend
} from "recharts";

const API_URL = "http://localhost:5000/api";

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [jobs, setJobs] = useState([]);
  const [workers, setWorkers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('Last 24 hours');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchData = async () => {
    try {
      const [jobsRes, workersRes] = await Promise.all([
        axios.get(`${API_URL}/jobs`),
        axios.get(`${API_URL}/workers`),
      ]);
      setJobs(jobsRes.data);
      setWorkers(workersRes.data);
    } catch (error) {
      console.error("Error fetching data", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
      const interval = setInterval(fetchData, 5000);
      return () => clearInterval(interval);
    }
  }, [user]);

  if (authLoading || !user) return <div className="min-h-screen bg-gray-950 flex items-center justify-center text-white">Loading...</div>;

  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => j.status === "completed").length;
  const runningJobs = jobs.filter(j => j.status === "processing").length;
  const failedJobs = jobs.filter(j => j.status === "failed").length;
  const pendingJobs = jobs.filter(j => j.status === "pending").length;
  const activeWorkers = workers.filter(w => w.status !== "offline").length;

  const pieData = [
    { name: 'Completed', value: completedJobs, color: '#10b981' },
    { name: 'Running', value: runningJobs, color: '#f59e0b' },
    { name: 'Failed', value: failedJobs, color: '#ef4444' },
    { name: 'Pending', value: pendingJobs, color: '#3b82f6' },
  ];

  const generateChartData = () => {
    if (jobs.length === 0) return [];
    
    const now = new Date();
    const is24Hours = timeRange === 'Last 24 hours';
    const hoursToSub = is24Hours ? 24 : 168; // 24 hours or 7 days
    const startTime = new Date(now.getTime() - hoursToSub * 60 * 60 * 1000);

    const filteredJobs = jobs.filter(j => new Date(j.createdAt) >= startTime);

    const numBuckets = 7;
    const bucketDuration = (now.getTime() - startTime.getTime()) / numBuckets;

    const buckets = Array.from({ length: numBuckets }).map((_, i) => {
      const bucketStart = new Date(startTime.getTime() + i * bucketDuration);
      const bucketEnd = new Date(bucketStart.getTime() + bucketDuration);
      
      let timeLabel = '';
      if (is24Hours) {
        timeLabel = bucketEnd.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else {
        timeLabel = bucketEnd.toLocaleDateString([], { month: 'short', day: 'numeric' });
      }

      return {
        time: timeLabel,
        completed: 0,
        failed: 0,
        running: 0,
        startTs: bucketStart.getTime(),
        endTs: bucketEnd.getTime()
      };
    });

    filteredJobs.forEach(job => {
      const jobTime = new Date(job.createdAt).getTime();
      const bucket = buckets.find(b => jobTime >= b.startTs && jobTime <= b.endTs) || buckets[buckets.length - 1];
      
      if (job.status === 'completed') bucket.completed++;
      else if (job.status === 'failed') bucket.failed++;
      else if (job.status === 'processing') bucket.running++;
    });

    return buckets;
  };

  const areaData = generateChartData();

  const submitDummyJob = async () => {
    try {
      const titles = ["Image Processing", "Data Aggregation", "Report Generation", "Backup Database", "Email Notification"];
      await axios.post(`${API_URL}/jobs`, {
        title: titles[Math.floor(Math.random() * titles.length)],
        payload: { delay: Math.floor(Math.random() * 8000) + 2000 },
      });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8">
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <StatCard title="Total Jobs" value={totalJobs} trend="up" trendValue="12.5%" icon={Folder} colorClass="bg-blue-600" />
        <StatCard title="Completed Jobs" value={completedJobs} trend="up" trendValue="15.3%" icon={PlayCircle} colorClass="bg-emerald-500" />
        <StatCard title="Running Jobs" value={runningJobs} trend="down" trendValue="5.2%" icon={Clock} colorClass="bg-amber-500" />
        <StatCard title="Failed Jobs" value={failedJobs} trend="down" trendValue="8.1%" icon={XOctagon} colorClass="bg-red-500" />
        <StatCard title="Active Workers" value={activeWorkers} trend="up" trendValue="16.7%" icon={Users} colorClass="bg-purple-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Job Status Overview (Donut Chart) */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
          <h3 className="text-white font-semibold mb-6">Job Status Overview</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', color: '#fff' }}
                  itemStyle={{ color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {pieData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                  <span className="text-sm text-gray-400">{item.name}</span>
                </div>
                <span className="text-sm text-white font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Jobs Over Time (Area Chart) */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-semibold">Jobs Over Time</h3>
            <select 
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="bg-gray-950 border border-gray-700 text-sm text-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
            >
              <option>Last 24 hours</option>
              <option>Last 7 days</option>
            </select>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRunning" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                <XAxis dataKey="time" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                <RechartsTooltip contentStyle={{ backgroundColor: '#111827', borderColor: '#374151' }} />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#9ca3af' }}/>
                <Area type="monotone" dataKey="completed" stroke="#10b981" fillOpacity={1} fill="url(#colorCompleted)" name="Completed" />
                <Area type="monotone" dataKey="running" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRunning)" name="Running" />
                <Area type="monotone" dataKey="failed" stroke="#ef4444" fillOpacity={0} name="Failed" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Jobs Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-semibold">Recent Jobs</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="pb-3 font-medium">Job ID</th>
                  <th className="pb-3 font-medium">Name</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {jobs.slice(0, 7).map((job) => (
                  <tr key={job._id} className="hover:bg-gray-850 transition-colors">
                    <td className="py-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span className="text-gray-300 font-mono">job_{job._id.substring(job._id.length - 8)}</span>
                    </td>
                    <td className="py-3 text-gray-300">{job.title}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 rounded-md font-medium border ${
                        job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        job.status === 'processing' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                        job.status === 'failed' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                        'bg-blue-500/10 text-blue-400 border-blue-500/20'
                      }`}>
                        {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500">{new Date(job.createdAt).toLocaleTimeString()}</td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-gray-500">No jobs found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Active Workers Table */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-semibold">Active Workers</h3>
            <button className="text-gray-400 hover:text-white text-xs font-medium px-3 py-1.5 border border-gray-700 rounded-lg transition-colors">
              View All
            </button>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="text-gray-500 border-b border-gray-800">
                  <th className="pb-3 font-medium">Worker ID</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Current Job</th>
                  <th className="pb-3 font-medium text-right">Last Heartbeat</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {workers.slice(0, 7).map((worker) => (
                  <tr key={worker.workerId} className="hover:bg-gray-850 transition-colors">
                    <td className="py-3 text-gray-300 font-mono">{worker.workerId}</td>
                    <td className="py-3">
                      <span className={`text-xs px-2 py-1 rounded-md font-medium border ${
                        worker.status === 'idle' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                        worker.status === 'busy' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                        'bg-gray-500/10 text-gray-400 border-gray-500/20'
                      }`}>
                        {worker.status.charAt(0).toUpperCase() + worker.status.slice(1)}
                      </span>
                    </td>
                    <td className="py-3 text-gray-500 font-mono">
                      {worker.status === 'busy' ? "job_..." : "-"}
                    </td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className={`w-1.5 h-1.5 rounded-full ${worker.status !== 'offline' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="text-gray-400">{Math.floor((Date.now() - new Date(worker.lastHeartbeat)) / 1000)}s ago</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {workers.length === 0 && (
                  <tr>
                    <td colSpan="4" className="py-8 text-center text-gray-500">No workers active</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
