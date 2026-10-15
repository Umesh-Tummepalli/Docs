import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BadgeCheck, FileText, Mail, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

const providerLabel = (provider) => ({ local: 'Email and password', google: 'Google', microsoft: 'Microsoft' }[provider] || provider);

export default function Profile() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    api.get('/auth/me')
      .then((response) => { if (active) setUser(response.data?.user ?? null); })
      .catch((error) => {
        if (error.response?.status === 401) { toast.error('Sign in to view your profile.'); navigate('/login', { replace: true }); }
        else toast.error('Unable to load your profile.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [navigate]);

  if (loading) return <main className="min-h-screen bg-[#f7faff] px-4 py-6 sm:px-6"><div className="mx-auto max-w-3xl animate-pulse"><div className="h-4 w-28 rounded-full bg-blue-100" /><div className="mt-3 h-8 w-52 rounded-xl bg-slate-200" /><div className="mt-7 h-64 rounded-3xl bg-white shadow-sm" /></div></main>;
  if (!user) return null;

  const initial = user.username?.trim()?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U';
  const providers = [...new Set((user.authProviders || []).map(({ provider }) => provider).filter(Boolean))];
  if (!providers.length) providers.push('local');

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f7faff] px-4 py-6 sm:px-6 lg:py-8">
      <div className="pointer-events-none absolute -right-32 -top-32 size-[28rem] rounded-full bg-blue-200/35 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-32 size-[28rem] rounded-full bg-violet-200/30 blur-3xl" />
      <div className="relative mx-auto max-w-3xl">
        <header className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-[#0b57d0]"><Sparkles className="size-4" /> WriteFlow account</div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Your profile</h1>
            <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">A quiet place for your identity, connected sign-in methods, and writing workspace.</p>
          </div>
          <Link to="/documents"><Button variant="outline" className="w-fit gap-2 rounded-xl border-slate-200 bg-white/80 text-slate-700 shadow-sm hover:border-blue-200 hover:bg-blue-50">Open workspace <ArrowRight className="size-4" /></Button></Link>
        </header>

        <section className="overflow-hidden rounded-3xl border border-white/80 bg-white/90 shadow-[0_24px_70px_-35px_rgba(37,99,235,0.45)] backdrop-blur">
          <div className="relative h-24 overflow-hidden bg-gradient-to-br from-[#0b57d0] via-blue-600 to-violet-600 sm:h-28">
            <div className="absolute -right-10 -top-24 size-72 rounded-full border-[36px] border-white/10" />
            <div className="absolute bottom-[-5rem] left-1/3 size-56 rounded-full border-[28px] border-white/10" />
            <p className="absolute right-6 top-6 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white/90 ring-1 ring-white/20">Member account</p>
          </div>
          <div className="relative px-5 pb-5 sm:px-7 sm:pb-7">
            <div className="-mt-9 flex flex-col gap-4 sm:-mt-10 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <Avatar className="size-20 border-[5px] border-white bg-white shadow-xl sm:size-24"><AvatarFallback className="bg-gradient-to-br from-blue-100 to-violet-100 text-4xl font-bold text-[#0b57d0]">{initial}</AvatarFallback></Avatar>
                <div className="pb-1"><h2 className="text-xl font-bold text-slate-950 sm:text-2xl">{user.username || 'WriteFlow member'}</h2><p className="mt-1 flex items-center gap-2 text-sm text-slate-500"><Mail className="size-4 text-blue-500" />{user.email}</p></div>
              </div>
              <span className="w-fit rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-100">Account active</span>
            </div>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50/80 to-white p-4 transition-transform hover:-translate-y-0.5">
                <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-white text-[#0b57d0] shadow-sm ring-1 ring-blue-100"><UserRound className="size-5" /></span><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Username</p><p className="mt-1 break-all font-semibold text-slate-800">{user.username || 'Not set'}</p></div></div>
              </div>
              <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/80 to-white p-4 transition-transform hover:-translate-y-0.5">
                <div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-white text-violet-600 shadow-sm ring-1 ring-violet-100"><ShieldCheck className="size-5" /></span><div><p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Sign-in methods</p><div className="mt-2 flex flex-wrap gap-2">{providers.map((provider) => <span key={provider} className="rounded-full bg-violet-100/80 px-2.5 py-1 text-xs font-semibold text-violet-700">{providerLabel(provider)}</span>)}</div></div></div>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Link to="/documents" className="group rounded-2xl border border-blue-100 bg-white/80 p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/50"><div className="flex items-center justify-between"><span className="flex size-11 items-center justify-center rounded-xl bg-blue-50 text-[#0b57d0]"><FileText className="size-5" /></span><ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-blue-500" /></div><p className="mt-4 font-semibold text-slate-900">My documents</p><p className="mt-1 text-sm text-slate-500">Return to your writing workspace.</p></Link>
          <Link to="/" className="group rounded-2xl border border-violet-100 bg-white/80 p-4 shadow-sm transition-all hover:-translate-y-1 hover:border-violet-200 hover:shadow-lg hover:shadow-violet-100/50"><div className="flex items-center justify-between"><span className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><BadgeCheck className="size-5" /></span><ArrowRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-1 group-hover:text-violet-500" /></div><p className="mt-4 font-semibold text-slate-900">Back to WriteFlow</p><p className="mt-1 text-sm text-slate-500">Keep exploring your workspace.</p></Link>
        </div>
      </div>
    </main>
  );
}
