import { createContext, useContext, useState } from "react";
import * as Y from "yjs";

const YDocContext = createContext(null);

export const YDocProvider = ({ children }) => {
  const [yDoc] = useState(() => new Y.Doc());
  const metadata = yDoc.getMap('metadata');
  return (
    <YDocContext.Provider value={{ yDoc, metadata }}>
      {children}
    </YDocContext.Provider>
  );
};


const useYDoc = () => {
  const context = useContext(YDocContext);

  if (!context) {
    throw new Error("useYDoc must be used within a YDocProvider");
  }

  return context;
};

export default useYDoc;