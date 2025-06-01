import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { FileText, Play, RefreshCw, Redo, ThumbsUp, ThumbsDown, Voicemail, PhoneOff } from "lucide-react";
import { useState } from "react";

interface CallsTableProps {
  calls: any[];
  onViewTranscript: (call: any) => void;
  onRefresh: () => void;
}

export function CallsTable({ calls, onViewTranscript, onRefresh }: CallsTableProps) {
  const [filter, setFilter] = useState("all");

  const getOutcomeIcon = (outcome: string) => {
    switch (outcome) {
      case "interested":
        return <ThumbsUp className="w-3 h-3 mr-1" />;
      case "not_interested":
        return <ThumbsDown className="w-3 h-3 mr-1" />;
      case "voicemail":
        return <Voicemail className="w-3 h-3 mr-1" />;
      case "no_answer":
        return <PhoneOff className="w-3 h-3 mr-1" />;
      default:
        return null;
    }
  };

  const getOutcomeBadge = (outcome: string, status?: string) => {
    if (status === "dialing") {
      return (
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse mr-2"></div>
          In Progress
        </Badge>
      );
    }

    switch (outcome) {
      case "interested":
        return (
          <Badge className="bg-green-100 text-green-800">
            {getOutcomeIcon(outcome)}
            Interested
          </Badge>
        );
      case "not_interested":
        return (
          <Badge className="bg-red-100 text-red-800">
            {getOutcomeIcon(outcome)}
            Not Interested
          </Badge>
        );
      case "voicemail":
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            {getOutcomeIcon(outcome)}
            Voicemail
          </Badge>
        );
      case "no_answer":
        return (
          <Badge variant="secondary" className="bg-slate-100 text-slate-600">
            {getOutcomeIcon(outcome)}
            No Answer
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-slate-100 text-slate-600">
            Pending
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "done":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "dialing":
        return <Badge className="bg-orange-100 text-orange-800">In Progress</Badge>;
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTimestamp = (date: string | Date) => {
    const now = new Date();
    const callTime = new Date(date);
    const diffMs = now.getTime() - callTime.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return callTime.toLocaleDateString();
  };

  const filteredCalls = calls.filter(call => {
    if (filter === "all") return true;
    return call.outcome === filter || call.lead?.status === filter;
  });

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardHeader className="px-6 py-4 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Recent Calls</h3>
          <div className="flex items-center space-x-3">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Calls</SelectItem>
                <SelectItem value="interested">Interested</SelectItem>
                <SelectItem value="not_interested">Not Interested</SelectItem>
                <SelectItem value="voicemail">Voicemail</SelectItem>
                <SelectItem value="no_answer">No Answer</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" onClick={onRefresh}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Phone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Outcome</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Timestamp</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {filteredCalls.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    No calls found. Upload leads and start a campaign to see call data.
                  </td>
                </tr>
              ) : (
                filteredCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-slate-900">
                          {call.lead?.contact || "Unknown"}
                        </div>
                        <div className="text-sm text-slate-500">
                          {call.lead?.company || "No company"}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-900 font-mono">
                        {call.lead?.phone || "No phone"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(call.lead?.status || "unknown")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getOutcomeBadge(call.outcome, call.lead?.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                      {formatDuration(call.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      {call.createdAt ? formatTimestamp(call.createdAt) : "Unknown"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewTranscript(call)}
                          disabled={!call.transcript}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={true}
                          className="text-slate-400"
                        >
                          <Play className="w-4 h-4" />
                        </Button>
                        {call.outcome === "no_answer" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary-600 hover:text-primary-900"
                          >
                            <Redo className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {filteredCalls.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-700">
                Showing <span className="font-medium">1</span> to{" "}
                <span className="font-medium">{Math.min(filteredCalls.length, 10)}</span> of{" "}
                <span className="font-medium">{filteredCalls.length}</span> results
              </p>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button size="sm" className="bg-primary-600 text-white">
                  1
                </Button>
                <Button variant="outline" size="sm" disabled={filteredCalls.length <= 10}>
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
