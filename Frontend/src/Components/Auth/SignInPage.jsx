import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { useLocation, useNavigate } from 'react-router-dom';

// Decorative dotted background (restored)
const BgDots = () => (
  <svg className="absolute inset-0 w-full h-full opacity-[0.07] text-white pointer-events-none" aria-hidden="true">
    <defs>
      <pattern id="dots" width="32" height="32" patternUnits="userSpaceOnUse">
        <circle cx="1" cy="1" r="1" fill="currentColor" />
      </pattern>
      <radialGradient id="fade" cx="50%" cy="50%" r="75%">
        <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
        <stop offset="80%" stopColor="#fff" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#dots)" />
    <rect width="100%" height="100%" fill="url(#fade)" />
  </svg>
);

const FeaturePill = ({ label }) => (
  <div className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/25 text-[#101418] border border-white/40 shadow-sm backdrop-blur-sm">
    {label}
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

const SignInPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTo = location.state?.from || '/';
  return (
    <div className="min-h-dvh relative flex flex-col items-stretch justify-start px-4 py-6 sm:py-10 bg-[#0B0F14] text-white overflow-hidden">
      <BgDots />
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-[#FF6A00]/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-[520px] h-[520px] bg-[#FF9933]/20 rounded-full blur-3xl" />

      <BrandHeader />

      <div className="relative w-full max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Promo / Left */}
        <div className="hidden md:flex md:col-span-7">
          <div className="relative w-full rounded-2xl overflow-hidden bg-gradient-to-br from-[#FFB347] via-[#FF9933] to-[#FF6A00] text-[#101418] border border-white/10 shadow-2xl backdrop-blur-md">
            <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.65),rgba(255,255,255,0.15))] mix-blend-overlay pointer-events-none" />
            <div className="relative p-10 flex flex-col h-full">
              <div className="mb-8">
                <h1 className="text-4xl font-extrabold leading-tight tracking-tight">Welcome back to your command center</h1>
                <p className="mt-3 text-base font-medium text-[#101418]/80 max-w-md">Monitor live feeds, detect anomalies, and act in seconds. Your secure access gateway to CrowdIQ.</p>
              </div>
              <div className="flex flex-wrap gap-2 max-w-md">
                {['Real-time Feeds','Heatmaps','Anomaly Alerts','Multi-Tenant','Role Based','Audit Trail'].map(f => <FeaturePill key={f} label={f} />)}
              </div>
              <div className="mt-auto grid grid-cols-3 gap-4 pt-8">
                {[
                  { k: 'Uptime', v: '99.99%' },
                  { k: 'Regions', v: '12+' },
                  { k: 'Alerts/Day', v: '5k+' },
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
                <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
                <p className="text-sm text-white/60 mt-1">Use your organization account or federated providers.</p>
              </div>
              <div className="-mt-2">
                <SignIn afterSignInUrl={redirectTo} afterSignUpUrl="/" signUpUrl="/sign-up" appearance={{ variables: { colorPrimary: '#FF6A00' } }} />
                <div className="mt-4 text-xs text-white/50">
                  Don’t have an account?{' '}
                  <button onClick={() => navigate('/sign-up')} className="text-[#FFB347] hover:text-[#FF9933] transition">Create one</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;