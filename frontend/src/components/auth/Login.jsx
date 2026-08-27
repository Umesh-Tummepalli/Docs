import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '@/lib/api';
import GoogleAuth from './GoogleAuth';
import MicrosoftAuth from './MicrosoftAuth';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

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
        navigate('/doc'); // Assuming /documents is the dashboard or home after login
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
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center bg-gradient-to-b from-white to-slate-50/50 p-6 font-sans">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2 text-2xl font-semibold">
            <div className="rounded-lg bg-gradient-to-br from-[#0b57d0] to-violet-600 p-2 shadow-sm shadow-blue-200">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-[#0b57d0] to-violet-600 bg-clip-text text-transparent">WriteFlow</span>
          </div>
        </div>

        <Card className="border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="space-y-2 text-center pb-6">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Welcome back</CardTitle>
            <CardDescription className="text-slate-500">
              Enter your credentials to access your documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 border-slate-300 focus-visible:ring-[#0b57d0]"
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
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 border-slate-300 focus-visible:ring-[#0b57d0]"
                />
              </div>
              <Button
                type="submit"
                className="group h-11 w-full bg-gradient-to-r from-[#0b57d0] to-violet-600 font-medium text-white shadow-lg shadow-blue-200/60 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-200/50"
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

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-slate-500 font-medium">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <GoogleAuth />
                <MicrosoftAuth />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col border-t border-slate-100 bg-slate-50/50 px-6 py-4">
            <div className="text-center text-sm text-slate-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-[#0b57d0] transition-all hover:text-violet-600 hover:underline">
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
