import React from 'react';
import { 
  Users, 
  CloudLightning, 
  Share2, 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter,
  ArrowRight,
  Sparkles,
  Check
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const DocsLanding = () => {
  const features = [
    {
      icon: Users,
      title: "Real-time collaboration",
      description: "Work together with your team simultaneously. See changes as they happen with color-coded cursors and presence indicators.",
      color: "blue"
    },
    {
      icon: CloudLightning,
      title: "Auto-saves to the cloud",
      description: "Never lose your work again. Every keystroke is securely saved and versioned automatically, accessible from any device.",
      color: "amber"
    },
    {
      icon: Share2,
      title: "Seamless sharing",
      description: "Share documents with a link, set granular permissions, and control exactly who can view, comment, or edit.",
      color: "green"
    }
  ];

  const colorVariants = {
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-600",
      ring: "ring-blue-100",
      hover: "group-hover:bg-blue-100"
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      ring: "ring-amber-100",
      hover: "group-hover:bg-amber-100"
    },
    green: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      ring: "ring-emerald-100",
      hover: "group-hover:bg-emerald-100"
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-slate-50/50 font-sans text-slate-900 antialiased">
      
      {/* Hero Section */}
      <section className="relative px-6 py-20 md:py-32 flex flex-col items-center text-center overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-50 via-transparent to-transparent opacity-60" />
        
        <div className="relative max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          {/* <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-sm font-medium animate-fade-in">
            <Sparkles className="w-4 h-4" />
            Now available for teams
          </div>*/}
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-slate-900 leading-[1.1]">
            Your best work, <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-[#0b57d0] to-violet-600 bg-clip-text text-transparent">
              together in one place.
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Create, edit, and collaborate on beautiful documents from anywhere. 
            A clean, distraction-free environment designed for modern teams who value speed and simplicity.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
            <Button 
              size="lg" 
              className="w-full sm:w-auto bg-[#0b57d0] hover:bg-[#0b57d0]/90 text-white text-base h-12 px-8 shadow-sm transition-all duration-300 group"
            >
              Go to WriteFlow
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto text-base h-12 px-8 border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all duration-300"
            >
              Try for free
            </Button>
          </div>
          
          {/* Trust indicators */}
          <div className="flex items-center justify-center gap-6 pt-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-500" />
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-500" />
              Free forever plan
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="w-4 h-4 text-green-500" />
              2-minute setup
            </span>
          </div>
        </div>

        {/* Mockup Editor UI */}
        <div className="relative w-full max-w-5xl mx-auto mt-20 p-4 md:p-8">
          {/* Glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-violet-100 rounded-3xl opacity-30 blur-xl" />
          
          <div className="relative bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-slate-200/50 overflow-hidden">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-100 border-b border-slate-200">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-green-400" />
              </div>
              <div className="flex-1 mx-4">
                <div className="bg-white rounded-md px-4 py-1.5 text-xs text-slate-500 text-center max-w-md mx-auto border border-slate-200">
                  writeflow.app/document/untitled
                </div>
              </div>
            </div>
            
            {/* Mockup Toolbar */}
            <div className="flex items-center gap-4 px-4 py-3 border-b border-slate-200 bg-white text-slate-500 overflow-x-auto">
              <span className="text-sm font-medium text-slate-700 pr-3 border-r border-slate-200">Normal text</span>
              <span className="text-sm font-medium text-slate-700 pr-3 border-r border-slate-200">Inter</span>
              <div className="flex items-center gap-1.5 pr-3 border-r border-slate-200">
                <button className="p-1.5 hover:bg-slate-100 rounded transition-colors" aria-label="Bold">
                  <Bold className="w-4 h-4" />
                </button>
                <button className="p-1.5 hover:bg-slate-100 rounded transition-colors" aria-label="Italic">
                  <Italic className="w-4 h-4" />
                </button>
                <button className="p-1.5 hover:bg-slate-100 rounded transition-colors" aria-label="Underline">
                  <Underline className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <button className="p-1.5 bg-blue-50 text-[#0b57d0] rounded transition-colors" aria-label="Align left">
                  <AlignLeft className="w-4 h-4" />
                </button>
                <button className="p-1.5 hover:bg-slate-100 rounded transition-colors" aria-label="Align center">
                  <AlignCenter className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {/* Mockup Document Page */}
            <div className="p-8 md:p-16 bg-white">
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="h-10 w-3/4 bg-gradient-to-r from-slate-200 to-slate-100 rounded-lg animate-pulse" />
                <div className="space-y-3 mt-8">
                  <div className="h-3 w-full bg-slate-50 rounded-md" />
                  <div className="h-3 w-11/12 bg-slate-50 rounded-md" />
                  <div className="h-3 w-full bg-slate-50 rounded-md" />
                  <div className="h-3 w-4/5 bg-slate-50 rounded-md" />
                  <div className="h-3 w-5/6 bg-slate-50 rounded-md" />
                </div>
                {/* Collaboration indicator */}
                <div className="flex items-center gap-3 mt-8 p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
                  <div className="flex-shrink-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />
                    <div className="w-2 h-2 bg-blue-500 rounded-full -mt-2" />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-blue-200 flex items-center justify-center text-xs font-medium text-blue-700">
                      J
                    </div>
                    <span className="text-sm text-blue-700 font-medium">Jane is editing this section...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Section */}
      <section className="relative px-6 py-24 md:py-32">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
              Everything you need to write
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Powerful features that make document creation effortless and collaboration seamless.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const colors = colorVariants[feature.color];
              
              return (
                <Card 
                  key={index} 
                  className="group relative border border-slate-200 bg-white hover:border-slate-300 hover:shadow-lg transition-all duration-300 cursor-default overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <CardHeader className="relative">
                    <div className={`mb-4 p-3 ${colors.bg} rounded-xl inline-flex ring-1 ${colors.ring} ${colors.hover} transition-colors duration-300`}>
                      <Icon className={`w-6 h-6 ${colors.text}`} />
                    </div>
                    <CardTitle className="text-xl text-slate-900">{feature.title}</CardTitle>
                  </CardHeader>
                  
                  <CardContent className="relative">
                    <CardDescription className="text-base text-slate-600 leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20 bg-gradient-to-r from-[#0b57d0] to-violet-600">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h2 className="text-3xl md:text-4xl font-bold text-white">
            Ready to write together?
          </h2>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto">
            Join thousands of teams already using WriteFlow to create their best work.
          </p>
          <Button 
            size="lg" 
            className="bg-white text-[#0b57d0] hover:bg-blue-50 text-base h-12 px-8 shadow-sm group"
          >
            Get started for free
            <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 text-center border-t border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
            <a href="#" className="hover:text-slate-900 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-slate-900 transition-colors">Contact</a>
          </div>
          <p className="text-slate-400 text-sm">
            © 2026 WriteFlow Inc. Start creating your best documents today.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default DocsLanding;