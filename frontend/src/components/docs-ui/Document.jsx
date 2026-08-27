import { useCallback, useEffect, useState, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "@/lib/api";
import Editor from "./Editior";import ToolBar from "./ToolBar";
import Ruler from "./Ruler";
import EditorContext from "./context/EditorContext";
import AccessDenied from "./AccessDenied";
import Loading from "./Loading";
import DocumentNotFound from "./DocumentNotFound";
import AccessPanel from "./AccessPanel";
import { Button } from "@/components/ui/button";
import { Edit3, Loader2 } from "lucide-react";
import useYDoc, { YDocProvider } from "./context/YDocContext";
import { useEditor } from "@tiptap/react";
import { editorConfig } from "./editorConfig";
import { uploadImageFile } from "./extensions/imageUpload";

const EditorView = ({ docId, editable }) => {
  // provider is the SocketIOYProvider instance — it exposes provider.awareness.
  // It is null until the collab token is fetched and connect() is called.
  const { yDoc, provider, synced } = useYDoc();
  const editorRef = useRef(null);

  const handleImagePaste = useCallback((file) => {
    const editor = editorRef.current;
    if (!editor) return;
    uploadImageFile(editor, docId, file).catch((error) => {
      toast.error(error.response?.data?.message || error.message || "Image upload failed. Please try again.");
      console.error(error);
    });
  }, [docId]);

  // useEditor must always receive a valid config object — passing null crashes
  // TipTap 3.x during the initial useState call (reads immediatelyRender off it).
  // Instead, always pass a real config. editorConfig handles the provider being
  // null by simply omitting CollaborationCaret from the extensions list.
  // The loading guard below (!synced || !provider || !editor) still prevents the
  // editor from being shown until the provider is live.
  const editor = useEditor(
    editorConfig(yDoc, provider, editable, handleImagePaste),
    [yDoc, provider, editable, handleImagePaste]
  );

  useEffect(() => {
    editorRef.current = editor;
    return () => { editorRef.current = null; };
  }, [editor]);

  // Explicitly sync the editable state whenever it changes or the editor is (re)created.
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(editable);
  }, [editor, editable]);

  // Wait for socket docSync and a live provider before showing the editor.
  if (!synced || !provider || !editor) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen mt-4">
      <EditorContext.Provider value={editor}>
        {editable && <ToolBar />}
        <Ruler />
        <Editor />
      </EditorContext.Provider>
    </div>
  );
};

export default function Document() {
  const { docId } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [docData, setDocData] = useState(null);
  const [isRequestingWrite, setIsRequestingWrite] = useState(false);
  const [title, setTitle] = useState("");
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const titleInputRef = useRef(null);

  const fetchContent = useCallback(async ({ showLoading = true } = {}) => {
    if (showLoading) setStatus("loading");
    try {
      const response = await api.get(`/documents/${docId}`);
      setDocData(response?.data?.document);
      setTitle(response?.data?.document?.title || "Untitled Document");
      setStatus("ready");
      return true;
    } catch (error) {
      const statusCode = error.response?.status;
      if (statusCode === 401) {
        toast.error("Login to continue");
        return navigate("/login");
      } else if (statusCode === 404) {
        setStatus("not-found");
      } else if (statusCode === 403) {
        toast.error("Access denied");
        setStatus("access-denied");
      } else {
        toast.error("Something went wrong");
        navigate("/doc");
      }
      console.error(error);
      return false;
    }
  }, [docId, navigate]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  const requestWriteAccess = async () => {
    try {
      setIsRequestingWrite(true);
      const response = await api.post(`/documents/${docId}/access-request`, { accessLevel: "write" });
      toast.success(response.data?.message || "Write-access request sent to the owner.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to request write access.");
    } finally {
      setIsRequestingWrite(false);
    }
  };

  const saveTitle = async () => {
    const nextTitle = title.trim();
    if (!nextTitle) {
      toast.error('Document title cannot be empty.');
      setTitle(docData?.title || 'Untitled Document');
      setIsEditingTitle(false);
      return;
    }

    if (nextTitle === docData?.title) {
      setIsEditingTitle(false);
      return;
    }

    try {
      setIsSavingTitle(true);
      const response = await api.patch(`/documents/${docId}/title`, { title: nextTitle });
      const savedTitle = response.data?.title || nextTitle;
      setTitle(savedTitle);
      setDocData((current) => current ? { ...current, title: savedTitle } : current);
      toast.success('Document title updated');
    } catch (error) {
      setTitle(docData?.title || 'Untitled Document');
      toast.error(error.response?.data?.message || 'Unable to update document title.');
    } finally {
      setIsSavingTitle(false);
      setIsEditingTitle(false);
    }
  };

  const cancelEditingTitle = () => {
    setTitle(docData?.title || 'Untitled Document');
    setIsEditingTitle(false);
  };

  if (status === "loading") {
    return <Loading />;
  }
  if (status === "access-denied") {
    return <AccessDenied docId={docId} />;
  }
  if (status === "not-found") {
    return <DocumentNotFound />;
  }

  return (
    <div className="bg-[#f9fbfd]">
      <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
        <div className="min-w-0 flex-1">
          {docData?.accessLevel === 'owner' ? (
            <input
              ref={titleInputRef}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onFocus={() => setIsEditingTitle(true)}
              onBlur={saveTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') event.currentTarget.blur();
                if (event.key === 'Escape') cancelEditingTitle();
              }}
              disabled={isSavingTitle}
              maxLength={200}
              aria-label="Document title"
              className={`w-full max-w-xl rounded-md border border-transparent bg-transparent px-2 py-1 text-xl font-medium text-slate-800 outline-none transition-colors hover:border-slate-200 hover:bg-white focus:border-blue-300 focus:bg-white focus:ring-2 focus:ring-blue-100 ${isSavingTitle ? 'cursor-wait opacity-70' : 'cursor-text'} ${isEditingTitle ? 'border-blue-300 bg-white ring-2 ring-blue-100' : ''}`}
              title="Click to rename document"
            />
          ) : (
            <h1 className="truncate px-2 py-1 text-xl font-medium text-slate-800">{docData?.title || 'Untitled Document'}</h1>
          )}
        </div>
        <div className="flex items-center gap-2">
          {docData?.accessLevel === "read" && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={requestWriteAccess}
              disabled={isRequestingWrite}
              className="border-blue-200 text-[#0b57d0] hover:bg-blue-50 hover:text-[#0b57d0]"
            >
              {isRequestingWrite ? <Loader2 className="mr-1.5 size-4 animate-spin" /> : <Edit3 className="mr-1.5 size-4" />}
              Ask for write access
            </Button>
          )}
          {docData?.accessLevel === "owner" && (
          <AccessPanel
            docId={docId}
            accessList={docData.accessList}
            accessRequests={docData.accessRequests}
            onUpdate={() => fetchContent({ showLoading: false })}
          />
          )}
        </div>
      </div>
      <YDocProvider docId={docId}>
        <EditorView
          docId={docId}
          editable={["owner", "write"].includes(docData?.accessLevel)}
        />
      </YDocProvider>
    </div>
  );
}
