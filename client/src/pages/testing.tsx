import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Phone, Play, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Testing() {
  const [phone, setPhone] = useState("");
  const [contact, setContact] = useState("");
  const [company, setCompany] = useState("");
  const [promptName, setPromptName] = useState("default");
  const [voiceId, setVoiceId] = useState("default");
  const [isDialing, setIsDialing] = useState(false);
  const [lastCall, setLastCall] = useState<any>(null);
  const { toast } = useToast();

  // Fetch available prompts
  const { data: prompts = [] } = useQuery({
    queryKey: ["/api/prompts"],
  });

  // Fetch recent test calls
  const { data: calls = [], refetch: refetchCalls } = useQuery({
    queryKey: ["/api/calls"],
    refetchInterval: 3000,
  });

  const handleTestCall = async () => {
    if (!phone.trim()) {
      toast({
        title: "Phone number required",
        description: "Please enter a valid phone number to test.",
        variant: "destructive",
      });
      return;
    }

    setIsDialing(true);
    try {
      // First create a test lead
      const leadData = {
        phone: phone.trim(),
        contact: contact.trim() || "Test Contact",
        company: company.trim() || "Test Company",
        status: "pending",
        promptName: promptName,
      };

      const leadResponse = await apiRequest("POST", "/api/test-call", {
        ...leadData,
        voiceId: voiceId || undefined,
      });

      toast({
        title: "Test call initiated",
        description: `Calling ${phone}... You should receive a call shortly.`,
      });

      setLastCall({
        phone,
        contact: contact || "Test Contact",
        company: company || "Test Company",
        status: "dialing",
        createdAt: new Date(),
      });

      // Refresh calls to show the new test call
      setTimeout(() => {
        refetchCalls();
      }, 1000);

    } catch (error) {
      toast({
        title: "Test call failed",
        description: "Failed to initiate test call. Please check your phone number and try again.",
        variant: "destructive",
      });
    } finally {
      setIsDialing(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, "");
    
    // Format as +1 (xxx) xxx-xxxx for US numbers
    if (digits.length <= 10) {
      if (digits.length >= 6) {
        return `+1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
      } else if (digits.length >= 3) {
        return `+1 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
      } else {
        return `+1 (${digits}`;
      }
    }
    return `+${digits}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setPhone(formatted);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Test Single Call</h1>
          <p className="text-slate-600">Test the AI calling system with a single phone number before running campaigns.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Test Call Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Phone className="w-5 h-5" />
                <span>Test Call Setup</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                  Phone Number *
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={handlePhoneChange}
                  placeholder="+1 (555) 123-4567"
                  className="mt-1"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Use your own phone number to test the AI calling system
                </p>
              </div>

              <div>
                <Label htmlFor="contact" className="text-sm font-medium text-slate-700">
                  Contact Name
                </Label>
                <Input
                  id="contact"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="Your Name"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="company" className="text-sm font-medium text-slate-700">
                  Company Name
                </Label>
                <Input
                  id="company"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  placeholder="Your Company"
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Script Template
                </Label>
                <Select value={promptName} onValueChange={setPromptName}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {prompts.length > 0 ? (
                      (prompts as any[]).map((prompt: any) => (
                        <SelectItem key={prompt.id} value={prompt.id}>
                          {prompt.name}
                        </SelectItem>
                      ))
                    ) : (
                      <>
                        <SelectItem value="default">Default Sales Script</SelectItem>
                        <SelectItem value="followup">Follow-up Script</SelectItem>
                        <SelectItem value="demo">Demo Request Script</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700">
                  Voice Selection (Optional)
                </Label>
                <Select value={voiceId} onValueChange={setVoiceId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Use default voice" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">Default Voice</SelectItem>
                    <SelectItem value="professional_male">Professional Male</SelectItem>
                    <SelectItem value="professional_female">Professional Female</SelectItem>
                    <SelectItem value="conversational_male">Conversational Male</SelectItem>
                    <SelectItem value="conversational_female">Conversational Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                onClick={handleTestCall}
                disabled={!phone.trim() || isDialing}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {isDialing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Initiating Call...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" />
                    Start Test Call
                  </>
                )}
              </Button>

              {lastCall && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">Last Test Call</p>
                  <p className="text-sm text-blue-700">
                    Called {lastCall.phone} at {new Date(lastCall.createdAt).toLocaleTimeString()}
                  </p>
                  <Badge variant="secondary" className="mt-2">
                    {lastCall.status === "dialing" ? "In Progress" : lastCall.status}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Test Calls */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Test Calls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {calls.slice(0, 5).map((call: any) => (
                  <div key={call.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {call.lead?.contact || "Unknown"} • {call.lead?.phone}
                      </p>
                      <p className="text-xs text-slate-500">
                        {call.createdAt ? new Date(call.createdAt).toLocaleString() : "Unknown time"}
                      </p>
                    </div>
                    <div className="flex flex-col items-end space-y-1">
                      <Badge variant={
                        call.outcome === "interested" ? "default" :
                        call.outcome === "not_interested" ? "destructive" :
                        call.outcome === "voicemail" ? "secondary" :
                        call.lead?.status === "dialing" ? "secondary" : "outline"
                      }>
                        {call.lead?.status === "dialing" ? "In Progress" : 
                         call.outcome || "Pending"}
                      </Badge>
                      {call.duration && (
                        <span className="text-xs text-slate-500">
                          {Math.floor(call.duration / 60)}:{(call.duration % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
                
                {calls.length === 0 && (
                  <div className="text-center py-8">
                    <Phone className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-sm text-slate-600">No test calls yet</p>
                    <p className="text-xs text-slate-500">Start your first test call to see results here</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}