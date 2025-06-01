import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CloudUpload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface UploadSectionProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: () => void;
}

export function UploadSection({ isOpen, onClose, onUploadComplete }: UploadSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [promptName, setPromptName] = useState("default");
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv") {
        toast({
          title: "Invalid file type",
          description: "Please select a CSV file.",
          variant: "destructive",
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("promptName", promptName);

      const response = await fetch("/api/upload-leads", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const result = await response.json();
      toast({
        title: "Upload successful",
        description: result.message,
      });
      
      setSelectedFile(null);
      onUploadComplete();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload leads. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  if (!isOpen) {
    return (
      <Card className="bg-white shadow-sm border border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-900">Upload Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CloudUpload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <p className="text-sm text-slate-600 mb-4">Click "Upload Leads" in the header to get started</p>
            <p className="text-xs text-slate-500">CSV format: phone, company, contact</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-slate-900">Upload Leads</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="file-upload" className="block text-sm font-medium text-slate-700 mb-2">
            CSV File
          </Label>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
            <CloudUpload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-700">
              {selectedFile ? selectedFile.name : "Drag & drop your CSV file"}
            </p>
            <p className="text-xs text-slate-500 mt-1">or click to browse</p>
            <Input
              id="file-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => document.getElementById("file-upload")?.click()}
            >
              Choose File
            </Button>
          </div>
        </div>

        <div>
          <Label className="block text-sm font-medium text-slate-700 mb-2">
            Select Prompt Template
          </Label>
          <Select value={promptName} onValueChange={setPromptName}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default Sales Script</SelectItem>
              <SelectItem value="followup">Follow-up Script</SelectItem>
              <SelectItem value="demo">Demo Request Script</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex space-x-2">
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="flex-1"
          >
            {isUploading ? "Uploading..." : "Upload Leads"}
          </Button>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
