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

  const fetchContent = useCallback(async () => {
    setStatus("loading");
    try {
      const response = await api.get(`/documents/${docId}`);
      setDocData(response?.data?.document);
      setStatus("ready");
    } catch (error) {
      const statusCode = error.response?.status;
      if (statusCode === 401) {
        toast.error("Login to continue");
        navigate("/login");
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
    }
  }, [docId, navigate]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

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
        <h1 className="text-xl font-medium text-slate-800">
          {docData?.title || "Untitled Document"}
        </h1>
        {docData?.accessLevel === "owner" && (
          <AccessPanel
            docId={docId}
            accessList={docData.accessList}
            accessRequests={docData.accessRequests}
            onUpdate={fetchContent}
          />
        )}
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
