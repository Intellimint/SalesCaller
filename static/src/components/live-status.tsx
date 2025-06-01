import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface LiveStatusProps {
  campaignStatus?: {
    isActive: boolean;
    progress: number;
    pendingCount: number;
    totalCount: number;
  };
  onStop: () => void;
}

export function LiveStatus({ campaignStatus, onStop }: LiveStatusProps) {
  const isActive = campaignStatus?.isActive || false;
  const progress = campaignStatus?.progress || 0;
  const pendingCount = campaignStatus?.pendingCount || 0;
  const totalCount = campaignStatus?.totalCount || 0;
  const processedCount = totalCount - pendingCount;

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">Live Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className={`flex items-center justify-between p-3 rounded-lg border ${
          isActive 
            ? 'bg-green-50 border-green-200' 
            : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${
              isActive ? 'bg-green-500 animate-pulse' : 'bg-slate-400'
            }`}></div>
            <div>
              <p className={`text-sm font-medium ${
                isActive ? 'text-green-900' : 'text-slate-900'
              }`}>
                {isActive ? 'Campaign Active' : 'Campaign Stopped'}
              </p>
              <p className={`text-xs ${
                isActive ? 'text-green-600' : 'text-slate-600'
              }`}>
                {isActive ? `${pendingCount} calls pending` : 'No active calls'}
              </p>
            </div>
          </div>
          {isActive && (
            <Button 
              size="sm" 
              variant="destructive"
              onClick={onStop}
            >
              Stop
            </Button>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Progress</span>
            <span className="font-medium text-slate-900">{progress}%</span>
          </div>
          <Progress value={progress} className="w-full" />
          <p className="text-xs text-slate-500">
            {processedCount} of {totalCount} leads processed
          </p>
        </div>
        
        <div className="pt-3 border-t border-slate-200">
          <p className="text-xs font-medium text-slate-700 mb-2">Recent Outcomes</p>
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Interested</span>
              <span className="text-green-600 font-medium">-</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Not Interested</span>
              <span className="text-red-500 font-medium">-</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-500">Voicemail</span>
              <span className="text-yellow-600 font-medium">-</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
