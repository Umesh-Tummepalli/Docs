import { FileText, MonitorX, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const DuplicateSession = () => {
  return (
    <main className="min-h-[calc(100vh-73px)] bg-gradient-to-b from-white via-slate-50 to-blue-50/40 px-6 py-10 font-sans">
      <div className="mx-auto flex min-h-[calc(100vh-153px)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">

          {/* Left — text content */}
          <section className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700 shadow-sm">
              <MonitorX className="h-4 w-4" />
              Document already open
            </div>

            <div className="space-y-5">
              <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                You already have this document open
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-slate-600">
                This document is already open in another tab or window. Close that session first, then reload this page to continue editing.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                onClick={() => window.location.reload()}
                className="h-12 bg-[#0b57d0] px-6 text-white shadow-sm transition-all hover:bg-[#0b57d0]/90"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </Button>
            </div>

            <Link
              to="/documents"
              className="inline-flex items-center text-sm font-semibold text-[#0b57d0] transition-colors hover:text-[#0b57d0]/90 hover:underline"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to documents
            </Link>
          </section>

          {/* Right — card */}
          <Card className="overflow-hidden border-slate-200 bg-white/90 shadow-xl shadow-slate-200/60 backdrop-blur">
            <CardHeader className="border-b border-slate-100 bg-slate-50/70 pb-6 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 ring-1 ring-amber-100">
                <MonitorX className="h-8 w-8" />
              </div>
              <CardTitle className="text-2xl text-slate-900">Duplicate session</CardTitle>
              <CardDescription className="text-slate-500">
                Only one active session per document is allowed at a time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-[#0b57d0]">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Why does this happen?</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      WriteFlow prevents the same document from being edited in two places simultaneously to avoid conflicting changes and data loss.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-[#0b57d0]">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">How to fix it</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Close the other tab or window that has this document open, then click <span className="font-medium text-slate-700">Try again</span> to reload.
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

export default DuplicateSession;
