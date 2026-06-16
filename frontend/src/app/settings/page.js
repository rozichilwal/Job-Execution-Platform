"use client";

import { useAuth } from "@/context/AuthContext";
import { useState } from "react";

export default function SettingsPage() {
  const { user } = useAuth();
  
  // Dummy State for UI
  const [systemName, setSystemName] = useState("Job Execution Platform");
  const [timeZone, setTimeZone] = useState("UTC");
  const [defaultTimeout, setDefaultTimeout] = useState(300);
  const [maxConcurrentJobs, setMaxConcurrentJobs] = useState(100);
  
  const [enableScheduling, setEnableScheduling] = useState(true);
  const [autoRetry, setAutoRetry] = useState(true);
  const [cleanOld, setCleanOld] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  if (!user) return <div className="p-8 text-white">Loading...</div>;

  return (
    <div className="p-8 max-w-7xl mx-auto">
      
      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-gray-800 mb-8 pb-4">
        <button className="text-indigo-400 font-medium border-b-2 border-indigo-500 pb-4 -mb-[17px]">General</button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Column: General Settings */}
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl h-fit">
          <h3 className="text-white font-semibold mb-6">General Settings</h3>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">System Name</label>
              <input
                type="text"
                value={systemName}
                onChange={(e) => setSystemName(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Time Zone</label>
              <select 
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="UTC">UTC</option>
                <option value="EST">EST</option>
                <option value="PST">PST</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Default Timeout (seconds)</label>
              <input
                type="number"
                value={defaultTimeout}
                onChange={(e) => setDefaultTimeout(Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-2">Default timeout for job execution</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Max Concurrent Jobs</label>
              <input
                type="number"
                value={maxConcurrentJobs}
                onChange={(e) => setMaxConcurrentJobs(Number(e.target.value))}
                className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-2">Maximum number of concurrent jobs</p>
            </div>
          </div>
        </div>

        {/* Right Column: System Preferences */}
        <div className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl h-fit">
          <h3 className="text-white font-semibold mb-6">System Preferences</h3>
          
          <div className="space-y-6">
            
            <div className="flex items-center justify-between pb-6 border-b border-gray-800">
              <div>
                <p className="text-sm font-medium text-white mb-1">Enable Job Scheduling</p>
                <p className="text-xs text-gray-500">Allow scheduling jobs for later execution</p>
              </div>
              <button
                type="button"
                onClick={() => setEnableScheduling(!enableScheduling)}
                className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${enableScheduling ? 'bg-emerald-500' : 'bg-gray-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${enableScheduling ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between pb-6 border-b border-gray-800">
              <div>
                <p className="text-sm font-medium text-white mb-1">Auto-Retry Failed Jobs</p>
                <p className="text-xs text-gray-500">Automatically retry failed jobs</p>
              </div>
              <button
                type="button"
                onClick={() => setAutoRetry(!autoRetry)}
                className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${autoRetry ? 'bg-emerald-500' : 'bg-gray-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${autoRetry ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between pb-6 border-b border-gray-800">
              <div>
                <p className="text-sm font-medium text-white mb-1">Clean Old Executions</p>
                <p className="text-xs text-gray-500">Automatically clean old execution history</p>
              </div>
              <button
                type="button"
                onClick={() => setCleanOld(!cleanOld)}
                className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${cleanOld ? 'bg-emerald-500' : 'bg-gray-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${cleanOld ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white mb-1">Maintenance Mode</p>
                <p className="text-xs text-gray-500">Put system in maintenance mode</p>
              </div>
              <button
                type="button"
                onClick={() => setMaintenanceMode(!maintenanceMode)}
                className={`w-12 h-6 rounded-full transition-colors relative flex-shrink-0 ${maintenanceMode ? 'bg-emerald-500' : 'bg-gray-700'}`}
              >
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${maintenanceMode ? 'left-7' : 'left-1'}`}></div>
              </button>
            </div>

          </div>
        </div>

      </div>

      <div className="flex justify-end mt-8">
        <button className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-3 rounded-xl transition-colors shadow-lg shadow-indigo-500/20">
          Save Changes
        </button>
      </div>

    </div>
  );
}
