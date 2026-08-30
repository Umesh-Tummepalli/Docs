import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, FileText, Mail, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const providerLabel = (provider) => ({
  local: 'Email and password',
  google: 'Google',
  microsoft: 'Microsoft',
}[provider] || provider);

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    api.get('/auth/me')
      .then((response) => {
        if (active) setUser(response.data?.user ?? null);
      })
      .catch((error) => {
        if (error.response?.status === 401) {
          toast.error('Sign in to view your profile.');
          navigate('/login', { replace: true });
        } else {
          toast.error('Unable to load your profile.');
        }
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [navigate]);

  if (loading) {
    return <main className="min-h-[calc(100vh-73px)] bg-gradient-to-b from-white via-slate-50 to-blue-50/60 px-6 py-12"><div className="mx-auto h-72 max-w-3xl animate-pulse rounded-2xl bg-white shadow-sm" /></main>;
  }

  if (!user) return null;

  const initial = user.username?.trim()?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U';
  const providers = [...new Set((user.authProviders || []).map(({ provider }) => provider).filter(Boolean))];
  if (providers.length === 0) providers.push('local');

  return (
    <main className="relative min-h-[calc(100vh-73px)] overflow-hidden bg-gradient-to-b from-white via-slate-50 to-blue-50/60 px-6 py-10">
      <div className="pointer-events-none absolute -right-32 -top-36 size-96 rounded-full bg-blue-200/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 size-96 rounded-full bg-violet-200/30 blur-3xl" />
      <div className="relative mx-auto w-full max-w-3xl space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#0b57d0]">Your account</p>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Profile</h1>
          <p className="text-slate-600">Your WriteFlow identity and sign-in details.</p>
        </div>

        <Card className="overflow-hidden border-slate-200 bg-white/90 shadow-xl shadow-slate-200/50 backdrop-blur">
          <div className="h-24 bg-gradient-to-r from-[#0b57d0] to-violet-600" />
          <CardHeader className="relative -mt-10 pb-4">
            <Avatar className="size-20 border-4 border-white shadow-md">
              <AvatarFallback className="bg-gradient-to-br from-blue-100 to-violet-100 text-2xl font-bold text-[#0b57d0]">{initial}</AvatarFallback>
            </Avatar>
            <CardTitle className="mt-4 text-2xl text-slate-900">{user.username || 'WriteFlow member'}</CardTitle>
            <CardDescription className="flex items-center gap-2 text-slate-600"><Mail className="size-4" />{user.email}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 border-t border-slate-100 pt-6 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-blue-50/70 to-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><UserRound className="size-4 text-[#0b57d0]" />Username</div>
              <p className="mt-2 break-all text-sm text-slate-600">{user.username || 'Not set'}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-violet-50/70 to-white p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><ShieldCheck className="size-4 text-[#0b57d0]" />Sign-in methods</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {providers.length > 0 ? providers.map((provider) => <span key={provider} className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-medium text-violet-700 ring-1 ring-violet-100">{providerLabel(provider)}</span>) : <span className="text-sm text-slate-500">No sign-in method recorded</span>}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Link to="/documents"><Button className="w-full bg-gradient-to-r from-[#0b57d0] to-violet-600 text-white shadow-lg shadow-blue-200/60 transition-all hover:-translate-y-0.5 hover:shadow-xl sm:w-auto"><FileText className="mr-2 size-4" />My documents</Button></Link>
          <Link to="/"><Button variant="outline" className="w-full border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:bg-violet-50/50 hover:shadow-md sm:w-auto"><BadgeCheck className="mr-2 size-4" />Back to WriteFlow</Button></Link>
        </div>
      </div>
    </main>
  );
}
