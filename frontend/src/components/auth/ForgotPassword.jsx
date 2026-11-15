import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { ArrowLeft, ArrowRight, FileText, Mail, MailCheck } from "lucide-react";
import { toast } from "react-toastify";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "@/lib/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSent, setIsSent] = useState(false);

  const requestResetLink = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      toast.error("Enter your email address first.");
      return;
    }

    setIsSending(true);
    try {
      const response = await api.post("/auth/forgot-password", { email: normalizedEmail });
      setEmail(normalizedEmail);
      setIsSent(true);
      toast.success(response.data.message || "Password reset link sent.");
    } catch (error) {
      toast.error(error.response?.data?.message || "We couldn't send a reset link. Please try again.");
    } finally {
      setIsSending(false);
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
              <FileText className="h-6 w-6 text-white" />
            </div>
            <span className="bg-gradient-to-r from-[#0b57d0] to-violet-600 bg-clip-text text-transparent">WriteFlow</span>
          </div>
        </div>

        <Card className="overflow-hidden rounded-2xl border-white/80 bg-white/95 shadow-2xl shadow-slate-300/40 backdrop-blur">
          <CardHeader className="space-y-2 px-6 pb-5 pt-7 text-center sm:px-8 sm:pt-8">
            <div className="mx-auto mb-1 w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-[#0b57d0]">Password recovery</div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
              {isSent ? "Check your inbox" : "Forgot your password?"}
            </CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-500">
              {isSent
                ? `We sent password reset instructions to ${email}.`
                : "Enter the email address associated with your WriteFlow account."}
            </CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-7 sm:px-8">
            {isSent ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.25 }}
                className="space-y-5 text-center"
              >
                <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-50">
                  <motion.span
                    animate={{ scale: [1, 1.18, 1], opacity: [0.35, 0, 0.35] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute inset-0 rounded-full border-2 border-[#0b57d0]"
                  />
                  <MailCheck className="h-10 w-10 text-[#0b57d0]" aria-hidden="true" />
                </div>
                <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                  Can&apos;t find the email? Check your spam or junk folder, then return here to send another link.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full rounded-xl border-slate-200 font-semibold text-[#0b57d0] hover:bg-blue-50"
                  onClick={requestResetLink}
                  disabled={isSending}
                >
                  {isSending ? (
                    <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-[#0b57d0] border-t-transparent" /> Sending link...</span>
                  ) : "Resend reset link"}
                </Button>
                <button type="button" onClick={() => setIsSent(false)} className="text-sm font-medium text-slate-600 transition-colors hover:text-[#0b57d0]">
                  Use a different email address
                </button>
              </motion.div>
            ) : (
              <form onSubmit={requestResetLink} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#0b57d0]/20 focus-visible:ring-offset-0"
                  />
                </div>
                <Button type="submit" className="group h-12 w-full rounded-xl bg-gradient-to-r from-[#0b57d0] to-violet-600 font-semibold text-white shadow-lg shadow-blue-200/60 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-200/50" disabled={isSending}>
                  {isSending ? (
                    <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Sending reset link...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Mail className="h-4 w-4" /> Send reset link <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
                  )}
                </Button>
                <p className="text-center text-sm leading-6 text-slate-500">We&apos;ll email a secure link to reset your password. Check spam or junk if it doesn&apos;t arrive soon.</p>
              </form>
            )}
          </CardContent>

          <CardFooter className="flex flex-col border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:px-8">
            <Link to="/login" className="inline-flex items-center gap-1 text-sm font-semibold text-[#0b57d0] transition-all hover:text-violet-600 hover:underline">
              <ArrowLeft className="h-4 w-4" /> Back to sign in
            </Link>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
