import { useEffect, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FileText, ChevronUp, ChevronDown, FolderOpen, LogOut, UserRound } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import api from '@/lib/api';
import { toast } from 'react-toastify';

const Navbar = () => {
  const [isHidden, setIsHidden] = useState(false);
  const [user, setUser] = useState(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const profileMenuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    };

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isProfileMenuOpen]);

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

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout');
      toast.success('Logged out successfully');
      navigate('/login', { replace: true });
      setIsProfileMenuOpen(false);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to log out. Please try again.');
    }
  };

  // Close menu on hover out with a small delay
  const handleProfileMouseLeave = () => {
    setTimeout(() => setIsProfileMenuOpen(false), 150);
  };

  useEffect(() => {
    document.documentElement.style.setProperty('--navbar-height', isHidden ? '0px' : '73px');
  }, [isHidden]);

  const initial = user?.username?.trim()?.charAt(0)?.toUpperCase()
    || user?.email?.charAt(0)?.toUpperCase()
    || 'U';

  return (
    <>
      <nav className={`flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white fixed top-0 w-full z-50 transition-transform duration-300 ${isHidden ? '-translate-y-full' : 'translate-y-0'}`}>
        <Link to="/" className="flex items-center gap-2 font-semibold text-xl text-slate-700 transition-colors hover:text-[#0b57d0]" aria-label="Go to home">
          <div className="rounded-md bg-gradient-to-br from-[#0b57d0] to-violet-600 p-1.5 shadow-sm shadow-blue-200">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-[#0b57d0] to-violet-600 bg-clip-text text-transparent">WriteFlow</span>
        </Link>

        {/* Middle nav — intentionally empty until more pages are added */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600" />

        <div className="flex items-center gap-3">
          {isCheckingAuth ? (
            <div className="h-8 w-8 animate-pulse rounded-full bg-slate-100" />
          ) : user ? (
            <>
              {/* My Docs button */}
              <Link to="/documents">
                <Button
                  variant="ghost"
                  className="hidden sm:flex items-center gap-1.5 text-slate-600 hover:text-[#0b57d0] hover:bg-blue-50 transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                  My Docs
                </Button>
              </Link>

              {/* Profile */}
              <div className="relative" ref={profileMenuRef}>
                <div
                  onMouseEnter={() => setIsProfileMenuOpen(true)}
                  className="flex cursor-pointer items-center justify-center rounded-full p-1.5 text-slate-700 transition-all hover:bg-slate-100 hover:ring-2 hover:ring-[#0b57d0]/20"
                  title="Profile menu"
                >
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-blue-100 font-semibold text-[#0b57d0] text-sm">{initial}</AvatarFallback>
                  </Avatar>
                </div>

                <div
                  onMouseEnter={() => setIsProfileMenuOpen(true)}
                  onMouseLeave={() => setIsProfileMenuOpen(false)}
                  className={`absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/60 transition-all duration-200 ease-[cubic-bezier(0.25,0.8,0.25,1)] ${
                    isProfileMenuOpen 
                      ? 'opacity-100 scale-100 translate-y-0' 
                      : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
                  }`}
                >
                  <div className="p-2">
                    {/* View Profile Link */}
                    <Link
                      to="/profile"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-[#0b57d0]/10 hover:text-[#0b57d0]"
                    >
                      <UserRound className="size-4" />
                      <span>View Profile</span>
                    </Link>

                    {/* Logout Button */}
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                    >
                      <LogOut className="size-4" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <Link to="/login">
              <Button variant="ghost" className="hidden sm:flex text-slate-600 hover:text-slate-900 transition-colors">
                Sign in
              </Button>
            </Link>
          )}
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
