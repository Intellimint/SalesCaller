import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Square, Users, Phone, TrendingUp } from "lucide-react";
import { useState } from "react";

export default function Campaigns() {
  const { data: campaigns } = useQuery({
    queryKey: ["/api/campaigns"],
  });

  const { data: campaignStatus } = useQuery({
    queryKey: ["/api/campaign-status"],
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
  });

  const handleStopCampaign = async () => {
    try {
      await fetch("/api/stop-campaign", { method: "POST" });
      window.location.reload();
    } catch (error) {
      console.error("Failed to stop campaign:", error);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Campaigns</h1>
          <Button>
            <Play className="w-4 h-4 mr-2" />
            Start New Campaign
          </Button>
        </div>

        {/* Active Campaign Status */}
        {campaignStatus?.isActive && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-blue-900">Active Campaign</CardTitle>
                  <CardDescription>Campaign is currently running</CardDescription>
                </div>
                <Button variant="destructive" onClick={handleStopCampaign}>
                  <Square className="w-4 h-4 mr-2" />
                  Stop Campaign
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">{campaignStatus.progress}%</div>
                  <div className="text-sm text-blue-700">Progress</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">{campaignStatus.pendingCount}</div>
                  <div className="text-sm text-blue-700">Pending</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-900">{campaignStatus.totalCount}</div>
                  <div className="text-sm text-blue-700">Total</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Campaign Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalLeads || 0}</div>
              <p className="text-xs text-muted-foreground">Leads in system</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calls Made</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.callsMade || 0}</div>
              <p className="text-xs text-muted-foreground">Total calls placed</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.successRate || 0}%</div>
              <p className="text-xs text-muted-foreground">Call success rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Campaign History */}
        <Card>
          <CardHeader>
            <CardTitle>Campaign History</CardTitle>
            <CardDescription>Previous campaigns and their results</CardDescription>
          </CardHeader>
          <CardContent>
            {campaigns && campaigns.length > 0 ? (
              <div className="space-y-4">
                {campaigns.map((campaign: any) => (
                  <div key={campaign.id} className="flex justify-between items-center p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{campaign.name}</h3>
                      <p className="text-sm text-gray-500">
                        Created: {new Date(campaign.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={campaign.isActive === "true" ? "default" : "secondary"}>
                        {campaign.isActive === "true" ? "Active" : "Completed"}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        Concurrency: {campaign.concurrency}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Play className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No campaigns yet</p>
                <p className="text-sm">Start your first campaign to see results here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}