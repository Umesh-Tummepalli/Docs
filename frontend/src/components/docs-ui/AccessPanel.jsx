import { useCallback, useRef, useState } from "react";
import {

  Check,
  ChevronDown,
  Clock,
  Copy,
  Edit3,
  Eye,
  Link as LinkIcon,
  Loader2,
  RefreshCw,
  Shield,
  Trash2,
  Users,
  UserPlus,
  X,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "react-toastify";
import api from "@/lib/api";

const getTokensFromResponse = (data) => {
  if (Array.isArray(data)) return data;
  return data?.accessTokens || data?.tokens || data?.data || [];
};

const getAccessLevel = (item) => item?.accessLevel || item?.access || item?.permission || "read";

const getTokenValue = (item) => {
  if (typeof item === "string") return item;
  return item?.token || item?.accessToken || item?.value || item?.access_token;
};

const AccessPanel = ({ docId, accessList = [], accessRequests = [], onUpdate }) => {
  const [loadingAction, setLoadingAction] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [accessTokens, setAccessTokens] = useState([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [linkName, setLinkName] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const linkNameInputRef = useRef(null);

  const getShareUrl = useCallback((token) => {
    const url = new URL(`/documents/${docId}`, window.location.origin);
    url.searchParams.set("access", token);
    return url.toString();
  }, [docId]);

  const copyToClipboard = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Share link copied to clipboard");
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (copied) toast.success("Share link copied to clipboard");
      else toast.error("Unable to copy the share link");
    }
  };

  const loadAccessTokens = useCallback(async () => {
    try {
      setIsLoadingTokens(true);
      const response = await api.get(`/documents/${docId}/access-tokens`);
      setAccessTokens(getTokensFromResponse(response.data));
      return true;
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load share links");
      return false;
    } finally {
      setIsLoadingTokens(false);
    }
  }, [docId]);


  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      const [tokensLoaded, refreshed] = await Promise.all([
        loadAccessTokens(),
        onUpdate ? onUpdate() : Promise.resolve(true),
      ]);
      if (tokensLoaded && refreshed !== false) toast.success("Access details refreshed");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to refresh access details");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCreateShareLink = async (accessLevel) => {
    const name = linkName.trim();
    if (!name) {
      toast.error("Give this share link a name first");
      linkNameInputRef.current?.focus();
      return;
    }

    try {
      setLoadingAction(`share-${accessLevel}`);
      const response = await api.post(`/documents/${docId}/access-token`, { accessLevel, name });
      const token = getTokenValue(response.data);
      if (!token) throw new Error("The server did not return an access token");

      await copyToClipboard(getShareUrl(token));
      setLinkName("");
      await loadAccessTokens();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to create a share link");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRevokeShareLink = async (accessTokenId, name) => {
    if (!accessTokenId) {
      toast.error("This share link cannot be revoked because its ID is unavailable");
      return;
    }


    try {
      setLoadingAction(`revoke-${accessTokenId}`);
      await api.delete(`/documents/${docId}/access-tokens/${accessTokenId}`);
      toast.success("Share link revoked");
      await loadAccessTokens();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to revoke the share link");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemoveAccess = async (userId) => {
    try {
      setLoadingAction(`remove-${userId}`);
      await api.delete(`/documents/${docId}/access/${userId}`);
      toast.success("Access removed");
      onUpdate?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to remove access");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleApprove = async (requestId, accessLevel) => {
    try {
      setLoadingAction(`approve-${requestId}-${accessLevel}`);
      await api.post(`/documents/${docId}/access-request/approve`, { requestId, accessLevel });
      toast.success(accessLevel === "owner" ? "Owner access granted" : accessLevel === "write" ? "Write access granted" : "View access granted");
      onUpdate?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to approve request");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleDeny = async (requestId) => {
    try {
      setLoadingAction(`deny-${requestId}`);
      await api.post(`/documents/${docId}/access-request/deny`, { requestId });
      toast.success("Access request denied");
      onUpdate?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to deny request");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleChangeAccessLevel = async (userId, accessLevel) => {
    try {
      setLoadingAction(`access-${userId}-${accessLevel}`);
      await api.patch(`/documents/${docId}/access/${userId}`, { accessLevel });
      toast.success(accessLevel === "owner" ? "Owner access granted" : accessLevel === "write" ? "Edit access granted" : "View access granted");
      onUpdate?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to update this person's access");
    } finally {
      setLoadingAction(null);
    }
  };

  const getRoleIcon = (level) => {
    if (level === "owner") return <Shield className="size-3.5 text-amber-500" />;
    if (level === "write") return <Edit3 className="size-3.5 text-blue-500" />;
    return <Eye className="size-3.5 text-slate-500" />;
  };

  const getRoleLabel = (level) => {
    if (level === "owner") return "Owner";
    if (level === "write") return "Can edit";
    return "Can view";
  };


  return (
    <Sheet open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (open) loadAccessTokens();
    }}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-9 rounded-full text-slate-600 hover:bg-slate-100 hover:text-slate-900">
          <Users className="size-4.5" />
          {accessRequests.length > 0 && <span className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">{accessRequests.length}</span>}
          <span className="sr-only">Manage document access</span>
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full overflow-y-auto bg-slate-50 p-0 sm:max-w-md">
        <div className="border-b border-slate-200 bg-white p-6">
          <SheetHeader className="space-y-1.5">
            <div className="flex items-center justify-between gap-3">
              <SheetTitle className="flex items-center gap-2 text-xl font-semibold text-slate-900"><Users className="size-5 text-slate-600" />Manage access</SheetTitle>
              <Button type="button" size="sm" variant="outline" onClick={handleRefresh} disabled={isRefreshing} className="border-slate-300 text-slate-700 hover:bg-slate-50">
                <RefreshCw className={`mr-1.5 size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />Reload
              </Button>
            </div>
            <SheetDescription>Invite people directly or create a link with the right permission.</SheetDescription>
          </SheetHeader>
        </div>

        <div className="space-y-7 p-6">
          <section className="space-y-3">
            <div><h3 className="text-sm font-semibold text-slate-800">Share with a link</h3><p className="mt-1 text-xs leading-5 text-slate-500">Name the link, then choose the permission you want to share.</p></div>
            <label className="block"><span className="mb-1.5 block text-xs font-medium text-slate-700">Link name</span><input ref={linkNameInputRef} type="text" value={linkName} onChange={(event) => setLinkName(event.target.value)} maxLength={100} placeholder="e.g. Design review team" disabled={loadingAction !== null} className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-wait disabled:opacity-60" /></label>
            <div className="grid grid-cols-2 gap-3">
              {[{ level: "read", label: "View link", description: "Read-only access", icon: Eye, style: "border-slate-200 hover:border-slate-300 hover:bg-slate-50" }, { level: "write", label: "Edit link", description: "Can make changes", icon: Edit3, style: "border-blue-200 bg-blue-50/50 hover:border-blue-300 hover:bg-blue-50" }].map(({ level, label, description, icon: Icon, style }) => (
                <button key={level} type="button" onClick={() => handleCreateShareLink(level)} disabled={loadingAction !== null} className={`rounded-xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:cursor-wait disabled:opacity-60 ${style}`}>
                  <div className="mb-3 flex items-center justify-between"><span className="flex size-8 items-center justify-center rounded-lg bg-white shadow-sm"><Icon className={`size-4 ${level === "write" ? "text-blue-600" : "text-slate-600"}`} /></span>{loadingAction === `share-${level}` && <Loader2 className="size-4 animate-spin text-blue-600" />}</div>
                  <p className="text-sm font-semibold text-slate-900">{label}</p><p className="mt-0.5 text-xs text-slate-500">{description}</p>
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between"><div><h3 className="text-sm font-semibold text-slate-800">Active links</h3><p className="mt-1 text-xs text-slate-500">Copy a specific link whenever you need it.</p></div><Badge variant="secondary" className="bg-slate-200/70 text-slate-600">{accessTokens.length}</Badge></div>
            {isLoadingTokens ? <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-7 text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" />Loading links</div> : accessTokens.length > 0 ? <div className="space-y-2">{accessTokens.map((item, index) => { const level = getAccessLevel(item); const token = getTokenValue(item); const accessTokenId = item?._id || item?.id; const linkName = item?.name || item?.label || getRoleLabel(level); return <div key={accessTokenId || token || index} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${level === "write" ? "bg-blue-50" : "bg-slate-100"}`}>{getRoleIcon(level)}</span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-800">{linkName} link</p><p className="truncate text-xs text-slate-500">{token ? getShareUrl(token) : "Link token unavailable"}</p></div><div className="flex shrink-0 items-center"><Button type="button" size="icon" variant="ghost" disabled={!token} onClick={() => copyToClipboard(getShareUrl(token))} className="size-8 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Copy className="size-4" /><span className="sr-only">Copy {getRoleLabel(level)} link</span></Button><Button type="button" size="icon" variant="ghost" disabled={!accessTokenId || loadingAction !== null} onClick={() => setConfirmation({ type: "revoke-link", id: accessTokenId, name: linkName })} className="size-8 text-slate-400 hover:bg-red-50 hover:text-red-600"><span className="sr-only">Revoke {linkName} link</span>{loadingAction === `revoke-${accessTokenId}` ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</Button></div></div>; })}</div> : <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-7 text-center"><LinkIcon className="mx-auto mb-2 size-5 text-slate-400" /><p className="text-sm font-medium text-slate-600">No share links yet</p><p className="mt-1 text-xs text-slate-400">Create a view or edit link above.</p></div>}
          </section>

          {accessRequests.length > 0 && <><Separator /><section className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Clock className="size-4 text-amber-500" />Pending requests</h3><p className="mt-1 text-xs text-slate-500">Approve each request with the access level you want to give.</p></div>
              <Badge className="border-amber-200 bg-amber-50 text-amber-700" variant="outline">{accessRequests.length} pending</Badge>
            </div>
            <div className="space-y-3">{accessRequests.map((request) => <div key={request._id} className="rounded-xl border border-amber-100 bg-linear-to-br from-amber-50/80 to-white p-4 shadow-sm">
              <div className="flex items-center gap-3"><div className="flex size-10 items-center justify-center rounded-full bg-amber-100 font-semibold text-amber-700 ring-4 ring-amber-50">{request.userId?.username?.charAt(0).toUpperCase() || "?"}</div><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{request.userId?.username || "Unknown user"}</p><p className="truncate text-xs text-slate-500">{request.userId?.email || "No email"}</p></div></div>
              <div className="mt-4 grid grid-cols-[1fr_1fr_auto] gap-2"><Button size="sm" onClick={() => handleApprove(request._id, "read")} disabled={loadingAction !== null} className="h-9 bg-emerald-600 text-xs hover:bg-emerald-700">{loadingAction === `approve-${request._id}-read` ? <Loader2 className="size-3.5 animate-spin" /> : <><Eye className="mr-1.5 size-3.5" />Give view</>}</Button><Button size="sm" onClick={() => handleApprove(request._id, "write")} disabled={loadingAction !== null} className="h-9 bg-blue-600 text-xs hover:bg-blue-700">{loadingAction === `approve-${request._id}-write` ? <Loader2 className="size-3.5 animate-spin" /> : <><Edit3 className="mr-1.5 size-3.5" />Give edit</>}</Button><Button size="icon" variant="outline" onClick={() => handleDeny(request._id)} disabled={loadingAction !== null} className="size-9 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700">{loadingAction === `deny-${request._id}` ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-4" />}<span className="sr-only">Deny request</span></Button></div>
            </div>)}</div>
          </section></>}

          <Separator />
          <section className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><UserPlus className="size-4 text-blue-500" />People with access</h3>
                <p className="mt-1 text-xs text-slate-500">Choose Edit or Owner for each collaborator.</p>
              </div>
              <Badge variant="secondary" className="bg-slate-200/70 text-slate-600">{accessList.length}</Badge>
            </div>
            {accessList.length > 0 ? <div className="space-y-2.5">
              {accessList.map((access) => {
                const userId = access.userId?._id || access.userId;
                const isOwner = access.accessLevel === "owner";
                const isUpdating = loadingAction?.startsWith(`access-${userId}-`);
                return <div key={access._id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className={`flex size-10 shrink-0 items-center justify-center rounded-full font-semibold ${isOwner ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>{access.userId?.username?.charAt(0).toUpperCase() || "?"}</div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{access.userId?.username || "Unknown user"}</p>
                      <p className="truncate text-xs text-slate-500">{access.userId?.email || "No email"}</p>
                    </div>
                  </div>
                  {isOwner ? <Badge variant="outline" className="shrink-0 border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700"><Shield className="mr-1 size-3.5" />Owner</Badge> : <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button type="button" size="sm" variant="outline" disabled={loadingAction !== null} className="h-8 shrink-0 rounded-lg border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-700 shadow-none hover:border-slate-300 hover:bg-white">
                        {isUpdating ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : getRoleIcon(access.accessLevel)}
                        <span className="ml-1.5">{getRoleLabel(access.accessLevel)}</span><ChevronDown className="ml-1.5 size-3.5 text-slate-400" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" sideOffset={6} className="min-w-44 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-200/70 ring-0">
                      <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Change access</DropdownMenuLabel>
                      <DropdownMenuItem disabled={access.accessLevel === "read"} onSelect={() => handleChangeAccessLevel(userId, "read")} className="gap-2.5 rounded-lg px-2 py-2 text-slate-700 focus:bg-slate-100 focus:text-slate-800 data-disabled:opacity-100"><span className="flex size-6 items-center justify-center rounded-md bg-slate-100"><Eye className="size-3.5 text-slate-600" /></span><span>Can view</span>{access.accessLevel === "read" && <Check className="ml-auto size-4 text-slate-500" />}</DropdownMenuItem>
                      <DropdownMenuItem disabled={access.accessLevel === "write"} onSelect={() => handleChangeAccessLevel(userId, "write")} className="gap-2.5 rounded-lg px-2 py-2 text-slate-700 focus:bg-blue-50 focus:text-blue-700 data-disabled:opacity-100"><span className="flex size-6 items-center justify-center rounded-md bg-blue-50"><Edit3 className="size-3.5 text-blue-600" /></span><span>Can edit</span>{access.accessLevel === "write" && <Check className="ml-auto size-4 text-blue-600" />}</DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleChangeAccessLevel(userId, "owner")} className="gap-2.5 rounded-lg px-2 py-2 text-amber-700 focus:bg-amber-50 focus:text-amber-800"><span className="flex size-6 items-center justify-center rounded-md bg-amber-50"><Shield className="size-3.5 text-amber-500" /></span><span>Make owner</span></DropdownMenuItem>
                      <DropdownMenuSeparator className="my-1 bg-slate-100" />
                      <DropdownMenuItem variant="destructive" onSelect={() => setConfirmation({ type: "remove-access", id: userId, name: access.userId?.username })} className="gap-2.5 rounded-lg px-2 py-2"><span className="flex size-6 items-center justify-center rounded-md bg-red-50"><Trash2 className="size-3.5 text-red-600" /></span><span>Remove access</span></DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>}
                </div>;
              })}
            </div> : <p className="rounded-xl border border-dashed border-slate-200 bg-white py-6 text-center text-sm text-slate-500">No people have access yet.</p>}
          </section>
        </div>
      </SheetContent>

      <AlertDialog open={Boolean(confirmation)} onOpenChange={(open) => { if (!open) setConfirmation(null); }}>
        <AlertDialogContent className="border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-300/50">
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-red-50 text-red-600"><Trash2 className="size-5" /></AlertDialogMedia>
            <AlertDialogTitle>{confirmation?.type === "revoke-link" ? "Revoke share link?" : "Remove access?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmation?.type === "revoke-link"
                ? <>Anyone using <span className="font-medium text-slate-700">{confirmation?.name || "this link"}</span> will immediately lose access.</>
                : <>Remove <span className="font-medium text-slate-700">{confirmation?.name || "this person"}</span> from this document? They will no longer be able to open it.</>}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="border-slate-100 bg-slate-50/70">
            <AlertDialogCancel disabled={loadingAction !== null} className="border-slate-200 bg-white text-slate-700 hover:bg-slate-100">Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" disabled={loadingAction !== null} onClick={() => {
              const action = confirmation;
              setConfirmation(null);
              if (action?.type === "revoke-link") handleRevokeShareLink(action.id, action.name);
              if (action?.type === "remove-access") handleRemoveAccess(action.id);
            }} className="bg-red-600 text-white hover:bg-red-700">{confirmation?.type === "revoke-link" ? "Revoke link" : "Remove access"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
};

export default AccessPanel;
