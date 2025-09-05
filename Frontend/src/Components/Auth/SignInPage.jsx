import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { useLocation, useNavigate } from 'react-router-dom';

const SignInPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const redirectTo = location.state?.from || '/';
  return (
    <div className="min-h-dvh mk-gradient-bg flex items-center justify-center px-4 py-10">
      <div className="mk-panel p-4 rounded-xl shadow-lg">
        <SignIn
          appearance={{ variables: { colorPrimary: 'var(--mk-accent)' } }}
          afterSignInUrl={redirectTo}
          afterSignUpUrl="/"
          signUpUrl="/sign-up"
        />
        <button onClick={() => navigate('/')} className="mt-3 text-xs mk-text-muted hover:mk-text-secondary transition">Back</button>
      </div>
    </div>
  );
};

export default SignInPage;