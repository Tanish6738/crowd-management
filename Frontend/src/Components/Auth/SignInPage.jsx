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
  <div className="px-3 py-1 rounded-full text-[11px] font-medium bg-white/20 text-white/90 border border-white/30 shadow-sm backdrop-blur-sm">
    {label}
  </div>
);

const SignInPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTo = location.state?.from || '/';
  return (
    <div className="min-h-dvh relative flex items-center justify-center px-4 py-10 bg-neutral-950 text-white overflow-hidden">
      <BgDots />
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-orange-600/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-[520px] h-[520px] bg-emerald-600/20 rounded-full blur-3xl" />

      <div className="relative w-full max-w-6xl grid md:grid-cols-2 bg-white/5 border border-white/10 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-lg">
        {/* Marketing / left panel */}
        <div className="hidden md:flex flex-col justify-between p-10 bg-gradient-to-br from-amber-400 via-amber-400 to-orange-500 text-neutral-900 relative">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,#ffffff80,#ffffff20)] mix-blend-overlay pointer-events-none" />
          <div className="space-y-8 relative">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
              <p className="mt-2 text-sm font-medium text-neutral-800/80 max-w-xs leading-relaxed">
                Centralized surveillance & crowd intelligence platform. Secure, performant, actionable.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 max-w-xs">
              {['Real-time Feeds','Heatmaps','Anomaly Alerts','Multi-Tenant','Role Based','Audit Trail'].map(f => <FeaturePill key={f} label={f} />)}
            </div>
          </div>
          <div className="relative pt-8">
            <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-800/70">SECURE ACCESS</p>
            <p className="text-sm mt-1 font-semibold">Clerk Authentication Integrated</p>
          </div>
        </div>
        {/* Auth form */}
        <div className="p-6 sm:p-8 md:p-10 flex flex-col gap-6 bg-neutral-900/60">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Log in</h2>
            <p className="text-sm text-white/50 mt-1">Use your account or federated providers to continue.</p>
          </div>
          <div className="-mt-2">
            <SignIn afterSignInUrl={redirectTo} afterSignUpUrl="/" signUpUrl="/sign-up" />
            <button
              onClick={() => navigate('/')}
              className="mt-4 text-xs text-white/50 hover:text-white/80 transition"
            >Back to site</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignInPage;