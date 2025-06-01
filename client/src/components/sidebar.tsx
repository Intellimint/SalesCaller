import { Phone, ChartLine, BellRing, Users, FileText, Settings, User } from "lucide-react";

export function Sidebar() {
  return (
    <div className="w-64 bg-white shadow-sm border-r border-slate-200 flex-shrink-0 flex flex-col">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Phone className="text-white text-sm" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">SalesDialer</h1>
            <p className="text-xs text-slate-500">AI Outbound Calling</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4 space-y-2 flex-1">
        <a href="#dashboard" className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-primary-50 text-primary-700 font-medium">
          <ChartLine className="w-5 h-5" />
          <span>Dashboard</span>
        </a>
        <a href="#campaigns" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50">
          <BellRing className="w-5 h-5" />
          <span>Campaigns</span>
        </a>
        <a href="#leads" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50">
          <Users className="w-5 h-5" />
          <span>Leads</span>
        </a>
        <a href="#prompts" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50">
          <FileText className="w-5 h-5" />
          <span>Prompts</span>
        </a>
        <a href="#settings" className="flex items-center space-x-3 px-3 py-2 rounded-lg text-slate-600 hover:bg-slate-50">
          <Settings className="w-5 h-5" />
          <span>Settings</span>
        </a>
      </nav>
      
      <div className="p-4 border-t border-slate-200 bg-white">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
            <User className="text-slate-600 text-sm" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-900">Sarah Chen</p>
            <p className="text-xs text-slate-500">Sales Manager</p>
          </div>
        </div>
      </div>
    </div>
  );
}
