import { useState, useEffect, useRef } from 'react';
import { useEditorContext } from '../context/EditorContext';
import { ExternalLink } from 'lucide-react';

const LinkTooltip = () => {
  const editor = useEditorContext();
  const [hoveredLink, setHoveredLink] = useState(null);
  const hideTimeoutRef = useRef(null);

  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;

    const handleMouseOver = (e) => {
      const target = e.target;
      const anchor = target.closest('a');
      
      if (anchor) {
        clearTimeout(hideTimeoutRef.current);
        const rect = anchor.getBoundingClientRect();
        setHoveredLink(prev => {
          // Avoid state updates if it's the same link to prevent flickering
          if (prev && prev.href === anchor.href && prev.top === rect.bottom && prev.left === rect.left) {
            return prev;
          }
          return {
            href: anchor.href,
            top: rect.bottom,
            left: rect.left,
          };
        });
      }
    };

    const handleMouseOut = (e) => {
      const target = e.target;
      const anchor = target.closest('a');
      
      if (anchor) {
        // Only trigger if we are actually leaving the anchor
        if (e.relatedTarget && anchor.contains(e.relatedTarget)) {
          return;
        }

        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = setTimeout(() => {
          setHoveredLink(null);
        }, 400); // 400ms is a generous window to reach the tooltip
      }
    };

    const handleScroll = () => {
      setHoveredLink(null);
    };

    editorElement.addEventListener('mouseover', handleMouseOver);
    editorElement.addEventListener('mouseout', handleMouseOut);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      editorElement.removeEventListener('mouseover', handleMouseOver);
      editorElement.removeEventListener('mouseout', handleMouseOut);
      window.removeEventListener('scroll', handleScroll, true);
      clearTimeout(hideTimeoutRef.current);
    };
  }, [editor]);

  if (!hoveredLink) return null;

  return (
    <div 
      className="fixed z-[100] rounded-lg bg-white p-2 shadow-xl border border-gray-200 text-sm max-w-sm truncate flex items-center gap-2 transition-opacity animate-in fade-in zoom-in-95 duration-200"
      style={{ top: hoveredLink.top + 6, left: hoveredLink.left }}
      onMouseEnter={() => clearTimeout(hideTimeoutRef.current)}
      onMouseLeave={() => setHoveredLink(null)}
    >
      <a 
        href={hoveredLink.href} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-[#0b57d0] hover:underline flex items-center gap-1.5 px-1 font-medium"
      >
        {hoveredLink.href}
        <ExternalLink size={14} className="opacity-70" />
      </a>
    </div>
  );
};

export default LinkTooltip;
