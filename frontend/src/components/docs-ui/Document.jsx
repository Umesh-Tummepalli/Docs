import { useEffect, useState,useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import api from "@/lib/api";
import Editor from "./Editior";
import ToolBar from "./ToolBar";
import Ruler from "./Ruler";
import EditorContext from "./context/EditorContext";
import AccessDenied from "./AccessDenied";
import Loading from "./Loading";
import DocumentNotFound from "./DocumentNotFound";
import AccessPanel from "./AccessPanel";
import useYDoc, { YDocProvider } from "./context/YDocContext";
import { useEditor } from "@tiptap/react";
import { editorConfig } from "./editorConfig";
import * as Y from "yjs";

const EditorView = ({ docData, docId }) => {
  const { yDoc, metadata } = useYDoc();
  const timer = useRef(null);
  const [hydrated, setHydrated] = useState(false);
  yDoc.on('update', () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const response = api.post(`/documents/${docId}/save`, Y.encodeStateAsUpdate(yDoc), {
        headers: {
        "Content-Type": "application/octet-stream",
        },
      });
      console.log(response);

      toast.success("Document saved");
    },5000);
  });
  useEffect(() => {
    if (!docData) return;
    const bytes = new Uint8Array(docData);
    Y.applyUpdate(yDoc, bytes);
    setHydrated(true);
  }, [docData,yDoc]);

  const editor = useEditor(
    editorConfig(yDoc),
    [yDoc]
  );

  if (!hydrated || !editor) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen mt-4">
      <EditorContext.Provider value={editor}>
        <ToolBar />
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
  
  const fetchContent = async () => {
    setStatus("loading");
    try {
      const response = await api.get(`/documents/${docId}`);
      setDocData(response?.data?.document?.content);
      setStatus("ready");
    }
    catch (error) {
      console.error(error.response);
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
    fetchContent();
  }, [docId, navigate]);

  let documentView;

  if (status === "loading") {
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
        <YDocProvider>
          <EditorView docData={docData} docId={docId} />
        </YDocProvider>
      </div>
    );
  }

  return documentView;
}
