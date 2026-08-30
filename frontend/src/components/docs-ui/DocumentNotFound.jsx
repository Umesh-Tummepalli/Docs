import React, { useState, useEffect } from 'react';
import {
  FileText,
  Home,
  AlertCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const DocumentNotFound = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 opacity-10 animate-float-slow">
          <FileText className="w-32 h-32 text-[#0b57d0] transform -rotate-12" />
        </div>
        <div className="absolute bottom-32 right-10 opacity-10 animate-float-slower">
          <FileText className="w-24 h-24 text-violet-600 transform rotate-12" />
        </div>

        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #3B82F6 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Gradient orbs */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-slow" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-slower" />
      </div>

      {/* Interactive cursor glow */}
      {isHovering && (
        <div
          className="fixed pointer-events-none w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 transition-transform duration-200"
          style={{ left: mousePosition.x - 128, top: mousePosition.y - 128 }}
        />
      )}

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-8">

          <div className="flex justify-center mb-8">
             <div className="relative">
                <FileText className="w-32 h-32 text-slate-300" />
                <AlertCircle className="w-12 h-12 text-red-500 absolute -bottom-2 -right-2 bg-white rounded-full p-1" />
             </div>
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900">
              Document not available
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-lg mx-auto leading-relaxed">
              This document may have been deleted, or the URL might be incorrect.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Link to="/documents">
              <Button
                size="lg"
                className="w-full sm:w-auto bg-[#0b57d0] hover:bg-[#0b57d0]/90 text-white h-12 px-8 shadow-sm transition-all duration-300 group"
                onMouseEnter={() => setIsHovering(true)}
                onMouseLeave={() => setIsHovering(false)}
              >
                <Home className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                Back to Documents
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(-12deg); }
          50% { transform: translateY(-15px) rotate(-12deg); }
        }
        @keyframes float-slower {
          0%, 100% { transform: translateY(0px) rotate(12deg); }
          50% { transform: translateY(-25px) rotate(12deg); }
        }
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.15; }
        }
        @keyframes pulse-slower {
          0%, 100% { opacity: 0.1; }
          50% { opacity: 0.2; }
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        .animate-float-slower {
          animation: float-slower 10s ease-in-out infinite;
        }
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        .animate-pulse-slower {
          animation: pulse-slower 5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default DocumentNotFound;
