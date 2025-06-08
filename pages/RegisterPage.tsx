
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
// Removed: import type { UserCredential as FirebaseUserCredential } from 'firebase/auth';
// Removed: import { createUserWithEmailAndPassword } from 'firebase/auth';
import { FirebaseError } from '@firebase/util'; // This specific import might need adjustment
import { ref, update, get, serverTimestamp as rtdbServerTimestamp } from 'firebase/database';
import { auth, db_rtdb } from '../firebase';
import AuthForm from '../components/AuthForm';
import { UserProfile, FirebaseUserCredential } from '../types'; // Added FirebaseUserCredential from types.ts
import { EARLY_ADOPTER_CUTOFF_TIMESTAMP } from '../utils/badges';
import { generateDefaultDicebear7xAvatarUrl } from '../utils/firebaseUtils';
import { motion } from 'framer-motion';
import { getUTCDateString } from '../utils/dateUtils'; // Import for default date strings

const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
    <path d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z" fill="#4285f4"/>
    <path d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z" fill="#34a853"/>
    <path d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z" fill="#fbbc04"/>
    <path d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C405 24.6 340.1 0 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z" fill="#ea4335"/>
  </svg>
);

const POINTS_INITIAL_PROFILE = 0;

const RegisterPage: React.FC = () => {
  const navigateHook = useNavigate();
  const locationHook = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { message: contextualMessage, redirectPath } = (locationHook.state as { message?: string; redirectPath?: string }) || {};

  useEffect(() => {
    setError(null);
  }, [locationHook.state]);

  const handleRegister = async (email: string, passwordOne: string, passwordTwo?: string, username?: string) => {
    setLoading(true);
    setError(null);
    let authUserCreated = false;

    if (!username) {
      setError("Username is your banter identity! It's required.");
      setLoading(false);
      return;
    }
    if (passwordOne !== passwordTwo) {
      setError("Passwords don't match. Double-check 'em!");
      setLoading(false);
      return;
    }

    try {
      const usernameToUidRef = ref(db_rtdb, `usernameToUid/${username.toLowerCase()}`);
      const usernameSnapshot = await get(usernameToUidRef);
      if (usernameSnapshot.exists()) {
        throw new Error("That username's already taken! Try another cool one.");
      }

      const userCredential: FirebaseUserCredential = await auth.createUserWithEmailAndPassword(email, passwordOne);
      authUserCreated = true;
      const user = userCredential.user;
      if (!user) {
        throw new Error("User creation failed, user object is null.");
      }
      const registrationTimestamp = new Date().getTime();
      const todayUTC = getUTCDateString();

      const initialPhotoURL = generateDefaultDicebear7xAvatarUrl(username || user.uid);
      const newUserProfile: UserProfile = {
        uid: user.uid,
        username: username,
        displayName: username,
        points: POINTS_INITIAL_PROFILE,
        createdAt: rtdbServerTimestamp() as any,
        lastActivityAt: rtdbServerTimestamp() as any,
        photoURL: initialPhotoURL,
        selectedAvatarFrameId: 'none',
        selectedAvatarFlairId: 'none',
        unlockedAvatarFrames: ['none'],
        unlockedAvatarFlairs: ['none'],
        unlockedPostFlairs: [],
        badges: [],
        postsAuthoredCount: 0,
        commentsAuthoredCount: 0,
        reactionsReceivedCount: 0,
        chatStreak: 0,
        longestChatStreak: 0,
        lastChatActivityDate: '',
        dailyMessageCount: 0,
        lastDailyMessageCountResetDate: '',
        awardedDailyMessageMilestones: {},
        awardedStreakMilestones: { '3day': false, '7day': false, '30day': false },
        isAdmin: false,
        isBanned: false,
        banReason: null, // Changed from undefined
        tempBanUntil: null, // Changed from undefined
        tempBanReason: null, // Changed from undefined
      };

      if (registrationTimestamp < EARLY_ADOPTER_CUTOFF_TIMESTAMP) {
        if (!newUserProfile.badges) newUserProfile.badges = [];
        newUserProfile.badges.push('banter_og');
      }

      const updates: { [key: string]: any } = {};
      updates[`userProfiles/${user.uid}`] = newUserProfile;
      updates[`usernameToUid/${username.toLowerCase()}`] = user.uid;

      await update(ref(db_rtdb), updates); // Critical write for profile

      // If all successful, navigate
      navigateHook(redirectPath || '/', { replace: true });

    } catch (err) {
      console.error("Registration error:", err);
      if (err instanceof FirebaseError) { // Firebase Auth errors
         switch (err.code) {
          case 'auth/email-already-in-use':
            setError("This email's already in the Banterverse! Try logging in.");
            break;
          case 'auth/invalid-email':
            setError("That email address doesn't look quite right.");
            break;
          case 'auth/weak-password':
            setError("Password's too weak! Min 6 characters, make it feisty!");
            break;
          default:
            setError(err.message || "Failed to register. The banter signal is weak!");
        }
      } else if (err instanceof Error) { // Errors from username check or RTDB update
        if (authUserCreated) { // Auth user was created, but profile save failed
            setError(`Account authentication succeeded, but profile setup failed: ${err.message}. Please contact support immediately.`);
            // Consider signing out the created user if profile save fails:
            // auth.signOut().catch(signOutError => console.error("Error signing out user after profile save failure:", signOutError));
        } else { // Error before auth user creation (e.g. username taken)
            setError(err.message);
        }
      } else {
        setError("An unknown error occurred during registration.");
      }
    } finally {
      setLoading(false);
    }
  };

  const switchToLogin = () => {
    navigateHook('/login', { state: { redirectPath } });
  };

  const handleGoogleSignIn = () => {
    console.log("Continue with Google clicked for Register");
    setError("Google Sign-Up is on a top-secret mission (not ready yet).");
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

        {/* Right Panel - Register Form */}
        <div className="w-full md:w-1/2 p-8 sm:p-10 flex flex-col items-center justify-center text-base-content">
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
            className="w-full max-w-sm space-y-5"
          >
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold text-primary">Join the Banterverse!</h2>
              <p className="text-sm text-base-content/70 mt-1">Create your account and start sharing.</p>
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
                <span className="px-2 bg-base-100/0 text-base-content/70">or Sign up with Email</span>
              </div>
            </div>

            <AuthForm
              isRegister
              onSubmit={handleRegister}
              loading={loading}
              error={error}
              contextualMessage={contextualMessage}
              onSwitchForm={switchToLogin}
            />
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
