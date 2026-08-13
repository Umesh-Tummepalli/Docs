import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { useEditor } from "@tiptap/react";
import api from "@/lib/api";
import Editor from "./Editior";
import ToolBar from "./ToolBar";
import Ruler from "./Ruler";
import EditorContext from "./context/EditorContext";
import { editorConfig } from "./editorConfig";
import AccessDenied from "./AccessDenied";
import Loading from "./Loading";
import DocumentNotFound from "./DocumentNotFound";
import AccessPanel from "./AccessPanel";

export default function Document() {
  const { docId } = useParams();
  const editor = useEditor(editorConfig);
  const navigate = useNavigate();
  const [status, setStatus] = useState("loading");
  const [docData, setDocData] = useState(null);

  const fetchContent = async () => {
    setStatus("loading");
    try {
      const response = await api.get(`/documents/${docId}`);
      editor.commands.setContent(response?.data?.document?.content || "");
      setDocData(response?.data?.document);
      setStatus("ready");
    }
    catch (error) {
      const statusCode = error.response?.status;

      if (statusCode === 401) {
        toast.error("login to continue");
        navigate('/login');
      }
      else if (statusCode === 404) {
        setStatus("not-found");
      }
      else if (statusCode === 403) {
        toast.error("access denied");
        setStatus("access-denied");
      }
      else {
        toast.error("something went wrong");
        navigate('/doc');
        setStatus("error");
      }
      console.error(error);
    }
  };

  useEffect(() => {
    if (!editor) return;
    fetchContent();
  }, [docId, editor, navigate]);

  let documentView;

  if (status === "loading" || !editor) {
    documentView = <Loading />;
  }
  else if (status === "access-denied") {
    documentView = <AccessDenied docId={docId} />;
  }
  else if (status === "not-found") {
    documentView = <DocumentNotFound />;
  }
  else {
    documentView = (
      <div className="bg-[#f9fbfd]">
        <div className="flex items-center justify-between px-6 py-3 border-b border-slate-200">
          <h1 className="text-xl font-medium text-slate-800">{docData?.title || 'Untitled Document'}</h1>
          {docData?.accessLevel === 'owner' && (
            <AccessPanel 
              docId={docId} 
              accessList={docData.accessList} 
              accessRequests={docData.accessRequests} 
              onUpdate={fetchContent} 
            />
          )}
        </div>
        <div className="min-h-screen mt-4">
          <EditorContext.Provider value={editor}>
            <ToolBar />
            <Ruler />
            <Editor />
          </EditorContext.Provider>
        </div>
      </div>
    );
  }

  return documentView;
}
