import { FileText, Loader2 } from 'lucide-react';

const Loading = () => {
  return (
    <main className="flex min-h-[calc(100vh-73px)] items-center justify-center bg-gradient-to-b from-white to-slate-50 px-6 font-sans">
      <div className="flex flex-col items-center text-center">
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0b57d0] shadow-lg shadow-blue-200/70">
          <FileText className="h-8 w-8 text-white" />
        </div>
        <div className="flex items-center gap-3 text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin text-[#0b57d0]" />
          <p className="text-lg font-semibold">Loading document...</p>
        </div>
        <p className="mt-3 max-w-sm text-sm leading-6 text-slate-500">
          Checking access and preparing your WriteFlow document.
        </p>
      </div>
    </main>
  );
};

export default Loading;
