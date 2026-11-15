import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { ArrowLeft, ArrowRight, FileText, MailCheck } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/lib/api";
import GoogleAuth from "./GoogleAuth";

const maskEmail = (email) => {
  const [localPart, domain] = email.split("@");
  if (!domain) return email;
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}${"•".repeat(Math.max(1, localPart.length - visible.length))}@${domain}`;
};

const Register = () => {
  const [step, setStep] = useState("email");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendAvailableIn, setResendAvailableIn] = useState(0);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const from = searchParams.get("from") || "/documents";

  const loginPath = useMemo(
    () => `/login${from !== "/documents" ? `?from=${encodeURIComponent(from)}` : ""}`,
    [from]
  );

  useEffect(() => {
    if (resendAvailableIn <= 0) return undefined;

    const interval = window.setInterval(() => {
      setResendAvailableIn((seconds) => Math.max(0, seconds - 1));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [resendAvailableIn]);

  const requestOtp = async (event, isResend = false) => {
    event?.preventDefault();
    if (!email.trim()) {
      toast.error("Enter your email address first");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/auth/send-otp", { email });
      setEmail(email.trim().toLowerCase());
      setOtp("");
      setResendAvailableIn(response.data.resendAvailableIn ?? 60);
      setStep("otp");
      toast.success(isResend ? "A new verification code was sent." : response.data.message || "Verification code sent.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to send a verification code. Please try again.");
      const cooldown = error.response?.data?.resendAvailableIn;
      if (cooldown) setResendAvailableIn(cooldown);
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async (event) => {
    event.preventDefault();
    if (otp.length !== 6) {
      toast.error("Enter the six-digit verification code");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/auth/verify-otp", { email, otp });
      setStep("credentials");
      setOtp("");
      toast.success(response.data.message || "Email verified.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to verify the code. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const completeRegistration = async (event) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post("/auth/register", { username, password, confirmPassword });
      toast.success(response.data.message || "Registration successful!");
      navigate(loginPath);
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const startOver = () => {
    setStep("email");
    setOtp("");
    setPassword("");
    setConfirmPassword("");
    setResendAvailableIn(0);
  };

  const heading = {
    email: {
      title: "Verify your email",
      description: "We will send a verification code before you create your account.",
    },
    otp: {
      title: "Check your inbox",
      description: `Enter the six-digit code sent to ${maskEmail(email)}.`,
    },
    credentials: {
      title: "Create your account",
      description: "Your email is verified. Add your account details to finish signing up.",
    },
  }[step];

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
            <div className="mx-auto mb-1 w-fit rounded-full bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-violet-700">
              {step === "credentials" ? "Almost there" : "Get started"}
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">{heading.title}</CardTitle>
            <CardDescription className="text-sm leading-6 text-slate-500">{heading.description}</CardDescription>
          </CardHeader>

          <CardContent className="px-6 pb-7 sm:px-8">
            {step === "email" && (
              <form onSubmit={requestOtp} className="space-y-5">
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
                <Button type="submit" className="group h-12 w-full rounded-xl bg-gradient-to-r from-[#0b57d0] to-violet-600 font-semibold text-white shadow-lg shadow-blue-200/60 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-200/50" disabled={isLoading}>
                  {isLoading ? "Sending code..." : <span className="flex items-center gap-2">Send verification code <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>}
                </Button>
              </form>
            )}

            {step === "otp" && (
              <form onSubmit={verifyOtp} className="space-y-5">
                <div className="flex justify-center py-2">
                  <MailCheck className="h-10 w-10 text-[#0b57d0]" aria-hidden="true" />
                </div>
                <div className="space-y-2">
                  <Label className="block text-center text-sm font-medium text-slate-700" htmlFor="otp">Verification code</Label>
                  <div className="flex justify-center">
                    <InputOTP id="otp" maxLength={6} value={otp} onChange={setOtp} inputMode="numeric" pattern="[0-9]*" disabled={isLoading}>
                      <InputOTPGroup>
                        {Array.from({ length: 6 }, (_, index) => <InputOTPSlot key={index} index={index} className="size-11 text-base" />)}
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>
                <Button type="submit" className="h-12 w-full rounded-xl bg-gradient-to-r from-[#0b57d0] to-violet-600 font-semibold text-white shadow-lg shadow-blue-200/60" disabled={isLoading || otp.length !== 6}>
                  {isLoading ? "Verifying..." : "Verify email"}
                </Button>
                <p className="text-center text-sm text-slate-500">
                  Can&apos;t find the code? Check your spam or junk folder.
                </p>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <button type="button" onClick={startOver} className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-[#0b57d0]" disabled={isLoading}>
                    <ArrowLeft className="h-4 w-4" /> Change email
                  </button>
                  <button type="button" onClick={(event) => requestOtp(event, true)} className="font-semibold text-[#0b57d0] hover:text-violet-600 disabled:cursor-not-allowed disabled:text-slate-400" disabled={isLoading || resendAvailableIn > 0}>
                    {resendAvailableIn > 0 ? `Resend in ${resendAvailableIn}s` : "Resend code"}
                  </button>
                </div>
              </form>
            )}

            {step === "credentials" && (
              <form onSubmit={completeRegistration} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-slate-700">Username</Label>
                  <Input id="username" type="text" placeholder="johndoe" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 placeholder:text-slate-400 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#0b57d0]/20 focus-visible:ring-offset-0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium text-slate-700">Password</Label>
                  <Input id="password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#0b57d0]/20 focus-visible:ring-offset-0" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">Confirm password</Label>
                  <Input id="confirmPassword" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="h-12 rounded-xl border-slate-200 bg-slate-50/70 px-4 focus-visible:bg-white focus-visible:ring-2 focus-visible:ring-[#0b57d0]/20 focus-visible:ring-offset-0" />
                </div>
                <Button type="submit" className="group h-12 w-full rounded-xl bg-gradient-to-r from-[#0b57d0] to-violet-600 font-semibold text-white shadow-lg shadow-blue-200/60 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-200/50" disabled={isLoading}>
                  {isLoading ? "Creating account..." : <span className="flex items-center gap-2">Create account <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>}
                </Button>
              </form>
            )}

            {step === "email" && (
              <div className="mt-7">
                <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Or continue with</span></div></div>
                <div className="mt-5 grid grid-cols-1 gap-3"><GoogleAuth /></div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:px-8">
            <div className="text-center text-sm text-slate-600">
              Already have an account? <Link to={loginPath} className="font-semibold text-[#0b57d0] transition-all hover:text-violet-600 hover:underline">Sign in</Link>
            </div>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

export default Register;
