import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Clock3, Eye, FilePenLine, Loader2, MoreVertical, Plus, Trash2, UserRound } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '@/lib/api';

const accessSections = [
  { key: 'owner', heading: 'Owned by me', description: 'Documents you own', icon: UserRound, badgeClass: 'bg-blue-50 text-[#0b57d0] ring-blue-100', badgeLabel: 'Owner', previewClass: 'from-blue-100 via-white to-violet-100' },
  { key: 'write', heading: 'Can edit', description: 'Shared with you for editing', icon: FilePenLine, badgeClass: 'bg-violet-50 text-violet-700 ring-violet-100', badgeLabel: 'Can edit', previewClass: 'from-violet-100 via-white to-blue-100' },
  { key: 'read', heading: 'View only', description: 'Shared with you for viewing', icon: Eye, badgeClass: 'bg-slate-100 text-slate-700 ring-slate-200', badgeLabel: 'Can view', previewClass: 'from-slate-200 via-white to-blue-50' },
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
  <div className={`relative h-36 overflow-hidden bg-gradient-to-br ${className}`}>
    <div className="absolute inset-x-5 top-5 h-24 rounded-xl border border-white/70 bg-white/45 shadow-inner shadow-white/80" />
    <div className="absolute left-1/2 top-7 h-32 w-28 -translate-x-1/2 rotate-[-3deg] rounded-lg border border-slate-200/80 bg-white p-3.5 shadow-xl shadow-slate-400/20 transition-transform duration-500 group-hover:-translate-y-2 group-hover:rotate-0 group-hover:shadow-2xl">
      <div className="mb-3 flex items-center gap-1.5">
        <div className="size-2 rounded-full bg-blue-300" />
        <div className="h-1.5 w-12 rounded-full bg-slate-200" />
      </div>
      <div className="h-2 w-4/5 rounded-full bg-slate-300" />
      <div className="mt-4 flex flex-col gap-2">
        <div className="h-1.5 rounded-full bg-slate-100" />
        <div className="h-1.5 w-5/6 rounded-full bg-slate-100" />
        <div className="h-1.5 rounded-full bg-slate-100" />
        <div className="h-1.5 w-2/3 rounded-full bg-slate-100" />
      </div>
    </div>
    <div className="absolute -right-6 -top-8 size-24 rounded-full bg-white/35 blur-2xl" />
  </div>
);

