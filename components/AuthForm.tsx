
import React, { useState, FormEvent } from 'react';
import { AuthFormProps } from '../types';
import LoadingSpinner from './LoadingSpinner';

const AuthForm: React.FC<AuthFormProps> = ({ 
  isRegister = false, 
  onSubmit, 
  loading, 
  error, 
  contextualMessage, 
  onSwitchForm 
}) => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [passwordOne, setPasswordOne] = useState('');
  const [passwordTwo, setPasswordTwo] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null); 

    if (isRegister) {
      if (!username.trim()) {
        setFormError("Username is required.");
        return;
      }
      if (username.trim().length < 3) {
        setFormError("Username must be at least 3 characters long.");
        return;
      }
      if (username.trim().length > 20) {
        setFormError("Username cannot exceed 20 characters.");
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
        setFormError("Username can only contain letters, numbers, and underscores.");
        return;
      }
      if (passwordOne !== passwordTwo) {
        setFormError("Passwords do not match.");
        return;
      }
    }
    
    if (!email || !passwordOne || (isRegister && !passwordTwo)) {
        setFormError("Please fill in all required fields.");
        return;
    }

    try {
        await onSubmit(email, passwordOne, isRegister ? passwordTwo : undefined, isRegister ? username : undefined);
    } catch (err) {
        // Error is handled by parent component's 'error' prop
    }
  };

  return (
    <div className="w-full max-w-md"> 
        <form onSubmit={handleSubmit} noValidate className="space-y-3"> 
            {contextualMessage && (
            <div role="alert" className="alert alert-info text-sm p-2.5"> 
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-5 h-5 mr-2"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span>{contextualMessage}</span>
            </div>
            )}
            <div className="form-control">
            <label className="label pb-1 pt-0" htmlFor="email-input">
                <span className="label-text text-xs font-medium text-base-content/80">Email</span>
            </label>
            <input 
                id="email-input"
                type="email" 
                placeholder="you@example.com" 
                className="input input-bordered input-sm w-full text-sm" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required aria-required="true" autoComplete="email"
            />
            </div>

            {isRegister && (
              <div className="form-control">
                <label className="label pb-1 pt-0" htmlFor="username-input">
                  <span className="label-text text-xs font-medium text-base-content/80">Username</span>
                </label>
                <input 
                  id="username-input"
                  type="text" 
                  placeholder="YourUniqueAlias" 
                  className="input input-bordered input-sm w-full text-sm" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required aria-required="true" autoComplete="username"
                  minLength={3} maxLength={20}
                />
              </div>
            )}

            <div className="form-control">
            <label className="label pb-1 pt-0" htmlFor="password-input">
                <span className="label-text text-xs font-medium text-base-content/80">Password</span>
            </label>
            <input 
                id="password-input"
                type="password" 
                placeholder="••••••••" 
                className="input input-bordered input-sm w-full text-sm" 
                value={passwordOne}
                onChange={(e) => setPasswordOne(e.target.value)}
                required aria-required="true"
                autoComplete={isRegister ? "new-password" : "current-password"}
            />
            </div>
            {isRegister && (
            <div className="form-control">
                <label className="label pb-1 pt-0" htmlFor="confirm-password-input">
                <span className="label-text text-xs font-medium text-base-content/80">Confirm Password</span>
                </label>
                <input 
                id="confirm-password-input"
                type="password" 
                placeholder="••••••••" 
                className="input input-bordered input-sm w-full text-sm" 
                value={passwordTwo}
                onChange={(e) => setPasswordTwo(e.target.value)}
                required aria-required="true" autoComplete="new-password"
                />
            </div>
            )}

            {!isRegister && (
              <div className="flex items-center justify-between text-xs">
                <label htmlFor="remember-me" className="flex items-center cursor-pointer">
                  <input id="remember-me" type="checkbox" className="checkbox checkbox-xs checkbox-primary mr-1.5" /> 
                  <span className="text-base-content/70">Remember Me</span>
                </label>
                <a href="#" className="font-medium text-primary hover:text-secondary hover:underline">Forgot Password?</a>
              </div>
            )}

            {(error || formError) && (
            <div role="alert" className="alert alert-error text-sm p-2.5" aria-live="polite"> 
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-5 w-5 mr-1.5" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>{error || formError}</span>
            </div>
            )}
            <div className="form-control pt-1">
            <button 
                type="submit" 
                className="btn btn-primary btn-md w-full text-sm font-semibold"
                disabled={loading}
            >
                {loading ? <LoadingSpinner size="xs" /> : (isRegister ? 'Create Account' : 'Login')}
            </button>
            </div>
            {onSwitchForm && (
                <div className="text-center mt-4"> 
                {isRegister ? (
                    <p className="text-xs text-base-content/70">
                    Already have an account? <button type="button" onClick={onSwitchForm} className="font-medium text-primary hover:text-secondary hover:underline">Login</button>
                    </p>
                ) : (
                    <p className="text-xs text-base-content/70">
                    Not Registered Yet? <button type="button" onClick={onSwitchForm} className="font-medium text-primary hover:text-secondary hover:underline">Create an account</button>
                    </p>
                )}
                </div>
            )}
        </form>
    </div>
  );
};

export default AuthForm;
