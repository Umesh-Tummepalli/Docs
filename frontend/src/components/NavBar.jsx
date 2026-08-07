import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import { Button } from "@/components/ui/button";

const Navbar = () => {
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-50">
      <div className="flex items-center gap-2 font-semibold text-xl text-slate-700">
        <div className="p-1.5 bg-[#0b57d0] rounded-md">
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
        {/* Placeholder for future auth state check */}
        {false ? (
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold cursor-pointer border border-blue-200">
            U
          </div>
        ) : (
          <Link to="/login">
            <Button variant="ghost" className="hidden sm:flex text-slate-600 hover:text-slate-900 transition-colors">
              Sign in
            </Button>
          </Link>
        )}
        <Button className="bg-[#0b57d0] hover:bg-[#0b57d0]/90 text-white gap-2 transition-colors shadow-sm">
          <Plus className="w-4 h-4" />
          New Document
        </Button>
      </div>
    </nav>
  );
};

export default Navbar;
