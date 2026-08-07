import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, ArrowRight } from 'lucide-react';
import { toast } from 'react-toastify';
import axios from 'axios';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setIsLoading(true);
    try {
      console.log(import.meta.env.VITE_BACKEND_API_URL);
      const response = await axios.post(`${import.meta.env.VITE_BACKEND_API_URL}/auth/register`, { username, email, password }, { withCredentials: true });
      toast.success(response.data.message || 'Registration successful!');
      navigate('/login');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(errorMessage);
      console.dir(error);

    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleOAuth = () => {
    // TODO: Add Google OAuth API call
    console.log('Google OAuth clicked');
  };

  const handleMicrosoftOAuth = () => {
    // TODO: Add Microsoft OAuth API call
    console.log('Microsoft OAuth clicked');
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
          <div className="flex items-center gap-2 font-semibold text-2xl text-slate-700">
            <div className="p-2 bg-[#0b57d0] rounded-lg shadow-sm">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <span>WriteFlow</span>
          </div>
        </div>

        <Card className="border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <CardHeader className="space-y-2 text-center pb-6">
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">Create an account</CardTitle>
            <CardDescription className="text-slate-500">
              Sign up to start collaborating on your documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-slate-700">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="h-11 border-slate-300 focus-visible:ring-[#0b57d0]"
                />
              </div>
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
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 border-slate-300 focus-visible:ring-[#0b57d0]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 border-slate-300 focus-visible:ring-[#0b57d0]"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-11 bg-[#0b57d0] hover:bg-[#0b57d0]/90 text-white font-medium shadow-sm transition-all group mt-2"
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
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleGoogleOAuth}
                  className="h-11 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium transition-all"
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Google
                </Button>
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleMicrosoftOAuth}
                  className="h-11 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 font-medium transition-all"
                >
                  <svg className="mr-2 h-4 w-4" viewBox="0 0 21 21">
                    <path fill="#f25022" d="M1 1h9v9H1z" />
                    <path fill="#00a4ef" d="M1 11h9v9H1z" />
                    <path fill="#7fba00" d="M11 1h9v9h-9z" />
                    <path fill="#ffb900" d="M11 11h9v9h-9z" />
                  </svg>
                  Microsoft
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col border-t border-slate-100 bg-slate-50/50 px-6 py-4">
            <div className="text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-[#0b57d0] hover:text-[#0b57d0]/90 hover:underline transition-all">
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
