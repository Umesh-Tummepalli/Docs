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

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get('from') || '/documents';

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/register', { username, email, password });
      toast.success(response.data.message || 'Registration successful!');
      // Send to login carrying the same ?from= so after login they land in the right place
      navigate(`/login${from !== '/documents' ? `?from=${encodeURIComponent(from)}` : ''}`);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(errorMessage);
      console.dir(error);

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
            <div className="mx-auto mb-1 w-fit rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-700">Get started</div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Create your account</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-500">
              Sign up to start collaborating on your documents
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-7 sm:px-8">
            <form onSubmit={handleRegister} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-slate-700">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#0b57d0]/20 focus-visible:ring-offset-0"
                />
              </div>
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
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#0b57d0]/20 focus-visible:ring-offset-0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#0b57d0]/20 focus-visible:ring-offset-0"
                />
              </div>
              <Button
                type="submit"
                className="group mt-1 h-12 w-full rounded-xl bg-gradient-to-r from-[#0b57d0] to-violet-600 font-semibold text-white shadow-lg shadow-blue-200/60 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-200/50 focus-visible:ring-2 focus-visible:ring-[#0b57d0] focus-visible:ring-offset-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Creating account...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Sign up
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
              Already have an account?{' '}
              <Link to={`/login${from !== '/documents' ? `?from=${encodeURIComponent(from)}` : ''}`} className="font-semibold text-[#0b57d0] transition-all hover:text-violet-600 hover:underline">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default Register;
