import React from 'react';
import { SignUp } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';

const SignUpPage = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-dvh mk-gradient-bg flex items-center justify-center px-4 py-10">
      <div className="mk-panel p-4 rounded-xl shadow-lg">
        <SignUp
          appearance={{ variables: { colorPrimary: 'var(--mk-accent)' } }}
          afterSignUpUrl="/"
          signInUrl="/sign-in"
        />
        <button onClick={() => navigate('/')} className="mt-3 text-xs mk-text-muted hover:mk-text-secondary transition">Back</button>
      </div>
    </div>
  );
};

export default SignUpPage;