import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowRight, CircleCheck, FileText, KeyRound } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("reset_token");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const navigate = useNavigate();
  const hasToken = useMemo(() => Boolean(resetToken), [resetToken]);

  const resetPassword = async (event) => {
    event.preventDefault();
    if (!hasToken) {
      toast.error("This password reset link is invalid or incomplete.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords don't match.");
      return;
    }

    setIsResetting(true);
    try {
      const response = await api.post("/auth/reset-password", {
        reset_token: resetToken,
        password,
        confirmPassword,
      });
      setIsComplete(true);
      toast.success(response.data.message || "Your password has been reset.");
    } catch (error) {
      toast.error(error.response?.data?.message || "We couldn't reset your password. Request a new link and try again.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100vh-73px)] items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 font-sans sm:px-6">
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-violet-200/30 blur-3xl" />
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: "easeOut" }} className="relative w-full max-w-md">
        <div className="mb-6 flex justify-center sm:mb-8">
          <div className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <div className="rounded-xl bg-gradient-to-br from-[#0b57d0] to-violet-600 p-2.5 shadow-lg shadow-blue-200/60"><FileText className="h-6 w-6 text-white" /></div>
            <span className="bg-gradient-to-r from-[#0b57d0] to-violet-600 bg-clip-text text-transparent">WriteFlow</span>
          </div>
        </div>

        <Card className="overflow-hidden rounded-2xl border-white/80 bg-white/95 shadow-2xl shadow-slate-300/40 backdrop-blur">
          <CardHeader className="space-y-2 px-6 pb-5 pt-7 text-center sm:px-8 sm:pt-8">
            <div className="mx-auto mb-1 w-fit rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-700">Password recovery</div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
              {isComplete ? "Password updated" : hasToken ? "Create a new password" : "Reset link unavailable"}
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-500">
              {isComplete ? "You can now sign in using your new password." : hasToken ? "Choose a strong password that you do not use on other sites." : "This reset link is missing a valid token. Request a new password reset email."}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-7 sm:px-8">
            {isComplete ? (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="space-y-5 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50"><CircleCheck className="h-10 w-10 text-emerald-600" aria-hidden="true" /></div>
                <Button onClick={() => navigate("/login")} className="group h-12 w-full rounded-xl bg-gradient-to-r from-[#0b57d0] to-violet-600 font-semibold text-white shadow-lg shadow-blue-200/60">
                  <span className="flex items-center gap-2">Continue to sign in <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                </Button>
              </motion.div>
            ) : hasToken ? (
              <form onSubmit={resetPassword} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">New password</Label>
                  <Input id="password" type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#0b57d0]/20 focus-visible:ring-offset-0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">Confirm new password</Label>
                  <Input id="confirmPassword" type="password" autoComplete="new-password" required minLength={8} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#0b57d0]/20 focus-visible:ring-offset-0" />
                </div>
                <Button type="submit" className="group h-12 w-full rounded-xl bg-gradient-to-r from-[#0b57d0] to-violet-600 font-semibold text-white shadow-lg shadow-blue-200/60 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-200/50" disabled={isResetting}>
                  {isResetting ? <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Updating password...</span> : <span className="flex items-center gap-2"><KeyRound className="h-4 w-4" /> Reset password <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>}
                </Button>
              </form>
            ) : (
              <Button asChild className="h-12 w-full rounded-xl bg-gradient-to-r from-[#0b57d0] to-violet-600 font-semibold text-white shadow-lg shadow-blue-200/60"><Link to="/forgot-password">Request a new reset link</Link></Button>
            )}
          </CardContent>

          <CardFooter className="flex flex-col border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:px-8">
            <Link to="/login" className="text-sm font-semibold text-[#0b57d0] transition-all hover:text-violet-600 hover:underline">Back to sign in</Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default ResetPassword;
