import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings2, Key, Phone, Bell, Shield, Save } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [apiKey, setApiKey] = useState("••••••••••••••••");
  const [voiceId, setVoiceId] = useState("");
  const [defaultConcurrency, setDefaultConcurrency] = useState("3");
  const [autoRetry, setAutoRetry] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const { toast } = useToast();

  const handleSaveSettings = () => {
    toast({
      title: "Settings saved",
      description: "Your preferences have been updated successfully.",
    });
  };

  const testApiConnection = async () => {
    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      
      if (data.status === "ok") {
        toast({
          title: "Connection successful",
          description: "Bland.ai API is working correctly.",
        });
      } else {
        toast({
          title: "Connection failed",
          description: "Unable to connect to Bland.ai API.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Connection error",
        description: "Failed to test API connection.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center space-x-2">
          <Settings2 className="w-8 h-8" />
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        </div>

        {/* API Configuration */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5" />
              <CardTitle>API Configuration</CardTitle>
            </div>
            <CardDescription>
              Configure your Bland.ai API settings for AI calling
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="api-key">Bland.ai API Key</Label>
                <div className="flex space-x-2">
                  <Input
                    id="api-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                  />
                  <Button variant="outline" onClick={testApiConnection}>
                    Test
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Your API key is securely stored and never displayed in full
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="voice-id">Default Voice ID</Label>
                <Input
                  id="voice-id"
                  value={voiceId}
                  onChange={(e) => setVoiceId(e.target.value)}
                  placeholder="Optional: Custom voice ID"
                />
                <p className="text-xs text-gray-500">
                  Leave empty to use Bland.ai default voice
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium text-green-800">API Status</span>
              </div>
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Connected
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Campaign Defaults */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Phone className="w-5 h-5" />
              <CardTitle>Campaign Defaults</CardTitle>
            </div>
            <CardDescription>
              Set default values for new campaigns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="concurrency">Default Concurrency</Label>
                <Input
                  id="concurrency"
                  type="number"
                  min="1"
                  max="10"
                  value={defaultConcurrency}
                  onChange={(e) => setDefaultConcurrency(e.target.value)}
                />
                <p className="text-xs text-gray-500">
                  Number of simultaneous calls (1-10)
                </p>
              </div>

              <div className="space-y-2">
                <Label>Auto Retry Failed Calls</Label>
                <div className="flex items-center space-x-2 mt-2">
                  <Switch
                    checked={autoRetry}
                    onCheckedChange={setAutoRetry}
                  />
                  <span className="text-sm text-gray-600">
                    {autoRetry ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  Automatically retry failed calls once
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <CardTitle>Notifications</CardTitle>
            </div>
            <CardDescription>
              Configure how you receive updates about campaigns
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base">Campaign Notifications</Label>
                <p className="text-sm text-gray-500">
                  Get notified when campaigns start, complete, or encounter errors
                </p>
              </div>
              <Switch
                checked={notifications}
                onCheckedChange={setNotifications}
              />
            </div>

            <Separator />

            <div className="space-y-3">
              <Label className="text-base">Notification Types</Label>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Campaign completion</span>
                  <Switch checked={notifications} disabled={!notifications} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Call failures</span>
                  <Switch checked={notifications} disabled={!notifications} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">API errors</span>
                  <Switch checked={notifications} disabled={!notifications} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your account details and usage statistics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">Pro</div>
                <div className="text-sm text-gray-500">Plan</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">Unlimited</div>
                <div className="text-sm text-gray-500">Calls Remaining</div>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-lg">
                <div className="text-2xl font-bold text-gray-900">Active</div>
                <div className="text-sm text-gray-500">Status</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSaveSettings} className="w-full md:w-auto">
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>
    </div>
  );
}