const DocumentCard = ({ document, section, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef(null);

  const isOwner = section.key === 'owner';
  const CardSurface = isDeleting ? 'div' : Link;

  // Close menu when clicking outside
  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleMenuToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setMenuOpen((prev) => !prev);
  };

  const handleDelete = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isDeleting) return;
    setMenuOpen(false);
    setIsDeleting(true);
    try {
      await api.delete(`/documents/${document.documentId}`);
      toast.success('Document deleted');
      onDelete(document.documentId);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete document');
      setIsDeleting(false);
    }
  };

  return (
    <div className="relative motion-safe:animate-[document-enter_450ms_ease-out_both]" aria-busy={isDeleting}>
      <CardSurface
        {...(isDeleting ? {} : { to: `/documents/${document.documentId}` })}
        onClick={(event) => { if (isDeleting) event.preventDefault(); }}
        aria-disabled={isDeleting}
        tabIndex={isDeleting ? -1 : 0}
        className={`group block overflow-hidden rounded-[1.35rem] border border-slate-200/80 bg-white shadow-[0_8px_30px_-18px_rgba(30,64,175,0.35)] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-4 motion-reduce:transition-none ${isDeleting ? 'pointer-events-none select-none opacity-40' : 'hover:-translate-y-1.5 hover:border-blue-200 hover:shadow-[0_20px_40px_-20px_rgba(37,99,235,0.45)]'}`}
      >
        <PaperPreview className={section.previewClass} />
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h3
              className="min-w-0 flex-1 truncate font-semibold text-slate-800 transition-colors group-hover:text-[#0b57d0]"
              title={document.title}
            >
              {document.title || 'Untitled Document'}
            </h3>
            <span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ring-1 ${section.badgeClass}`}>
              {section.badgeLabel}
            </span>
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
            <Clock3 className="size-3.5" />
            {formatLastModified(document.lastModified)}
          </div>
        </div>
      </CardSurface>

      {isDeleting && (
        <div className="absolute inset-0 z-20 flex cursor-wait flex-col items-center justify-center gap-3 rounded-2xl bg-white/60 backdrop-blur-[2px]" role="status" aria-live="polite">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-white text-[#0b57d0] shadow-lg shadow-blue-100/60 ring-1 ring-blue-100">
            <Loader2 className="size-6 motion-safe:animate-spin" aria-hidden="true" />
          </span>
          <span className="text-sm font-semibold text-slate-700">Deleting document…</span>
          <span className="sr-only">{document.title || 'Untitled Document'}</span>
        </div>
      )}

      {/* 3-dot menu — only for owner documents */}
      {isOwner && (
        <div ref={menuRef} className="absolute right-3 top-3 z-10" onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setMenuOpen(false);
            menuRef.current?.querySelector('button')?.focus();
          }
        }}>
          <button
            type="button"
            onClick={handleMenuToggle}
            disabled={isDeleting}
            aria-label={`Options for ${document.title || 'Untitled Document'}`}
            aria-expanded={menuOpen}
            className="flex items-center justify-center rounded-lg bg-white/90 p-1.5 text-slate-500 shadow-sm ring-1 ring-slate-200/80 backdrop-blur-sm transition-all hover:bg-white hover:text-slate-800 hover:shadow-md disabled:cursor-wait disabled:opacity-50"
          >
            {isDeleting
              ? <Loader2 className="size-4 animate-spin" />
              : <MoreVertical className="size-4" />
            }
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 min-w-[140px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl shadow-slate-200/60">
              <button
                type="button"
                onClick={handleDelete}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
              >
                <Trash2 className="size-4" />
                Delete
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const CreateDocumentCard = ({ isCreating, onCreate, disabled = false }) => (
  <button
    type="button"
    onClick={onCreate}
    disabled={isCreating || disabled}
    aria-busy={isCreating}
    className="group relative flex min-h-56 flex-col items-center justify-center gap-4 overflow-hidden rounded-2xl border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50/80 via-white to-violet-50/70 px-5 py-8 text-center transition-all duration-300 hover:-translate-y-1 hover:border-blue-400 hover:shadow-lg hover:shadow-blue-100/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-4 disabled:transform-none disabled:cursor-wait motion-reduce:transition-none"
  >
    {isCreating && <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-100/70 to-transparent motion-safe:animate-[document-shimmer_1.8s_infinite]" />}
    <span className="relative flex size-14 items-center justify-center rounded-2xl bg-white text-[#0b57d0] shadow-sm ring-1 ring-blue-100 transition-transform duration-300 group-hover:scale-110 motion-reduce:transform-none">
      {isCreating ? <Loader2 className="size-6 motion-safe:animate-spin" aria-hidden="true" /> : <Plus className="size-6" aria-hidden="true" />}
    </span>
    <span className="relative flex flex-col gap-1.5" role="status">
      <span className="text-sm font-semibold text-[#0b57d0]">{isCreating ? 'Creating your document…' : 'Create new document'}</span>
      <span className="text-xs text-slate-500">{isCreating ? 'Getting a fresh page ready for you' : 'A blank page. Endless possibilities.'}</span>
    </span>
  </button>
);

const DocumentLibrary = ({ documents, loading, onDelete, onCreate, isCreating }) => {

  if (loading) {
    return (
      <section aria-busy="true" aria-label="Loading documents">
        <div className="mb-5 flex items-center gap-2 text-sm text-slate-500" role="status">
          <Loader2 className="size-4 motion-safe:animate-spin text-[#0b57d0]" aria-hidden="true" />
          Bringing your workspace together…
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-5">
          <CreateDocumentCard isCreating={isCreating} onCreate={onCreate} disabled />
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} aria-hidden="true" className="relative min-h-56 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="h-32 bg-gradient-to-br from-blue-50 to-violet-50" />
              <div className="flex flex-col gap-3 p-4">
                <div className="h-3 w-2/3 rounded-full bg-slate-100" />
                <div className="h-2 w-1/2 rounded-full bg-slate-100" />
              </div>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/80 to-transparent motion-safe:animate-[document-shimmer_1.8s_infinite]" style={{ animationDelay: `${index * 150}ms` }} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-10">
      {accessSections.map((section) => {
        const sectionDocuments = documents[section.key] || [];
        if (sectionDocuments.length === 0 && section.key !== 'owner') return null;
        return (
          <section key={section.key}>
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 items-center justify-center rounded-xl bg-white text-[#0b57d0] shadow-sm ring-1 ring-blue-100">
                    <section.icon className="size-4" aria-hidden="true" />
                  </span>
                  <h2 className="text-lg font-semibold text-slate-900">{section.heading}</h2>
                </div>
                <p className="mt-2 pl-10 text-sm text-slate-500">{section.description}</p>
              </div>
              <span className="text-sm font-medium text-slate-500">
                {sectionDocuments.length} {sectionDocuments.length === 1 ? 'file' : 'files'}
              </span>
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,17rem),1fr))] gap-5">
              {section.key === 'owner' && <CreateDocumentCard isCreating={isCreating} onCreate={onCreate} />}
              {sectionDocuments.map((doc) => (
                <DocumentCard
                  key={doc.documentId}
                  document={doc}
                  section={section}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
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
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  useEffect(() => { loadDocuments(); }, []);

  const handleDelete = (documentId) => {
    setDocuments((prev) => ({
      ...prev,
      owner: prev.owner.filter((doc) => doc.documentId !== documentId),
    }));
  };

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

  return (
    <main className="document-workspace relative min-h-screen overflow-hidden bg-gradient-to-b from-white via-slate-50 to-blue-50/60 px-5 py-10 sm:px-8 lg:px-12">
      <style>{`
        @keyframes document-shimmer {
          from { transform: translateX(-100%); }
          to { transform: translateX(100%); }
        }
        @keyframes document-enter {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .document-workspace *, .document-workspace *::before, .document-workspace *::after {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
      <div className="pointer-events-none absolute -right-32 -top-36 size-96 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 size-96 rounded-full bg-violet-200/30 blur-3xl" />
      <div className="relative mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-[#0b57d0]">WriteFlow workspace</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">My documents</h1>
            <p className="mt-2 text-slate-600">Create, organise, and open your work.</p>
          </div>
        </div>

        <DocumentLibrary
          documents={documents}
          loading={isLoadingDocuments}
          onDelete={handleDelete}
          onCreate={handleCreateNewDocument}
          isCreating={isCreating}
        />
      </div>
    </main>
  );
};

export default Home;
