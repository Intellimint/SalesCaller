import { useQuery, useMutation, queryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FileText, Plus, Edit, Eye, Trash2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Prompts() {
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const { toast } = useToast();

  const { data: prompts } = useQuery({
    queryKey: ["/api/prompts"],
  });

  const createPromptMutation = useMutation({
    mutationFn: async ({ name, content }: { name: string; content: string }) => {
      return apiRequest(`/api/prompts/${name}`, {
        method: "POST",
        body: JSON.stringify({ content }),
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Prompt created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      setShowCreateDialog(false);
      setNewPromptName("");
      setNewPromptContent("");
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to create prompt",
        variant: "destructive"
      });
    }
  });

  const updatePromptMutation = useMutation({
    mutationFn: async ({ name, content }: { name: string; content: string }) => {
      return apiRequest(`/api/prompts/${name}`, {
        method: "PUT",
        body: JSON.stringify({ content }),
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Prompt updated successfully" });
      setIsEditing(false);
      handleViewPrompt(selectedPrompt.name.toLowerCase());
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to update prompt",
        variant: "destructive"
      });
    }
  });

  const deletePromptMutation = useMutation({
    mutationFn: async (name: string) => {
      return apiRequest(`/api/prompts/${name}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Prompt deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      setSelectedPrompt(null);
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete prompt",
        variant: "destructive"
      });
    }
  });

  const handleViewPrompt = async (promptId: string) => {
    try {
      const response = await fetch(`/api/prompts/${promptId}`);
      const promptData = await response.json();
      setSelectedPrompt(promptData);
      setEditedContent(promptData.content);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to load prompt:", error);
    }
  };

  const handleSavePrompt = () => {
    updatePromptMutation.mutate({
      name: selectedPrompt.name.toLowerCase(),
      content: editedContent
    });
  };

  const handleCreatePrompt = () => {
    if (!newPromptName.trim() || !newPromptContent.trim()) {
      toast({ 
        title: "Error", 
        description: "Please provide both name and content",
        variant: "destructive"
      });
      return;
    }
    createPromptMutation.mutate({
      name: newPromptName.toLowerCase().replace(/\s+/g, '-'),
      content: newPromptContent
    });
  };

  const handleDeletePrompt = (promptName: string) => {
    if (promptName === "default") {
      toast({ 
        title: "Error", 
        description: "Cannot delete default prompt",
        variant: "destructive"
      });
      return;
    }
    deletePromptMutation.mutate(promptName.toLowerCase());
  };

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Prompts</h1>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create New Prompt
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Create New Prompt</DialogTitle>
                <DialogDescription>
                  Create a new AI calling script for your campaigns.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Prompt Name
                  </label>
                  <Input
                    value={newPromptName}
                    onChange={(e) => setNewPromptName(e.target.value)}
                    placeholder="e.g., Sales Follow-up"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Script Content
                  </label>
                  <Textarea
                    value={newPromptContent}
                    onChange={(e) => setNewPromptContent(e.target.value)}
                    placeholder="Enter your AI calling script..."
                    className="min-h-[200px]"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreatePrompt} 
                  disabled={createPromptMutation.isPending}
                >
                  {createPromptMutation.isPending ? "Creating..." : "Create Prompt"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prompts List */}
          <Card>
            <CardHeader>
              <CardTitle>Available Prompts</CardTitle>
              <CardDescription>Manage your AI calling scripts</CardDescription>
            </CardHeader>
            <CardContent>
              {prompts && prompts.length > 0 ? (
                <div className="space-y-3">
                  {prompts.map((prompt: any) => (
                    <div
                      key={prompt.id}
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedPrompt?.id === prompt.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => handleViewPrompt(prompt.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium">{prompt.name}</h3>
                          <p className="text-sm text-gray-500 mt-1">
                            File: {prompt.filename}
                          </p>
                          {prompt.id === "default" && (
                            <Badge variant="secondary" className="mt-2">Default</Badge>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewPrompt(prompt.id);
                            }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewPrompt(prompt.id);
                              setIsEditing(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          {prompt.id !== "default" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Are you sure you want to delete "${prompt.name}"?`)) {
                                  handleDeletePrompt(prompt.id);
                                }
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No prompts available</p>
                  <p className="text-sm">Create your first prompt to get started</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Prompt Editor/Viewer */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>
                    {selectedPrompt ? selectedPrompt.name : "Select a Prompt"}
                  </CardTitle>
                  <CardDescription>
                    {isEditing ? "Edit prompt content" : "View prompt details"}
                  </CardDescription>
                </div>
                {selectedPrompt && (
                  <div className="flex space-x-2">
                    {isEditing ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditing(false);
                            setEditedContent(selectedPrompt.content);
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          onClick={handleSavePrompt}
                          disabled={updatePromptMutation.isPending}
                        >
                          {updatePromptMutation.isPending ? "Saving..." : "Save"}
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setIsEditing(true)}
                      >
                        Edit
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {selectedPrompt ? (
                <div className="space-y-4">
                  {isEditing && (
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Prompt Name
                      </label>
                      <Input
                        value={selectedPrompt.name}
                        placeholder="Enter prompt name"
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Script Content
                    </label>
                    <Textarea
                      value={isEditing ? editedContent : selectedPrompt.content || "Loading..."}
                      onChange={(e) => setEditedContent(e.target.value)}
                      readOnly={!isEditing}
                      placeholder="Enter your AI calling script..."
                      className="min-h-[400px] font-mono text-sm"
                    />
                  </div>
                  
                  {!isEditing && (
                    <div className="text-xs text-gray-500 mt-4">
                      <p><strong>Variables available:</strong></p>
                      <ul className="list-disc list-inside mt-1 space-y-1">
                        <li><code>&#123;contact&#125;</code> - Contact name</li>
                        <li><code>&#123;company&#125;</code> - Company name</li>
                        <li><code>&#123;phone&#125;</code> - Phone number</li>
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>Select a prompt from the list to view or edit</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Usage Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Prompt Guidelines</CardTitle>
            <CardDescription>Best practices for creating effective AI calling scripts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Structure Tips</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Start with a friendly greeting</li>
                  <li>• Clearly state your purpose</li>
                  <li>• Ask engaging questions</li>
                  <li>• Include natural conversation flow</li>
                  <li>• End with a clear call-to-action</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Variables</h4>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• Use &#123;contact&#125; for personalization</li>
                  <li>• Include &#123;company&#125; for business context</li>
                  <li>• &#123;phone&#125; is available if needed</li>
                  <li>• Variables are automatically replaced</li>
                  <li>• Test prompts before campaigns</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}