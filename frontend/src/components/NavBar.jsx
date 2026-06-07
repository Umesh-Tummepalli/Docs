import React from 'react';
import { FileText, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";

const Navbar = () => {
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-50">
      <div className="flex items-center gap-2 font-semibold text-xl text-slate-700">
        <div className="p-1.5 bg-blue-600 rounded-md">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <span>WriteFlow</span>
      </div>

      <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
        <a href="#templates" className="hover:text-blue-600 transition-colors">Templates</a>
        <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
        <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" className="hidden sm:flex text-slate-600 hover:text-slate-900">
          Sign in
        </Button>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
          <Plus className="w-4 h-4" />
          New Document
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;
