import { Users, Phone, ChartLine, PhoneCall } from "lucide-react";

interface StatsCardsProps {
  stats?: {
    totalLeads: number;
    callsMade: number;
    successRate: number;
    activeCalls: number;
  };
}

export function StatsCards({ stats }: StatsCardsProps) {
  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 animate-pulse">
            <div className="h-6 bg-slate-200 rounded mb-2"></div>
            <div className="h-8 bg-slate-200 rounded mb-4"></div>
            <div className="h-4 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Total Leads</p>
            <p className="text-3xl font-bold text-slate-900">{stats.totalLeads.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Users className="text-blue-600 text-xl" />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <span className="text-sm text-green-600 font-medium">+12%</span>
          <span className="text-sm text-slate-500 ml-2">from last week</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Calls Made</p>
            <p className="text-3xl font-bold text-slate-900">{stats.callsMade.toLocaleString()}</p>
          </div>
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
            <Phone className="text-green-600 text-xl" />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <span className="text-sm text-green-600 font-medium">+8%</span>
          <span className="text-sm text-slate-500 ml-2">from yesterday</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Success Rate</p>
            <p className="text-3xl font-bold text-slate-900">{stats.successRate}%</p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <ChartLine className="text-purple-600 text-xl" />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <span className="text-sm text-green-600 font-medium">+2.1%</span>
          <span className="text-sm text-slate-500 ml-2">from last month</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">Active Calls</p>
            <p className="text-3xl font-bold text-slate-900">{stats.activeCalls}</p>
          </div>
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <PhoneCall className="text-orange-600 text-xl" />
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm text-slate-500 ml-2">Live now</span>
        </div>
      </div>
    </div>
  );
}
