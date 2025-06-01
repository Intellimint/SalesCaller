import { useQuery } from "@tanstack/react-query";
import { StatsCards } from "@/components/stats-cards";
import { UploadSection } from "@/components/upload-section";
import { CampaignSettings } from "@/components/campaign-settings";
import { LiveStatus } from "@/components/live-status";
import { CallsTable } from "@/components/calls-table";
import { TranscriptModal } from "@/components/transcript-modal";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Play, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedTranscript, setSelectedTranscript] = useState<any>(null);
  const { toast } = useToast();

  // Auto-refresh data every 10 seconds
  const { data: stats, refetch: refetchStats } = useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 10000,
  });

  const { data: calls, refetch: refetchCalls } = useQuery({
    queryKey: ["/api/calls"],
    refetchInterval: 10000,
  });

  const { data: campaignStatus, refetch: refetchCampaignStatus } = useQuery({
    queryKey: ["/api/campaign-status"],
    refetchInterval: 5000,
  });

  const handleStartCampaign = async () => {
    try {
      await apiRequest("POST", "/api/start-campaign", {
        concurrency: 5,
        voiceId: "professional_male",
        autoRetry: true,
      });
      toast({
        title: "Campaign Started",
        description: "Your outbound calling campaign is now active.",
      });
      refetchCampaignStatus();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start campaign. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleStopCampaign = async () => {
    try {
      await apiRequest("POST", "/api/stop-campaign", {});
      toast({
        title: "Campaign Stopped",
        description: "Your campaign has been stopped successfully.",
      });
      refetchCampaignStatus();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to stop campaign. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Bar */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Campaign Dashboard</h1>
            <p className="text-sm text-slate-600">Monitor and manage your outbound calling campaigns</p>
          </div>
          <div className="flex items-center space-x-4">
            <Button 
              onClick={() => setIsUploadOpen(true)}
              className="bg-primary-600 hover:bg-primary-700"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Leads
            </Button>
            {campaignStatus?.isActive ? (
              <Button 
                onClick={handleStopCampaign}
                variant="destructive"
              >
                Stop Campaign
              </Button>
            ) : (
              <Button 
                onClick={handleStartCampaign}
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Campaign
              </Button>
            )}
          </div>
        </div>

        <StatsCards stats={stats} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <CampaignSettings />
          <LiveStatus 
            campaignStatus={campaignStatus}
            onStop={handleStopCampaign}
          />
        </div>
        
        <CallsTable 
          calls={calls || []}
          onViewTranscript={setSelectedTranscript}
          onRefresh={refetchCalls}
        />
      </div>

      <UploadSection 
        isOpen={isUploadOpen} 
        onClose={() => setIsUploadOpen(false)}
        onUploadComplete={() => {
          refetchStats();
          refetchCalls();
          setIsUploadOpen(false);
        }}
      />

      <TranscriptModal 
        call={selectedTranscript}
        onClose={() => setSelectedTranscript(null)}
      />
    </div>
  );
}
