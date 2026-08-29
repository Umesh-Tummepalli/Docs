import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock3, FolderOpen, Loader2, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '@/lib/api';

const accessSections = [
  { key: 'owner', heading: 'Owned by me', description: 'Documents you own', badgeClass: 'bg-blue-50 text-[#0b57d0] ring-blue-100', badgeLabel: 'Owner', previewClass: 'from-blue-100 via-white to-violet-100' },
  { key: 'write', heading: 'Can edit', description: 'Shared with you for editing', badgeClass: 'bg-violet-50 text-violet-700 ring-violet-100', badgeLabel: 'Can edit', previewClass: 'from-violet-100 via-white to-blue-100' },
  { key: 'read', heading: 'View only', description: 'Shared with you for viewing', badgeClass: 'bg-slate-100 text-slate-700 ring-slate-200', badgeLabel: 'Can view', previewClass: 'from-slate-200 via-white to-blue-50' },
];

const formatLastModified = (value) => {
  if (!value) return 'Recently modified';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently modified';
  const daysAgo = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (daysAgo === 0) return `Modified today, ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  if (daysAgo === 1) return 'Modified yesterday';
  return `Modified ${date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

const PaperPreview = ({ className = '' }) => (
  <div className={`relative h-32 overflow-hidden bg-gradient-to-br ${className}`}>
    <div className="absolute left-1/2 top-5 h-32 w-24 -translate-x-1/2 rounded-sm bg-white p-3 shadow-md shadow-slate-400/20 transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-lg">
      <div className="h-2 w-3/4 rounded-full bg-slate-300" />
      <div className="mt-3 space-y-1.5"><div className="h-1.5 rounded-full bg-slate-100" /><div className="h-1.5 w-5/6 rounded-full bg-slate-100" /><div className="h-1.5 rounded-full bg-slate-100" /><div className="h-1.5 w-2/3 rounded-full bg-slate-100" /></div>
    </div>
  </div>
);

const DocumentCard = ({ document, section }) => (
  <Link to={`/documents/${document.documentId}`} className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-100/60 focus:outline-none focus:ring-2 focus:ring-blue-300">
    <PaperPreview className={section.previewClass} />
    <div className="p-4">
      <div className="flex items-start justify-between gap-3"><h3 className="min-w-0 flex-1 truncate font-semibold text-slate-800 transition-colors group-hover:text-[#0b57d0]" title={document.title}>{document.title || 'Untitled Document'}</h3><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${section.badgeClass}`}>{section.badgeLabel}</span></div>
      <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500"><Clock3 className="size-3.5" />{formatLastModified(document.lastModified)}</div>
    </div>
  </Link>
);

const DocumentLibrary = ({ documents, loading }) => {
  const allDocuments = Object.values(documents).flat();
  if (loading) return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{[...Array(4)].map((_, index) => <div key={index} className="h-52 animate-pulse rounded-xl bg-white/80 shadow-sm" />)}</div>;
  if (allDocuments.length === 0) return <div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 px-6 py-16 text-center shadow-sm"><div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-blue-50 text-[#0b57d0]"><FolderOpen className="size-7" /></div><h2 className="mt-5 text-lg font-semibold text-slate-800">No documents yet</h2><p className="mt-2 text-sm text-slate-500">Create a new document above to get started.</p></div>;
  return <div className="space-y-10">{accessSections.map((section) => {
    const sectionDocuments = documents[section.key] || [];
    if (sectionDocuments.length === 0) return null;
    return <section key={section.key}><div className="mb-4 flex items-end justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-900">{section.heading}</h2><p className="mt-1 text-sm text-slate-500">{section.description}</p></div><span className="text-sm font-medium text-slate-500">{sectionDocuments.length} {sectionDocuments.length === 1 ? 'file' : 'files'}</span></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{sectionDocuments.map((document) => <DocumentCard key={document.documentId} document={document} section={section} />)}</div></section>;
  })}</div>;
};

const Home = () => {
  const navigate = useNavigate();
  const [isCreating, setIsCreating] = useState(false);
  const [documents, setDocuments] = useState({ owner: [], write: [], read: [] });
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(true);

  const loadDocuments = async () => {
    try {
      setIsLoadingDocuments(true);
      const response = await api.get('/documents');
      setDocuments({ owner: [], write: [], read: [], ...(response.data?.documents || {}) });
    } catch (error) {
      if (error.response?.status === 401) { toast.error('Login to continue'); navigate('/login?from=%2Fdocuments'); }
      else toast.error(error.response?.data?.message || 'Unable to load your documents.');
    } finally { setIsLoadingDocuments(false); }
  };

  useEffect(() => { loadDocuments(); }, []);

  const handleCreateNewDocument = async () => {
    if (isCreating) return;
    setIsCreating(true);
    try {
      const response = await api.post('/documents/new', {});
      navigate(`/documents/${response.data.documentId}`);
    } catch (error) {
      if (error?.response?.status === 401) { navigate('/login?from=%2Fdocuments'); toast.error('Login to continue'); }
      else toast.error(error?.response?.data?.message || error.message || 'Something went wrong');
      setIsCreating(false);
    }
  };

  return <main className="relative min-h-[calc(100vh-73px)] overflow-hidden bg-gradient-to-b from-white via-slate-50 to-blue-50/60 px-5 py-10 sm:px-8 lg:px-12">
    <div className="pointer-events-none absolute -right-32 -top-36 size-96 rounded-full bg-blue-200/30 blur-3xl" /><div className="pointer-events-none absolute -bottom-40 -left-40 size-96 rounded-full bg-violet-200/30 blur-3xl" />
    <div className="relative mx-auto max-w-7xl">
      <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#0b57d0]">WriteFlow workspace</p><h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">My documents</h1><p className="mt-2 text-slate-600">Create, organise, and open your work.</p></div></div>
      <section className="mb-11 rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-lg shadow-slate-200/40 backdrop-blur sm:p-6"><div className="mb-5"><h2 className="text-base font-semibold text-slate-800">Start a new document</h2><p className="mt-1 text-sm text-slate-500">Choose a blank page and make it yours.</p></div><button type="button" onClick={handleCreateNewDocument} disabled={isCreating} className="group overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/70 disabled:cursor-wait disabled:opacity-70"><PaperPreview className="from-blue-100 via-white to-violet-100" /><div className="flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700">{isCreating ? <Loader2 className="size-4 animate-spin text-[#0b57d0]" /> : <Plus className="size-4 text-[#0b57d0]" />}{isCreating ? 'Creating document...' : 'Blank document'}</div></button></section>
      <DocumentLibrary documents={documents} loading={isLoadingDocuments} />
    </div>
  </main>;
};

export default Home;
