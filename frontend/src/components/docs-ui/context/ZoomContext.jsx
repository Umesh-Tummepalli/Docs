import { createContext, useContext, useState, useEffect, useCallback } from "react";

const ZoomContext = createContext();

export const useZoom = () => {
  const context = useContext(ZoomContext);
  if (!context) {
    throw new Error("useZoom must be used within a ZoomProvider");
  }
  return context;
};

export const ZoomProvider = ({ children }) => {
  const [zoom, setZoom] = useState(100);

  // Apply zoom to the document-page element and ruler
  useEffect(() => {
    const scale = zoom / 100;

    // Set CSS variable for zoom scale so Ruler can use it
    document.documentElement.style.setProperty('--document-zoom', scale);

    const docPage = document.querySelector(".document-page");
    if (docPage) {
      docPage.style.transform = `scale(${scale})`;
      docPage.style.transformOrigin = "top center";
      // Adjust the wrapper height to prevent overflow/gaps
      const wrapper = docPage.parentElement;
      if (wrapper) {
        wrapper.style.height = `${docPage.scrollHeight * scale}px`;
      }
    }

    // Also scale the ruler
    const ruler = document.querySelector(".document-ruler");
    if (ruler) {
      ruler.style.transform = `scale(${scale})`;
      ruler.style.transformOrigin = "top center";
    }
  }, [zoom]);

  const updateZoom = useCallback((newZoom) => {
    const zoomValue = Math.max(25, Math.min(400, parseInt(newZoom, 10)));
    if (!isNaN(zoomValue)) {
      setZoom(zoomValue);
    }
  }, []);

  const zoomIn = useCallback((step = 10) => {
    setZoom((current) => Math.min(400, current + step));
  }, []);

  const zoomOut = useCallback((step = 10) => {
    setZoom((current) => Math.max(25, current - step));
  }, []);

  return (
    <ZoomContext.Provider value={{ zoom, updateZoom, zoomIn, zoomOut }}>
      {children}
    </ZoomContext.Provider>
  );
};

export default ZoomContext;
