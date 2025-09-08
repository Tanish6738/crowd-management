import React from 'react';
import { SignUp } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

const BgGrid = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.06] text-white pointer-events-none" aria-hidden="true">
    <defs>
      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
        <path d="M40 0H0V40" fill="none" stroke="currentColor" strokeWidth="0.5" />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#grid)" />
  </svg>
);

const HighlightCard = () => (
  <div className="relative flex flex-col gap-6 bg-gradient-to-br from-orange-400 via-amber-400 to-yellow-400 rounded-2xl p-8 shadow-xl text-neutral-900 overflow-hidden">
    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/30 rounded-full blur-2xl" />
    <h1 className="text-3xl font-bold tracking-tight">Create Account</h1>
    <p className="text-sm font-medium leading-relaxed max-w-xs">Modern surveillance & crowd management suite. Create an account to start configuring cameras, maps and analytics.</p>
    <ul className="space-y-2 text-sm font-semibold">
      {['Instant Onboarding','Role Based Access','Secure Federated Login','Scalable API'].map(item => (
        <li key={item} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-neutral-900" /> {item}
        </li>
      ))}
    </ul>
    <div className="mt-auto pt-4 text-[11px] font-medium tracking-wider uppercase">Designed for Operational Teams</div>
  </div>
);

const SignUpPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh relative flex items-center justify-center px-4 py-10 bg-neutral-950 text-white overflow-hidden">
      <BgGrid />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-orange-600/10 rounded-full blur-3xl" />
      <div className="relative w-full max-w-6xl grid md:grid-cols-2 gap-px rounded-2xl bg-gradient-to-br from-white/10 to-white/5 p-px backdrop-blur-md shadow-[0_8px_40px_-4px_rgba(0,0,0,0.4)]">
        <div className="hidden md:block rounded-2xl overflow-hidden">
          <HighlightCard />
        </div>
        <div className="rounded-2xl bg-neutral-900/60 p-6 sm:p-8 md:p-10 flex flex-col gap-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Sign up</h2>
            <p className="text-sm text-white/50 mt-1">Create your organization workspace.</p>
          </div>
          <SignUp afterSignUpUrl="/" signInUrl="/sign-in" />
          <button onClick={() => navigate('/')} className="mt-2 text-xs text-white/50 hover:text-white/80 transition self-start">Back to site</button>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;