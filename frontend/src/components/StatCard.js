"use client";

export default function StatCard({ title, value, trend, trendValue, icon: Icon, colorClass }) {
  const isPositive = trend === "up";

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between h-full hover:bg-gray-850 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-2xl ${colorClass}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        <h3 className="text-gray-400 text-sm font-medium">{title}</h3>
      </div>
      <div>
        <p className="text-3xl font-bold text-white mb-2">{value}</p>
        <div className="flex items-center gap-1.5 text-sm">
          <span className={`flex items-center gap-0.5 font-medium ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {isPositive ? "↑" : "↓"} {trendValue}
          </span>
          <span className="text-gray-500">from yesterday</span>
        </div>
      </div>
    </div>
  );
}
