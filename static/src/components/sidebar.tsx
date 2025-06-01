import { Phone, ChartLine, BellRing, Users, FileText, Settings, User, TestTube } from "lucide-react";
import { useLocation } from "wouter";

export function Sidebar() {
  const [location, setLocation] = useLocation();

  const navigationItems = [
    { path: "/", icon: ChartLine, label: "Dashboard" },
    { path: "/testing", icon: TestTube, label: "Test Call" },
    { path: "/campaigns", icon: BellRing, label: "Campaigns" },
    { path: "/leads", icon: Users, label: "Leads" },
    { path: "/prompts", icon: FileText, label: "Prompts" },
    { path: "/settings", icon: Settings, label: "Settings" }
  ];

  return (
    <div className="w-64 bg-white shadow-sm border-r border-slate-200 flex-shrink-0 flex flex-col">
      <div className="p-6 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
            <Phone className="text-white text-sm" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">Sales Ninja</h1>
            <p className="text-xs text-slate-500">AI Outbound Calling</p>
          </div>
        </div>
      </div>
      
      <nav className="p-4 space-y-2 flex-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || (item.path === "/" && location === "/dashboard");
          
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? "bg-primary-50 text-primary-700 font-medium"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
            </button>
          );
        })}
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
