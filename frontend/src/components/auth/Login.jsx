import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '@/lib/api';
import GoogleAuth from './GoogleAuth';
// import MicrosoftAuth from './MicrosoftAuth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from') || '/documents';

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });

      if (response.data.success) {
        toast.success(response.data.message);
        navigate(from);
      } else {
        toast.error(response.data.message || 'Login failed. Please try again.');
      }
    } catch (error) {
      if (error.response && error.response.data && error.response.data.message) {
        toast.error(error.response.data.message);
      } else {
        toast.error('An unexpected error occurred. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <div className="relative flex min-h-[calc(100vh-73px)] items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 font-sans sm:px-6">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-violet-200/30 blur-3xl" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        <div className="mb-6 flex justify-center sm:mb-8">
          <div className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <div className="rounded-xl bg-gradient-to-br from-[#0b57d0] to-violet-600 p-2.5 shadow-lg shadow-blue-200/60">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-[#0b57d0] to-violet-600 bg-clip-text text-transparent">WriteFlow</span>
          </div>
        </div>

        <Card className="overflow-hidden rounded-2xl border-white/80 bg-white/95 shadow-2xl shadow-slate-300/40 backdrop-blur">
          <CardHeader className="space-y-2 px-6 pb-5 pt-7 text-center sm:px-8 sm:pt-8">
            <div className="mx-auto mb-1 w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0b57d0]">Welcome back</div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Sign in to WriteFlow</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-500">
              Enter your credentials to access your documents
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-7 sm:px-8">
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#0b57d0]/20 focus-visible:ring-offset-0"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                  <a href="#" className="text-sm font-medium text-[#0b57d0] hover:text-[#0b57d0]/90 hover:underline transition-all">
                    Forgot password?
                  </a>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#0b57d0]/20 focus-visible:ring-offset-0"
                />
              </div>
              <Button
                type="submit"
                className="group h-12 w-full rounded-xl bg-gradient-to-r from-[#0b57d0] to-violet-600 font-semibold text-white shadow-lg shadow-blue-200/60 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-200/50 focus-visible:ring-2 focus-visible:ring-[#0b57d0] focus-visible:ring-offset-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign in
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>
            </form>

            <div className="mt-7">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Or continue with</span>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3">
                <GoogleAuth />
                {/* <MicrosoftAuth /> */}
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:px-8">
            <div className="text-center text-sm text-slate-600">
              Don't have an account?{' '}
              <Link to={`/register${from !== '/documents' ? `?from=${encodeURIComponent(from)}` : ''}`} className="font-semibold text-[#0b57d0] transition-all hover:text-violet-600 hover:underline">
                Sign up
              </Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default Login;
