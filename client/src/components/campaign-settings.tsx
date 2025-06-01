import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export function CampaignSettings() {
  const [concurrency, setConcurrency] = useState("5");
  const [voiceId, setVoiceId] = useState("voice2");
  const [autoRetry, setAutoRetry] = useState(true);

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">Campaign Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="block text-sm font-medium text-slate-700 mb-2">
            Concurrency Level
          </Label>
          <Select value={concurrency} onValueChange={setConcurrency}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2">2 simultaneous calls</SelectItem>
              <SelectItem value="5">5 simultaneous calls</SelectItem>
              <SelectItem value="10">10 simultaneous calls</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label className="block text-sm font-medium text-slate-700 mb-2">
            Voice Selection
          </Label>
          <Select value={voiceId} onValueChange={setVoiceId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="voice1">Professional Female</SelectItem>
              <SelectItem value="voice2">Professional Male</SelectItem>
              <SelectItem value="voice3">Conversational Female</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-slate-700">Auto-retry Failed Calls</p>
            <p className="text-xs text-slate-500">Retry no-answer calls after 2 hours</p>
          </div>
          <Switch
            checked={autoRetry}
            onCheckedChange={setAutoRetry}
          />
        </div>
      </CardContent>
    </Card>
  );
}
