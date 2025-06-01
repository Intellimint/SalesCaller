import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Eye, Edit, Trash2, Plus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function Prompts() {
  const [selectedPrompt, setSelectedPrompt] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPromptName, setNewPromptName] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [editedContent, setEditedContent] = useState("");
  const { toast } = useToast();

  // Fetch prompts
  const { data: prompts, isLoading } = useQuery({
    queryKey: ["/api/prompts"],
    queryFn: async () => {
      const response = await fetch("/api/prompts");
      if (!response.ok) throw new Error("Failed to fetch prompts");
      return response.json();
    },
  });

  // Create prompt mutation
  const createPromptMutation = useMutation({
    mutationFn: async ({ name, content }: { name: string; content: string }) => {
      const response = await fetch(`/api/prompts/${name}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Prompt created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      setShowCreateDialog(false);
      setNewPromptName("");
      setNewPromptContent("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Update prompt mutation
  const updatePromptMutation = useMutation({
    mutationFn: async ({ name, content }: { name: string; content: string }) => {
      const response = await fetch(`/api/prompts/${name}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Prompt updated successfully" });
      setIsEditing(false);
      handleViewPrompt(selectedPrompt.id);
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Delete prompt mutation
  const deletePromptMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await fetch(`/api/prompts/${name}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Prompt deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/prompts"] });
      setSelectedPrompt(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleViewPrompt = async (promptId: string) => {
    try {
      const response = await fetch(`/api/prompts/${promptId}`);
      if (!response.ok) throw new Error("Failed to fetch prompt");
      const data = await response.json();
      setSelectedPrompt(data);
      setEditedContent(data.content);
    } catch (error) {
      console.error("Error fetching prompt:", error);
      toast({
        title: "Error",
        description: "Failed to load prompt content",
        variant: "destructive",
      });
    }
  };

  const handleCreatePrompt = () => {
    if (!newPromptName.trim() || !newPromptContent.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both name and content",
        variant: "destructive",
      });
      return;
    }
    createPromptMutation.mutate({
      name: newPromptName.toLowerCase(),
      content: newPromptContent,
    });
  };

  const handleUpdatePrompt = () => {
    if (!editedContent.trim()) {
      toast({
        title: "Error",
        description: "Content cannot be empty",
        variant: "destructive",
      });
      return;
    }
    updatePromptMutation.mutate({
      name: selectedPrompt.id,
      content: editedContent,
    });
  };

  const handleDeletePrompt = (promptId: string) => {
    const promptName = prompts?.find(p => p.id === promptId)?.name || promptId;
    if (window.confirm(`Are you sure you want to delete "${promptName}"?`)) {
      deletePromptMutation.mutate(promptId);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="h-96 bg-gray-200 rounded"></div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Prompt Management</h1>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Prompt
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Create New Prompt</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Prompt Name</label>
                <Input
                  value={newPromptName}
                  onChange={(e) => setNewPromptName(e.target.value)}
                  placeholder="Enter prompt name"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <Textarea
                  value={newPromptContent}
                  onChange={(e) => setNewPromptContent(e.target.value)}
                  placeholder="Enter prompt content"
                  className="min-h-[200px]"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreatePrompt}
                  disabled={createPromptMutation.isPending}
                >
                  {createPromptMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prompts List */}
        <Card>
          <CardHeader>
            <CardTitle>Available Prompts</CardTitle>
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
                              handleDeletePrompt(prompt.id);
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
                No prompts available. Create your first prompt!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Prompt Detail/Editor */}
        <Card>
          <CardHeader>
            <CardTitle>
              {selectedPrompt
                ? isEditing
                  ? `Edit "${selectedPrompt.name}"`
                  : `View "${selectedPrompt.name}"`
                : "Select a prompt to view"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedPrompt ? (
              <div className="space-y-4">
                {isEditing ? (
                  <>
                    <Textarea
                      value={editedContent}
                      onChange={(e) => setEditedContent(e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                      placeholder="Enter prompt content..."
                    />
                    <div className="flex justify-end space-x-2">
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
                        onClick={handleUpdatePrompt}
                        disabled={updatePromptMutation.isPending}
                      >
                        {updatePromptMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <pre className="whitespace-pre-wrap text-sm">
                        {selectedPrompt.content}
                      </pre>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={() => setIsEditing(true)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Prompt
                      </Button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Click on a prompt from the list to view its content
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}