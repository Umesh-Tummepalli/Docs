import React, { useState } from 'react';
import { Users, Check, X, Shield, Eye, Edit3, Loader2, UserPlus, Clock } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "react-toastify";
import api from '@/lib/api';

const AccessPanel = ({ docId, accessList = [], accessRequests = [], onUpdate }) => {
  const [loadingAction, setLoadingAction] = useState(null);

  const handleApprove = async (requestId) => {
    try {
      setLoadingAction(`approve-${requestId}`);
      await api.post(`/documents/${docId}/access-request/approve`, { requestId });
      toast.success("Access request approved");
      if (onUpdate) onUpdate();
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
      if (onUpdate) onUpdate();
    } finally {
      setLoadingAction(null);
    }
  };

  const getRoleIcon = (level) => {
    switch (level) {
      case 'owner': return <Shield className="w-3.5 h-3.5 text-amber-500" />;
      case 'write': return <Edit3 className="w-3.5 h-3.5 text-blue-500" />;
      case 'read': return <Eye className="w-3.5 h-3.5 text-slate-500" />;
      default: return null;
    }
  };

  const getRoleBadgeColor = (level) => {
    switch (level) {
      case 'owner': return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100";
      case 'write': return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
      case 'read': return "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100";
      default: return "";
    }
  };

  const getRoleLabel = (level) => {
    switch (level) {
      case 'owner': return 'Owner';
      case 'write': return 'Can edit';
      case 'read': return 'Can view';
      default: return level;
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-9 w-9 rounded-full hover:bg-slate-100 transition-all duration-200 relative group"
        >
          <Users className="h-4.5 w-4.5 text-slate-600 group-hover:text-slate-900 transition-colors" />
          {accessRequests.length > 0 && (
            <>
              <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white animate-pulse" />
              <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
                {accessRequests.length}
              </span>
            </>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-md p-0 overflow-y-auto bg-slate-50/50">
        <div className="p-6 bg-white border-b border-slate-200">
          <SheetHeader className="space-y-1.5">
            <SheetTitle className="text-xl font-semibold text-slate-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-600" />
              Manage Access
            </SheetTitle>
            <SheetDescription className="text-sm text-slate-500">
              Control who can view and edit this document.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="p-6 space-y-8">
          {/* Pending Requests Section */}
          {accessRequests.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Pending Requests
                </h3>
                <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200 font-medium">
                  {accessRequests.length} pending
                </Badge>
              </div>
              
              <div className="space-y-3">
                {accessRequests.map((request) => (
                  <div 
                    key={request._id} 
                    className="group flex items-center justify-between p-4 rounded-xl border border-amber-100 bg-amber-50/50 hover:bg-amber-50 transition-all duration-200 hover:shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-amber-700 font-semibold text-sm flex-shrink-0">
                          {request.userId?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {request.userId?.username || 'Unknown User'}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {request.userId?.email || 'No email'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 ml-10">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-600">
                          {getRoleIcon(request.accessLevel)}
                          <span className="capitalize">{getRoleLabel(request.accessLevel)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-1.5 ml-3">
                      <Button 
                        size="sm" 
                        onClick={() => handleApprove(request._id)}
                        disabled={loadingAction !== null}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white h-8 px-3.5 text-xs font-medium shadow-sm hover:shadow transition-all duration-200"
                      >
                        {loadingAction === `approve-${request._id}` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Check className="w-3.5 h-3.5" />
                        )}
                        <span className="ml-1">Approve</span>
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleDeny(request._id)}
                        disabled={loadingAction !== null}
                        className="h-8 px-3.5 text-xs font-medium border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-all duration-200"
                      >
                        {loadingAction === `deny-${request._id}` ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <X className="w-3.5 h-3.5" />
                        )}
                        <span className="ml-1">Deny</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Separator className="my-6" />
            </div>
          )}

          {/* Current Access List Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-sm text-slate-700 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-500" />
                People with access
              </h3>
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-medium">
                {accessList.length} {accessList.length === 1 ? 'person' : 'people'}
              </Badge>
            </div>
            
            <div className="space-y-2">
              {accessList.map((access) => (
                <div 
                  key={access._id} 
                  className="group flex items-center justify-between p-3 rounded-lg hover:bg-white hover:shadow-sm transition-all duration-200 border border-transparent hover:border-slate-200"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                      {access.userId?.username?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {access.userId?.username || 'Unknown User'}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {access.userId?.email || 'No email'}
                      </p>
                    </div>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`${getRoleBadgeColor(access.accessLevel)} border px-3 py-1 text-xs font-medium capitalize flex-shrink-0 ml-2`}
                  >
                    {getRoleLabel(access.accessLevel)}
                  </Badge>
                </div>
              ))}
              
              {accessList.length === 0 && (
                <div className="text-center py-8 px-4">
                  <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Users className="w-6 h-6 text-slate-400" />
                  </div>
                  <p className="text-sm text-slate-500">No users have access yet</p>
                  <p className="text-xs text-slate-400 mt-1">Share this document to get started</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default AccessPanel;