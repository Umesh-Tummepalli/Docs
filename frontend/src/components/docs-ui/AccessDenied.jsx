import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowLeft, Edit3, Eye, FileLock2, Loader2, Send } from 'lucide-react';
import { toast } from 'react-toastify';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';

const AccessDenied = ({ docId }) => {
  const [isRequesting, setIsRequesting] = useState(false);

  const handleRequestAccess = async () => {
    try {
      setIsRequesting(true);
      const response = await api.post(`/documents/${docId}/access-request`, { accessLevel: 'read' });
      toast.success(response.data?.message || 'Access request sent to the document owner.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Unable to request access.');
    } finally {
      setIsRequesting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-73px)] bg-gradient-to-b from-white via-slate-50 to-blue-50/40 px-6 py-10 font-sans">
      <div className="mx-auto flex min-h-[calc(100vh-153px)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-[#0b57d0] shadow-sm">
              <FileLock2 className="h-4 w-4" />
              Document access required
            </div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                You need permission to open this document
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                This WriteFlow document is private. Ask the owner for access and they can choose whether you can view or edit it.
              </p>
            </div>

            {docId && (
              <div className="max-w-2xl rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Document ID</p>
                <p className="mt-1 break-all font-mono text-sm text-slate-700">{docId}</p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={handleRequestAccess}
                disabled={isRequesting}
                className="h-12 bg-[#0b57d0] px-6 text-white shadow-sm transition-all hover:bg-[#0b57d0]/90"
              >
                {isRequesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Ask for access
              </Button>
            </div>

            <Link to="/documents" className="inline-flex items-center text-sm font-semibold text-[#0b57d0] transition-colors hover:text-[#0b57d0]/90 hover:underline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to documents
            </Link>
          </section>

          <Card className="overflow-hidden border-slate-200 bg-white/90 shadow-xl shadow-slate-200/60 backdrop-blur">
            <CardHeader className="border-b border-slate-100 bg-slate-50/70 pb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 text-red-600 ring-1 ring-red-100">
                <AlertTriangle className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl text-slate-900">Access denied</CardTitle>
              <CardDescription className="text-slate-500">
                Your account does not currently have permission for this file.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-[#0b57d0]">
                    <Eye className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">View access</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Request access to open and read this document when the owner approves it.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-[#0b57d0]">
                    <Edit3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Write access</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Ask for editing permission if you need to collaborate, update content, or make changes.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default AccessDenied;
