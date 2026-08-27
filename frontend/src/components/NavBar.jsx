import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import api from '@/lib/api';

const Navbar = () => {
  const [isHidden, setIsHidden] = useState(false);
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const location = useLocation();

  useEffect(() => {
    let active = true;

    const loadCurrentUser = async () => {
      setIsCheckingAuth(true);
      try {
        const response = await api.get('/auth/me');
        if (active) setUser(response.data?.user ?? null);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setIsCheckingAuth(false);
      }
    };

    loadCurrentUser();
    return () => { active = false; };
  }, [location.pathname]);

  const initial = user?.username?.trim()?.charAt(0)?.toUpperCase()
    || user?.email?.charAt(0)?.toUpperCase()
    || 'U';

  return (
    <>
      <nav className={`flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white fixed top-0 w-full z-50 transition-transform duration-300 ${isHidden ? '-translate-y-full' : 'translate-y-0'}`}>
        <Link to="/doc" className="flex items-center gap-2 font-semibold text-xl text-slate-700 transition-colors hover:text-[#0b57d0]" aria-label="Go to documents">
          <div className="rounded-md bg-gradient-to-br from-[#0b57d0] to-violet-600 p-1.5 shadow-sm shadow-blue-200">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-[#0b57d0] to-violet-600 bg-clip-text text-transparent">WriteFlow</span>
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
          <a href="#templates" className="hover:text-blue-600 transition-colors">Templates</a>
          <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
          <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <Link
              to="/profile"
              className="flex items-center gap-2 rounded-full p-1 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
              title="Open profile"
            >
              <Avatar className="size-8">
                <AvatarFallback className="bg-blue-100 font-semibold text-[#0b57d0]">{initial}</AvatarFallback>
              </Avatar>
              <span className="hidden lg:inline">Profile</span>
            </Link>
          ) : !isCheckingAuth ? (
            <Link to="/login">
              <Button variant="ghost" className="hidden sm:flex text-slate-600 hover:text-slate-900 transition-colors">
                Sign in
              </Button>
            </Link>
          ) : <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />}
        </div>

        <button 
          onClick={() => setIsHidden(!isHidden)}
          className="absolute -bottom-6 right-32 bg-white border border-t-0 border-slate-200 rounded-b-lg p-1 text-slate-500 hover:text-slate-800 shadow-sm transition-colors cursor-pointer"
          title={isHidden ? "Show Navbar" : "Hide Navbar"}
        >
          {isHidden ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </nav>
      {/* Spacer to prevent content from hiding under fixed navbar */}
      <div className={`transition-all duration-300 ${isHidden ? 'h-0' : 'h-[73px]'}`} />
    </>
  );
};

export default Navbar;
