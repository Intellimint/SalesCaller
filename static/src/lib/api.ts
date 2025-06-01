import { apiRequest } from "./queryClient";

export interface UploadLeadsRequest {
  file: File;
  promptName: string;
}

export interface StartCampaignRequest {
  concurrency: number;
  voiceId?: string;
  autoRetry: boolean;
}

export const api = {
  uploadLeads: async (data: UploadLeadsRequest) => {
    const formData = new FormData();
    formData.append("file", data.file);
    formData.append("promptName", data.promptName);

    const response = await fetch("/api/upload-leads", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    return response.json();
  },

  startCampaign: async (data: StartCampaignRequest) => {
    return apiRequest("POST", "/api/start-campaign", data);
  },

  stopCampaign: async () => {
    return apiRequest("POST", "/api/stop-campaign", {});
  },

  getCalls: async () => {
    const response = await apiRequest("GET", "/api/calls", undefined);
    return response.json();
  },

  getStats: async () => {
    const response = await apiRequest("GET", "/api/stats", undefined);
    return response.json();
  },

  getCampaignStatus: async () => {
    const response = await apiRequest("GET", "/api/campaign-status", undefined);
    return response.json();
  },
};
