
import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; // Updated import
import { motion } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

const LandingNavbar: React.FC = () => {
  const { theme } = useTheme();
  const isDarkHero = ['synthwave', 'halloween', 'forest', 'black', 'luxury', 'dracula', 'night', 'coffee', 'dim', 'sunset', 'dark'].includes(theme);
  const navLinkColor = isDarkHero ? 'text-white hover:text-gray-300' : 'text-neutral-content hover:text-neutral-focus';
  const btnOutlineColor = isDarkHero ? 'btn-outline-white text-white hover:bg-white hover:text-primary' : 'btn-outline-primary';

  return (
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="absolute top-0 left-0 right-0 p-4 sm:p-6 z-50 flex justify-between items-center"
    >
      <Link to="/" className={`text-3xl font-bold ${isDarkHero ? 'text-white' : 'text-primary'} text-shadow-sm`} aria-label="B4NTER Home"> {/* Updated usage */}
        B4NTER
      </Link>
      <div className="space-x-2 sm:space-x-3">
        <Link to="/login" className={`btn btn-sm sm:btn-md ${btnOutlineColor}`}>Login</Link> {/* Updated usage */}
        <Link to="/register" className="btn btn-sm sm:btn-md btn-primary hover:btn-secondary">Get Started</Link> {/* Updated usage */}
      </div>
    </motion.nav>
  );
};

interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  delay?: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 50 }}
    whileInView={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, delay }}
    viewport={{ once: true, amount: 0.3 }}
    className="card bg-base-100/80 backdrop-blur-md shadow-xl border border-base-content/10"
  >
    <div className="card-body items-center text-center p-6">
      <div className="p-4 bg-primary rounded-full inline-block mb-4 text-primary-content">
        <i className={`${icon} text-3xl`}></i>
      </div>
      <h3 className="card-title text-xl font-semibold text-primary">{title}</h3>
      <p className="text-base-content/80 text-sm">{description}</p>
    </div>
  </motion.div>
);

const LandingPage: React.FC = () => {
  const navigateHook = useNavigate(); // Updated usage
  const { theme } = useTheme();
  const isDarkThemeForHeroText = ['synthwave', 'halloween', 'forest', 'black', 'luxury', 'dracula', 'night', 'coffee', 'dim', 'sunset', 'dark'].includes(theme);
  const heroTextColor = isDarkThemeForHeroText ? 'text-neutral-content' : 'text-primary-content'; // Use neutral-content for better contrast on dark themes than primary-content sometimes

  return (
    <div className="flex flex-col min-h-screen w-full overflow-x-hidden">
      <LandingNavbar />

      {/* Hero Section */}
      <motion.section
        className={`relative flex flex-col items-center justify-center min-h-screen text-center p-6 sm:p-8 animated-gradient-bg ${heroTextColor}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 bg-black/20 z-0"></div> {/* Subtle overlay for text readability */}
        <div className="relative z-10 max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold mb-6 text-shadow-lg"
          >
            B4NTER: <span className="text-secondary">Dive</span> Into the Banterverse.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
            className="text-lg sm:text-xl mb-10 text-shadow-sm max-w-2xl mx-auto"
          >
            Share hilarious memes, anonymous secrets, hot takes, and connect with a vibrant community. Your daily dose of digital chatter starts here.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.7 }}
            className="space-x-3 sm:space-x-4"
          >
            <button onClick={() => navigateHook('/register')} className="btn btn-primary btn-lg hover:btn-secondary shadow-lg transform hover:scale-105 transition-transform">
              <i className="fas fa-user-plus mr-2"></i>Get Started
            </button>
            <button onClick={() => navigateHook('/login')} className="btn btn-outline btn-lg text-white border-white hover:bg-white hover:text-primary shadow-lg transform hover:scale-105 transition-transform">
              <i className="fas fa-sign-in-alt mr-2"></i>Login
            </button>
          </motion.div>
        </div>
        <motion.div 
          className="absolute bottom-10 text-2xl animate-bounce"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.5 }}
        >
          <i className="fas fa-chevron-down"></i>
        </motion.div>
      </motion.section>

      {/* Features Section */}
      <section className="py-16 sm:py-24 bg-base-200 px-4 sm:px-6">
        <div className="container mx-auto max-w-5xl">
          <motion.h2 
            initial={{ opacity: 0, y:20 }}
            whileInView={{ opacity: 1, y:0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, amount: 0.5 }}
            className="text-3xl sm:text-4xl font-bold text-center mb-12 sm:mb-16 text-primary"
          >
            Why You'll <span className="text-secondary">Love</span> B4NTER
          </motion.h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            <FeatureCard icon="fas fa-feather-alt" title="Share Freely" description="Post thoughts, confessions, or memes. Stay anonymous or build your rep with witty display names." delay={0} />
            <FeatureCard icon="fas fa-comments" title="Engage & React" description="Like, laugh, and discuss. Dive into lively comment threads and share your unique reactions." delay={0.15} />
            <FeatureCard icon="fas fa-trophy" title="Climb the Ranks" description="Earn Banter Points, unlock cool badges, and customize your avatar as you top the leaderboards." delay={0.3} />
            <FeatureCard icon="fas fa-users" title="Global Chat" description="Jump into real-time conversations with the entire community. Never a dull moment!" delay={0.45} />
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 sm:py-20 bg-gradient-to-r from-primary to-secondary text-primary-content px-4 sm:px-6">
        <div className="container mx-auto text-center max-w-3xl">
          <motion.h2 
            initial={{ opacity: 0, scale:0.9 }}
            whileInView={{ opacity: 1, scale:1 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true, amount: 0.5 }}
            className="text-3xl sm:text-4xl font-bold mb-6"
          >
            Ready to Join the Banter?
          </motion.h2>
          <motion.p 
            initial={{ opacity: 0, y:10 }}
            whileInView={{ opacity: 1, y:0 }}
            transition={{ duration: 0.6, delay:0.2 }}
            viewport={{ once: true, amount: 0.5 }}
            className="text-lg sm:text-xl mb-10 max-w-xl mx-auto opacity-90"
          >
            Don't miss out on the fun! Sign up today and let your voice be heard.
            The Banterverse awaits your unique spark.
          </motion.p>
          <motion.div 
            initial={{ opacity: 0, y:20 }}
            whileInView={{ opacity: 1, y:0 }}
            transition={{ duration: 0.6, delay:0.4 }}
            viewport={{ once: true, amount: 0.5 }}
            className="space-x-3 sm:space-x-4"
          >
            <button onClick={() => navigateHook('/register')} className="btn btn-lg btn-accent hover:opacity-80 shadow-lg transform hover:scale-105 transition-transform">
              Create Account
            </button>
            <button onClick={() => navigateHook('/login')} className="btn btn-lg btn-outline text-primary-content border-primary-content hover:bg-primary-content hover:text-primary shadow-lg transform hover:scale-105 transition-transform">
              Already a Banterer? Login
            </button>
          </motion.div>
        </div>
      </section>

      {/* Simple Footer for Landing Page */}
      <footer className="footer footer-center p-4 bg-base-300 text-base-content border-t border-base-content/10 text-xs sm:text-sm">
        <div>
          <p>Copyright © {new Date().getFullYear()} - B4NTER - All Rights Reserved.</p>
          <p>Current Theme: <span className="badge badge-ghost badge-sm">{theme}</span></p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
