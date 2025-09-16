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
  <div className="relative flex flex-col gap-6 bg-gradient-to-br from-[#FFB347] via-[#FF9933] to-[#FF6A00] rounded-2xl p-8 shadow-xl text-[#101418] overflow-hidden">
    <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/35 rounded-full blur-2xl" />
    <h1 className="text-3xl font-bold tracking-tight">Create Account</h1>
    <p className="text-sm font-medium leading-relaxed max-w-xs">Modern surveillance & crowd management suite. Create an account to start configuring cameras, maps and analytics.</p>
    <ul className="space-y-2 text-sm font-semibold">
      {['Instant Onboarding','Role Based Access','Secure Federated Login','Scalable API'].map(item => (
        <li key={item} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#101418]" /> {item}
        </li>
      ))}
    </ul>
    <div className="mt-auto pt-4 text-[11px] font-medium tracking-wider uppercase">Designed for Operational Teams</div>
  </div>
);

const BrandHeader = () => (
  <div className="w-full max-w-7xl mx-auto flex items-center justify-between px-2 sm:px-4 mb-6">
    <div className="flex items-center gap-2 select-none">
      <div className="h-6 w-6 rounded-md bg-gradient-to-br from-[#FFB347] via-[#FF9933] to-[#FF6A00]" />
      <span className="text-sm sm:text-base font-semibold tracking-tight text-white/90">DhruvAi</span>
    </div>
    <button
      onClick={() => window.location.assign('/')}
      className="text-xs sm:text-sm text-white/60 hover:text-white transition"
      aria-label="Back to site"
    >Back to site</button>
  </div>
);

const SignUpPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh relative flex flex-col items-stretch justify-start px-4 py-6 sm:py-10 bg-[#0B0F14] text-white overflow-hidden">
      <BgGrid />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-[#FF6A00]/12 rounded-full blur-3xl" />

      <BrandHeader />

      <div className="relative w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Promo / Left */}
        <div className="hidden md:flex md:col-span-7">
          <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-[#FFB347] via-[#FF9933] to-[#FF6A00] text-[#101418] border border-white/10 shadow-2xl backdrop-blur-md">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.65),rgba(255,255,255,0.15))] mix-blend-overlay pointer-events-none" />
            <div className="relative p-10 flex flex-col h-full">
              <div className="mb-8">
                <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Create your workspace</h1>
                <p className="mt-3 text-base font-medium text-[#101418]/80 max-w-md">Modern surveillance & crowd management suite. Start configuring cameras, maps and analytics in minutes.</p>
              </div>
              <ul className="space-y-2 text-sm font-semibold">
                {['Instant Onboarding','Role Based Access','Secure Federated Login','Scalable API'].map(item => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#101418]" /> {item}
                  </li>
                ))}
              </ul>
              <div className="mt-auto grid grid-cols-3 gap-4 pt-8">
                {[
                  { k: 'Setup Time', v: '5 min' },
                  { k: 'Tenants', v: 'Multi' },
                  { k: 'SSO', v: 'Ready' },
                ].map(({k,v}) => (
                  <div key={k} className="rounded-lg bg-white/25 border border-white/40 p-3 text-center">
                    <div className="text-lg font-extrabold tracking-tight">{v}</div>
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#101418]/70">{k}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Auth / Right */}
        <div className="md:col-span-5">
          <div className="rounded-xl border border-white/10 bg-[rgba(13,17,23,0.65)] shadow-2xl backdrop-blur-md overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-[#FFB347] via-[#FF9933] to-[#FF6A00]" />
            <div className="p-6 sm:p-8 md:p-10">
              <div className="mb-4">
                <h2 className="text-2xl font-semibold tracking-tight">Create account</h2>
                <p className="text-sm text-white/60 mt-1">Set up your organization workspace.</p>
              </div>
              <SignUp afterSignUpUrl="/" signInUrl="/sign-in" appearance={{ variables: { colorPrimary: '#FF6A00' } }} />
              <div className="mt-4 text-xs text-white/50">
                Already have an account?{' '}
                <button onClick={() => navigate('/sign-in')} className="text-[#FFB347] hover:text-[#FF9933] transition">Sign in</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUpPage;