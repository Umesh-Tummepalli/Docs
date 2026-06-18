import { useState, useEffect, useRef, useCallback } from 'react';
import { useEditorContext } from '../context/EditorContext';
import { ExternalLink, Copy, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LinkTooltip = () => {
  const editor = useEditorContext();
  const [hoveredLink, setHoveredLink] = useState(null);
  const [copied, setCopied] = useState(false);
  const hideTimeoutRef = useRef(null);
  const tooltipRef = useRef(null);

  const copyToClipboard = useCallback(async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  useEffect(() => {
    if (!editor) return;

    const editorElement = editor.view.dom;

    const handleMouseOver = (e) => {
      const target = e.target;
      const anchor = target.closest('a');
      
      if (anchor) {
        clearTimeout(hideTimeoutRef.current);
        const rect = anchor.getBoundingClientRect();
        
        setHoveredLink({
          href: anchor.href,
          top: rect.bottom,
          left: rect.left,
          anchorWidth: rect.width,
        });
      }
    };

    const handleMouseOut = (e) => {
      const target = e.target;
      const anchor = target.closest('a');
      
      if (anchor) {
        if (e.relatedTarget && (anchor.contains(e.relatedTarget) || tooltipRef.current?.contains(e.relatedTarget))) {
          return;
        }

        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = setTimeout(() => {
          setHoveredLink(null);
        }, 200);
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

  const truncateUrl = (url) => {
    if (url.length <= 40) return url;
    try {
      const parsed = new URL(url);
      return `${parsed.hostname}${parsed.pathname === '/' ? '' : parsed.pathname}`.slice(0, 40) + '...';
    } catch {
      return url.slice(0, 40) + '...';
    }
  };

  if (!hoveredLink) return null;

  return (
    <AnimatePresence>
      <motion.div 
        ref={tooltipRef}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 4 }}
        transition={{ duration: 0.15 }}
        className="fixed z-[100] flex items-center gap-0.5 rounded-lg bg-white px-2 py-1.5 shadow-lg border border-gray-200/80 backdrop-blur-sm"
        style={{ 
          top: hoveredLink.top + 6, 
          left: hoveredLink.left,
        }}
        onMouseEnter={() => clearTimeout(hideTimeoutRef.current)}
        onMouseLeave={() => setHoveredLink(null)}
      >
        <a 
          href={hoveredLink.href} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[13px] text-gray-700 hover:text-gray-900 transition-colors max-w-[200px] truncate"
          title={hoveredLink.href}
        >
          {truncateUrl(hoveredLink.href)}
          <ExternalLink className="h-3 w-3 text-gray-400 flex-shrink-0" />
        </a>

        <button
          onClick={(e) => {
            e.preventDefault();
            copyToClipboard(hoveredLink.href);
          }}
          className="flex-shrink-0 p-1 rounded hover:bg-gray-100 transition-colors"
          title="Copy link"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3 text-gray-400" />
          )}
        </button>
      </motion.div>
    </AnimatePresence>
  );
};

export default LinkTooltip;