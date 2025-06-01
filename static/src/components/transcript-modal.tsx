import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Bot, User } from "lucide-react";

interface TranscriptModalProps {
  call: any;
  onClose: () => void;
}

export function TranscriptModal({ call, onClose }: TranscriptModalProps) {
  if (!call) return null;

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome) {
      case "interested":
        return <Badge className="bg-green-100 text-green-800">Interested</Badge>;
      case "not_interested":
        return <Badge className="bg-red-100 text-red-800">Not Interested</Badge>;
      case "voicemail":
        return <Badge className="bg-yellow-100 text-yellow-800">Voicemail</Badge>;
      case "no_answer":
        return <Badge className="bg-slate-100 text-slate-600">No Answer</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  // Parse transcript for display (simple format)
  const parseTranscript = (transcript: string) => {
    if (!transcript) return [];
    
    // For now, show the raw transcript
    // In a real app, you'd parse structured transcript data
    return [
      {
        speaker: "AI",
        message: transcript,
        timestamp: "00:05"
      }
    ];
  };

  const transcriptEntries = parseTranscript(call.transcript);

  return (
    <Dialog open={!!call} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Call Transcript</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-center space-x-4 text-sm text-slate-600 pb-4 border-b">
            <span>
              <strong>Contact:</strong> {call.lead?.contact || "Unknown"}
            </span>
            <span>
              <strong>Duration:</strong> {formatDuration(call.duration)}
            </span>
            <span>
              <strong>Outcome:</strong> {getOutcomeBadge(call.outcome)}
            </span>
          </div>
          
          <div className="max-h-96 overflow-y-auto space-y-4">
            {!call.transcript ? (
              <div className="text-center py-8">
                <p className="text-slate-500">No transcript available for this call.</p>
              </div>
            ) : transcriptEntries.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-slate-500">Transcript is being processed...</p>
              </div>
            ) : (
              transcriptEntries.map((entry, index) => (
                <div key={index} className="flex space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    entry.speaker === "AI" 
                      ? "bg-primary-100" 
                      : "bg-green-100"
                  }`}>
                    {entry.speaker === "AI" ? (
                      <Bot className="w-4 h-4 text-primary-600" />
                    ) : (
                      <User className="w-4 h-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className={`rounded-lg p-3 ${
                      entry.speaker === "AI"
                        ? "bg-slate-50"
                        : "bg-white border border-slate-200"
                    }`}>
                      <p className="text-sm text-slate-900">{entry.message}</p>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{entry.timestamp}</p>
                  </div>
                </div>
              ))
            )}
            
            {call.transcript && transcriptEntries.length === 1 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  <strong>Raw Transcript:</strong>
                </p>
                <p className="text-sm text-yellow-700 mt-2 whitespace-pre-wrap">
                  {call.transcript}
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
