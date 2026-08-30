import { useCallback, useRef, useState } from "react";
import {

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

    if (!window.confirm(`Revoke ${name || "this"} share link? Anyone using it will immediately lose access.`)) {
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

  const handleGrantOwner = async (userId) => {
    try {
      setLoadingAction(`owner-${userId}`);
      await api.post(`/documents/${docId}/access/owner`, { userId });
      toast.success("Owner access granted");
      onUpdate?.();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to grant owner access");
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

  const getRoleBadgeColor = (level) => {
    if (level === "owner") return "bg-amber-50 text-amber-700 border-amber-200";
    if (level === "write") return "bg-blue-50 text-blue-700 border-blue-200";
    return "bg-slate-50 text-slate-700 border-slate-200";
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
            {isLoadingTokens ? <div className="flex items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-7 text-sm text-slate-500"><Loader2 className="mr-2 size-4 animate-spin" />Loading links</div> : accessTokens.length > 0 ? <div className="space-y-2">{accessTokens.map((item, index) => { const level = getAccessLevel(item); const token = getTokenValue(item); const accessTokenId = item?._id || item?.id; const linkName = item?.name || item?.label || getRoleLabel(level); return <div key={accessTokenId || token || index} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm"><span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${level === "write" ? "bg-blue-50" : "bg-slate-100"}`}>{getRoleIcon(level)}</span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-800">{linkName} link</p><p className="truncate text-xs text-slate-500">{token ? getShareUrl(token) : "Link token unavailable"}</p></div><div className="flex shrink-0 items-center"><Button type="button" size="icon" variant="ghost" disabled={!token} onClick={() => copyToClipboard(getShareUrl(token))} className="size-8 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Copy className="size-4" /><span className="sr-only">Copy {getRoleLabel(level)} link</span></Button><Button type="button" size="icon" variant="ghost" disabled={!accessTokenId || loadingAction !== null} onClick={() => handleRevokeShareLink(accessTokenId, linkName)} className="size-8 text-slate-400 hover:bg-red-50 hover:text-red-600"><span className="sr-only">Revoke {linkName} link</span>{loadingAction === `revoke-${accessTokenId}` ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}</Button></div></div>; })}</div> : <div className="rounded-xl border border-dashed border-slate-200 bg-white px-5 py-7 text-center"><LinkIcon className="mx-auto mb-2 size-5 text-slate-400" /><p className="text-sm font-medium text-slate-600">No share links yet</p><p className="mt-1 text-xs text-slate-400">Create a view or edit link above.</p></div>}
          </section>

          {accessRequests.length > 0 && <><Separator /><section className="space-y-3"><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Clock className="size-4 text-amber-500" />Pending requests</h3><Badge className="border-amber-200 bg-amber-50 text-amber-700" variant="outline">{accessRequests.length}</Badge></div><div className="space-y-3">{accessRequests.map((request) => <div key={request._id} className="rounded-xl border border-amber-100 bg-amber-50/50 p-4"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-full bg-amber-100 font-semibold text-amber-700">{request.userId?.username?.charAt(0).toUpperCase() || "?"}</div><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900">{request.userId?.username || "Unknown user"}</p><p className="truncate text-xs text-slate-500">{request.userId?.email || "No email"}</p></div></div><div className="mt-3 flex gap-2"><Button size="sm" onClick={() => handleApprove(request._id, "read")} disabled={loadingAction !== null} className="flex-1 bg-emerald-600 hover:bg-emerald-700">{loadingAction === `approve-${request._id}-read` ? <Loader2 className="size-3.5 animate-spin" /> : <><Eye className="mr-1 size-3.5" />View</>}</Button><Button size="sm" onClick={() => handleApprove(request._id, "write")} disabled={loadingAction !== null} className="flex-1 bg-blue-600 hover:bg-blue-700">{loadingAction === `approve-${request._id}-write` ? <Loader2 className="size-3.5 animate-spin" /> : <><Edit3 className="mr-1 size-3.5" />Edit</>}</Button><Button size="icon" variant="outline" onClick={() => handleDeny(request._id)} disabled={loadingAction !== null} className="size-9 border-red-200 text-red-600 hover:bg-red-50">{loadingAction === `deny-${request._id}` ? <Loader2 className="size-3.5 animate-spin" /> : <X className="size-4" />}<span className="sr-only">Deny request</span></Button></div></div>)}</div></section></>}

          <Separator />
          <section className="space-y-3"><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800"><UserPlus className="size-4 text-blue-500" />People with access</h3><Badge variant="secondary" className="bg-slate-200/70 text-slate-600">{accessList.length}</Badge></div>{accessList.length > 0 ? <div className="space-y-2">{accessList.map((access) => <div key={access._id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"><div className="flex min-w-0 items-center gap-3"><div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">{access.userId?.username?.charAt(0).toUpperCase() || "?"}</div><div className="min-w-0"><p className="truncate text-sm font-medium text-slate-900">{access.userId?.username || "Unknown user"}</p><p className="truncate text-xs text-slate-500">{access.userId?.email || "No email"}</p></div></div><div className="flex shrink-0 items-center gap-2">{access.accessLevel !== "owner" && <Button type="button" size="sm" variant="outline" onClick={() => handleGrantOwner(access.userId?._id || access.userId)} disabled={loadingAction !== null} className="h-7 border-amber-200 px-2 text-xs text-amber-700 hover:bg-amber-50">{loadingAction === `owner-${access.userId?._id || access.userId}` ? <Loader2 className="size-3 animate-spin" /> : <><Shield className="mr-1 size-3" />Owner</>}</Button>}<Badge variant="outline" className={getRoleBadgeColor(access.accessLevel)}>{getRoleLabel(access.accessLevel)}</Badge></div></div>)}</div> : <p className="rounded-xl border border-dashed border-slate-200 bg-white py-6 text-center text-sm text-slate-500">No people have access yet.</p>}</section>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AccessPanel;
