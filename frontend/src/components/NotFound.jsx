import React, { useState, useEffect } from 'react';
import {
  FileText,
  Home,
  HelpCircle,
  FileEdit,
  Users,
  Zap,
  BookOpen
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Link } from "react-router";

const NotFound = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const quickLinks = [
    {
      icon: FileEdit,
      title: "Create Document",
      description: "Start fresh with a new document",
      href: "/new",
      color: "blue"
    },
    {
      icon: Users,
      title: "Team Workspace",
      description: "Collaborate with your team",
      href: "/teams",
      color: "violet"
    },
    {
      icon: BookOpen,
      title: "Templates",
      description: "Browse our template library",
      href: "/templates",
      color: "amber"
    },
    {
      icon: Zap,
      title: "Help Center",
      description: "Find answers and guides",
      href: "/help",
      color: "emerald"
    }
  ];

  const colorVariants = {
    blue: {
      bg: "bg-blue-50",
      text: "text-[#0b57d0]",
      hover: "group-hover:bg-blue-100",
      shadow: "group-hover:shadow-blue-200/50"
    },
    violet: {
      bg: "bg-violet-50",
      text: "text-violet-600",
      hover: "group-hover:bg-violet-100",
      shadow: "group-hover:shadow-violet-200/50"
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      hover: "group-hover:bg-amber-100",
      shadow: "group-hover:shadow-amber-200/50"
    },
    emerald: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      hover: "group-hover:bg-emerald-100",
      shadow: "group-hover:shadow-emerald-200/50"
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Floating documents */}
        <div className="absolute top-20 left-10 opacity-10 animate-float-slow">
          <FileText className="w-32 h-32 text-[#0b57d0] transform -rotate-12" />
        </div>
        <div className="absolute bottom-32 right-10 opacity-10 animate-float-slower">
          <FileText className="w-24 h-24 text-violet-600 transform rotate-12" />
        </div>
        <div className="absolute top-1/3 right-1/4 opacity-5 animate-float">
          <FileText className="w-40 h-40 text-slate-400 transform -rotate-6" />
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
        <div
          className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-slow"
        />
        <div
          className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse-slower"
        />
      </div>

      {/* Interactive cursor glow */}
      {isHovering && (
        <div
          className="fixed pointer-events-none w-64 h-64 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-10 transition-transform duration-200"
          style={{
            left: mousePosition.x - 128,
            top: mousePosition.y - 128,
          }}
        />
      )}

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-6 py-16">
        <div className="max-w-2xl mx-auto text-center space-y-8">

          {/* 404 Animation */}
          <div className="relative mb-8">
            <div className="text-[180px] md:text-[220px] font-black leading-none select-none">
              <span className="bg-gradient-to-r from-[#0b57d0] via-violet-600 to-[#0b57d0] bg-clip-text text-transparent animate-gradient">
                4
              </span>
              <span className="relative inline-block mx-2">
                <span className="bg-gradient-to-b from-slate-300 to-slate-100 bg-clip-text text-transparent">
                  0
                </span>
                {/* Animated document in the zero */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <FileText className="w-20 h-20 md:w-24 md:h-24 text-[#0b57d0] animate-bounce-subtle" />
                </div>
              </span>
              <span className="bg-gradient-to-r from-violet-600 via-[#0b57d0] to-violet-600 bg-clip-text text-transparent animate-gradient-reverse">
                4
              </span>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-4">
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900">
              Page not found
            </h1>
            <p className="text-lg md:text-xl text-slate-600 max-w-lg mx-auto leading-relaxed">
              Looks like this document has been moved or deleted.
              Let's get you back to creating amazing content.
            </p>
          </div>



          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
              <Link to="/">
            <Button
              size="lg"
              className="w-full sm:w-auto bg-[#0b57d0] hover:bg-[#0b57d0]/90 text-white h-12 px-8 shadow-sm transition-all duration-300 group"
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
            >
              <Home className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
              Back to Home
            </Button>
              </Link>
          </div>
        </div>

        {/* Quick Links Section */}
        <div className="max-w-4xl mx-auto mt-20 w-full">
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 border border-slate-200 rounded-full text-slate-600 text-sm font-medium">
              <HelpCircle className="w-4 h-4" />
              Maybe you were looking for...
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickLinks.map((link, index) => {
              const Icon = link.icon;
              const colors = colorVariants[link.color];

              return (
                <Link
                  key={index}
                  href={link.href}
                  className="group relative p-5 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onMouseEnter={() => setIsHovering(true)}
                  onMouseLeave={() => setIsHovering(false)}
                >
                  <div className={`mb-3 p-2.5 ${colors.bg} rounded-lg inline-flex ring-1 ring-slate-100 ${colors.hover} transition-colors duration-300`}>
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1 group-hover:text-[#0b57d0] transition-colors">
                    {link.title}
                  </h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {link.description}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Footer note */}
        <div className="mt-16 text-center">
          <p className="text-sm text-slate-400">
            Still lost? <a href="/contact" className="text-[#0b57d0] hover:text-[#0b57d0]/90 font-medium underline underline-offset-2">Contact our support team</a>
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-12deg); }
          50% { transform: translateY(-20px) rotate(-12deg); }
        }
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
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes gradient-reverse {
          0%, 100% { background-position: 100% 50%; }
          50% { background-position: 0% 50%; }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
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
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        .animate-gradient-reverse {
          background-size: 200% 200%;
          animation: gradient-reverse 3s ease infinite;
        }
      `}</style>
    </div>
  );
};

export default NotFound;
