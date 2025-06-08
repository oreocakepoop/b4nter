
import React from 'react';
import { motion } from 'framer-motion';
// Removed: import type { User as FirebaseUser } from 'firebase/auth'; 
import { FirebaseUser } from '../types'; // Added FirebaseUser

interface CreatePostFABProps {
  currentUser: FirebaseUser | null; // Updated type
  openAuthModal: (type: 'login' | 'register', message?: string, redirectPath?: string) => void; // Name kept for prop compatibility
  setIsCreatePostModalOpen: (isOpen: boolean) => void;
}

const FABVariants = {
  hidden: { scale: 0, opacity: 0, y: 50 },
  visible: { scale: 1, opacity: 1, y: 0, transition: { type: 'spring', stiffness: 260, damping: 20, delay: 0.3 } },
};

const CreatePostFAB: React.FC<CreatePostFABProps> = ({
  currentUser,
  openAuthModal,
  setIsCreatePostModalOpen,
}) => {
  const handleClick = () => {
    if (currentUser) {
      setIsCreatePostModalOpen(true);
    } else {
      openAuthModal('login', "Want to share some banter? Please log in or register.", window.location.hash.substring(1) || '/');
    }
  };

  return (
    <motion.button
      variants={FABVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ scale: 1.1, rotate: 5 }}
      whileTap={{ scale: 0.9 }}
      className="fixed bottom-6 right-6 btn btn-primary btn-circle btn-lg shadow-xl" 
      onClick={handleClick}
      aria-label="Share new banter"
      title="Share New Banter"
    >
      <i className="fas fa-feather-alt text-2xl"></i> 
    </motion.button>
  );
};

export default CreatePostFAB;
