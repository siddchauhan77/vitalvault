import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { FamilyGroup, User } from "@shared/schema";
import { Plus, Users, Copy, LogOut, Trash2, Crown, UserPlus } from "lucide-react";

type FamilyGroupExtended = FamilyGroup & { memberCount: number; role: string };
type FamilyGroupDetail = FamilyGroup & { members: Array<{ id: number; userId: string; role: string; user: User }> };

export default function FamilyPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

  const { data: groups, isLoading } = useQuery<FamilyGroupExtended[]>({
    queryKey: ["/api/family-groups"],
  });

  const { data: selectedGroup } = useQuery<FamilyGroupDetail>({
    queryKey: ["/api/family-groups", selectedGroupId],
    enabled: !!selectedGroupId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/family-groups", { name: newGroupName.trim() });
    },
    onSuccess: () => {
      toast({ title: "Family group created" });
      queryClient.invalidateQueries({ queryKey: ["/api/family-groups"] });
      setCreateOpen(false);
      setNewGroupName("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create group.", variant: "destructive" });
    },
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/family-groups/join", { code: joinCode.trim() });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Joined family group" });
      queryClient.invalidateQueries({ queryKey: ["/api/family-groups"] });
      setJoinOpen(false);
      setJoinCode("");
    },
    onError: () => {
      toast({ title: "Invalid code", description: "No group found with that code.", variant: "destructive" });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await apiRequest("POST", `/api/family-groups/${groupId}/leave`);
    },
    onSuccess: () => {
      toast({ title: "Left family group" });
      queryClient.invalidateQueries({ queryKey: ["/api/family-groups"] });
      setSelectedGroupId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (groupId: string) => {
      await apiRequest("DELETE", `/api/family-groups/${groupId}`);
    },
    onSuccess: () => {
      toast({ title: "Group deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/family-groups"] });
      setSelectedGroupId(null);
    },
  });

  const removeMemberMutation = useMutation({
    mutationFn: async ({ groupId, memberId }: { groupId: string; memberId: string }) => {
      await apiRequest("DELETE", `/api/family-groups/${groupId}/members/${memberId}`);
    },
    onSuccess: () => {
      toast({ title: "Member removed" });
      if (selectedGroupId) {
        queryClient.invalidateQueries({ queryKey: ["/api/family-groups", selectedGroupId] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/family-groups"] });
    },
  });

  const copyJoinCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      toast({ title: "Copied", description: "Join code copied to clipboard." });
    }).catch(() => {
      toast({ title: "Code: " + code, description: "Share this code with family members." });
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-3xl" data-testid="family-page">
      <div className="flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Family</h1>
          <p className="text-sm text-muted-foreground">Manage family groups and share health data</p>
        </div>
        <div className="flex gap-2">
          {/* Join Group */}
          <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary" size="sm" data-testid="button-join-group">
                <UserPlus className="w-4 h-4 mr-1.5" />
                Join
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Join a Family Group</DialogTitle>
                <DialogDescription>
                  Enter the share code from a family member to join their group.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label className="text-xs">Share Code</Label>
                  <Input
                    placeholder="e.g. ABC123"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="font-mono tracking-widest text-center text-lg"
                    data-testid="input-join-code"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => joinMutation.mutate()}
                  disabled={joinCode.trim().length < 6 || joinMutation.isPending}
                  data-testid="button-submit-join"
                >
                  {joinMutation.isPending ? "Joining..." : "Join Group"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Create Group */}
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" data-testid="button-create-group">
                <Plus className="w-4 h-4 mr-1.5" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Family Group</DialogTitle>
                <DialogDescription>
                  Create a group and share the code with family members.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label className="text-xs">Group Name</Label>
                  <Input
                    placeholder="e.g. Chauhan Family"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    data-testid="input-group-name"
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createMutation.mutate()}
                  disabled={!newGroupName.trim() || createMutation.isPending}
                  data-testid="button-submit-create"
                >
                  {createMutation.isPending ? "Creating..." : "Create Group"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-md" />
          ))}
        </div>
      ) : groups && groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map((group) => (
            <Card
              key={group.id}
              className={`cursor-pointer transition-colors ${selectedGroupId === group.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => setSelectedGroupId(selectedGroupId === group.id ? null : group.id)}
              data-testid={`group-card-${group.id}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-2 rounded-md bg-primary/10 text-primary">
                      <Users className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">{group.name}</p>
                        {group.role === "owner" && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            <Crown className="w-3 h-3 mr-1" />
                            Owner
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1.5 font-mono"
                      onClick={() => copyJoinCode(group.joinCode)}
                      data-testid={`button-copy-code-${group.id}`}
                    >
                      <Copy className="w-3 h-3" />
                      {group.joinCode}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <h3 className="text-base font-medium mb-1">No family groups yet</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Create a family group and share the code, or join one with a code from a family member.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Selected Group Detail */}
      {selectedGroupId && selectedGroup && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              {selectedGroup.name} — Members
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {selectedGroup.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-3" data-testid={`member-${member.userId}`}>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                    {member.user.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{member.user.displayName}</p>
                    <p className="text-xs text-muted-foreground">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.role === "owner" && (
                    <Badge variant="secondary" className="text-xs">Owner</Badge>
                  )}
                  {/* Owner can remove non-owner members */}
                  {selectedGroup.ownerId === user?.id && member.userId !== user?.id && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground"
                      onClick={() => removeMemberMutation.mutate({ groupId: selectedGroupId, memberId: member.userId })}
                      data-testid={`button-remove-member-${member.userId}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {/* Group actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t">
              {selectedGroup.ownerId === user?.id ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" data-testid="button-delete-group">
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Delete Group
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this group?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the group and remove all members. This cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => deleteMutation.mutate(selectedGroupId)}
                        className="bg-destructive text-destructive-foreground"
                        data-testid="button-confirm-delete-group"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => leaveMutation.mutate(selectedGroupId)}
                  disabled={leaveMutation.isPending}
                  data-testid="button-leave-group"
                >
                  <LogOut className="w-3.5 h-3.5 mr-1.5" />
                  Leave Group
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
