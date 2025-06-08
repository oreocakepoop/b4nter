
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom'; 
import { FirebaseError } from '@firebase/util';
import { auth, db_rtdb } from '../firebase';
import { ref, get } from 'firebase/database'; // Added for RTDB get
import AuthForm from '../components/AuthForm';
import { motion } from 'framer-motion';
import { UserProfile } from '../types'; // Added UserProfile type

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
    <path d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z" fill="#4285f4"/>
    <path d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z" fill="#34a853"/>
    <path d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z" fill="#fbbc04"/>
    <path d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 340.1 0 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z" fill="#ea4335"/>
  </svg>
);

const LoginPage: React.FC = () => {
  const navigateHook = useNavigate(); 
  const locationHook = useLocation(); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null); 
  
  const { message: contextualMessage, redirectPath } = (locationHook.state as { message?: string; redirectPath?: string }) || {};

  useEffect(() => {
    setError(null); 
  }, [locationHook.state]);

  const handleLogin = async (email: string, passwordOne: string) => {
    setLoading(true);
    setError(null);
    try {
      const userCredential = await auth.signInWithEmailAndPassword(email, passwordOne);
      const user = userCredential.user;

      if (user) {
        const userProfileRef = ref(db_rtdb, `userProfiles/${user.uid}`);
        const profileSnapshot = await get(userProfileRef);

        if (!profileSnapshot.exists()) {
          // Critical: Profile does not exist for an authenticated user.
          await auth.signOut(); // Sign out the user to prevent inconsistent state
          setError("Login Error: User account data is missing. Please contact support or try registering again if this is a new account.");
          setLoading(false);
          console.error(`Login Error: Profile not found for UID ${user.uid}. User signed out.`);
          return; // Stop login process
        }
        
        const profileData = profileSnapshot.val() as UserProfile;

        if (profileData.isBanned) {
          await auth.signOut();
          setError(`Account Banned: Your account has been permanently banned. Reason: ${profileData.banReason || 'Not specified.'}`);
          setLoading(false);
          return;
        }

        if (profileData.tempBanUntil && profileData.tempBanUntil > Date.now()) {
          const expiryDate = new Date(profileData.tempBanUntil).toLocaleString();
          // User is temp banned but can still log in to view content. Error message should reflect this.
          // The original setError would block login which is not desired for temp ban view-only access.
          // For now, let's keep the current behavior of showing the message via setError and allowing login.
          // A more nuanced approach might use a different state for "restricted access info" vs "login blocking error".
          setError(`Account Restricted: Your account is temporarily restricted until ${expiryDate}. Reason: ${profileData.tempBanReason || 'Not specified.'} You can still view content, but some actions may be limited.`);
          // Login proceeds, so don't return here. We'll fall through to navigate.
        }
      }
      
      navigateHook(redirectPath || '/', { replace: true });

    } catch (err) {
      if (err instanceof FirebaseError) {
        switch (err.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            setError("Login Error: Invalid email or password. Try again!");
            break;
          case 'auth/invalid-email':
            setError("Login Error: That email address doesn't look right.");
            break;
          case 'auth/too-many-requests':
            setError("Login Error: Too many attempts! Try again later or reset password.");
            break;
          default:
            setError("Login Error: Login failed. Check your credentials.");
        }
      } else {
        setError("Login Error: An unexpected hiccup during login. Spooky!");
      }
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const switchToRegister = () => {
    navigateHook('/register', { state: { redirectPath } });
  };

  const handleGoogleSignIn = () => {
    console.log("Continue with Google clicked");
    setError("Google Sign-In is currently on a coffee break.");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 animated-gradient-bg text-neutral-content relative overflow-hidden">
      <motion.div 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="absolute top-0 left-0 p-4 sm:p-6 z-20"
      >
        <Link to="/" className="text-3xl font-bold text-white text-shadow-sm hover:opacity-80 transition-opacity" aria-label="B4NTER Home">
          B4NTER
        </Link>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        className="w-full max-w-4xl bg-base-100/80 backdrop-blur-md shadow-2xl rounded-xl overflow-hidden flex flex-col md:flex-row z-10"
      >
        {/* Left Panel - Illustration & Text */}
        <div className="w-full md:w-1/2 p-8 sm:p-10 flex flex-col items-center justify-center bg-primary/10 text-primary-content order-2 md:order-1">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="max-w-md text-center"
          >
            <div className="w-full h-56 sm:h-64 bg-contain bg-no-repeat bg-center mb-6 sm:mb-8" style={{backgroundImage: "url('https://storage.googleapis.com/pai-images/c7d69d8e51706611.png')"}}>
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold mb-4">
              Unleash Your Inner Wit.
            </h1>
            <p className="text-lg opacity-90">
              Join the ultimate chat fest, share your thoughts, and climb the leaderboards!
            </p>
          </motion.div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="w-full md:w-1/2 p-8 sm:p-10 flex flex-col items-center justify-center text-base-content">
          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="w-full max-w-sm space-y-5" // Reduced space-y for tighter look
          >
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold text-primary">Welcome Back, Banterer!</h2>
              <p className="text-sm text-base-content/70 mt-1">Log in to dive back into the chatter.</p>
            </div>

            <button 
              onClick={handleGoogleSignIn}
              className="btn btn-outline border-base-content/30 text-base-content/80 hover:bg-secondary hover:border-secondary hover:text-secondary-content w-full"
              type="button"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center" aria-hidden="true">
                <div className="w-full border-t border-base-content/20" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="px-2 bg-base-100/0 text-base-content/70">or Sign in with Email</span>
              </div>
            </div>
            
            <AuthForm
              onSubmit={handleLogin}
              loading={loading}
              error={error} 
              contextualMessage={contextualMessage}
              onSwitchForm={switchToRegister}
              isRegister={false}
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
