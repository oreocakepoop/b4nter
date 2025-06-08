

import React, { useEffect, useState, useCallback, useRef } from 'react';
// Removed: import type { User as FirebaseUser } from 'firebase/auth'; // Error: Module '"firebase/auth"' has no exported member 'User'.
import { ref, onValue, off, serverTimestamp, push, set, query, orderByChild, limitToLast, runTransaction, remove, update, onDisconnect, Unsubscribe, get } from 'firebase/database';
import { motion, AnimatePresence } from 'framer-motion';

import { auth, db_rtdb } from '../firebase'; 
import type { UserProfile, ChatModalProps as ComponentChatModalProps, ChatMessageData, ChatUser, FirebaseUser } from '../types'; // Aliased import, FirebaseUser comes from here
import LoadingSpinner from './LoadingSpinner';
import { NewChatInterface } from './ChatInterface'; // Corrected to named import
import NewChatUserList from './ChatUserList';  // Corrected to default import
import { generateDefaultDicebear7xAvatarUrl } from '../utils/firebaseUtils';
import { checkAndUpdateChatStreak, checkAndUpdateDailyMessageCount, checkAndAwardFirstMessageOfTheDay } from '../utils/gamificationUtils'; 

const MAX_CHAT_MESSAGES = 100;
const SYSTEM_BOT_AVATAR_URL = "https://api.dicebear.com/7.x/bottts/svg?seed=BanterBot&backgroundColor=transparent&mouth=smile01,smile02&sides=antenna01,antenna02&top=short01,short02"; // Example bot avatar

const ChatModal: React.FC<ComponentChatModalProps> = ({ isOpen, onClose, currentUser, userProfile, openAuthPage }) => {
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [activeUsers, setActiveUsers] = useState<ChatUser[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  
  const onDisconnectRef = useRef<any>(null);
  const userPresencePathRef = useRef<string | null>(null);
  const usersListenerUnsubscribeRef = useRef<Unsubscribe | null>(null);
  const messagesListenerUnsubscribeRef = useRef<Unsubscribe | null>(null);


  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
      if (currentUser && userProfile) {
        setupPresenceManagement();
        setupMessagesListener();
      } else if (!currentUser && isOpen) {
        onClose(); 
        openAuthPage('login', 'Please log in to join the Global Chat!', '/');
      }
    } else {
      dialogRef.current?.close();
      cleanupPresenceManagement();
      cleanupMessagesListener();
      setMessages([]);
      setActiveUsers([]);
      setIsLoadingMessages(true);
      setIsLoadingUsers(true);
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, currentUser, userProfile]); 

  useEffect(() => {
    const dialog = dialogRef.current;
    const handleDialogCloseEvent = () => { if (isOpen) onClose(); };
    dialog?.addEventListener('close', handleDialogCloseEvent);
    return () => {
        dialog?.removeEventListener('close', handleDialogCloseEvent);
        // Ensure cleanup happens if modal is closed by Escape key or other means
        if (isOpen) { // Only run full cleanup if it was open, to avoid issues on initial mount/unmount
            cleanupPresenceManagement();
            cleanupMessagesListener();
        }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, isOpen]); 


  const setupPresenceManagement = useCallback(() => {
    if (!currentUser || !userProfile || userPresencePathRef.current) return; 

    userPresencePathRef.current = `globalChat/activeUsers/${currentUser.uid}`;
    const userPresenceRefForEffect = ref(db_rtdb, userPresencePathRef.current);
    const allUsersRef = ref(db_rtdb, 'globalChat/activeUsers');
    
    const userData: ChatUser = {
      uid: currentUser.uid,
      username: userProfile.username || userProfile.displayName || 'AnonymousBanterer',
      photoURL: userProfile.photoURL || generateDefaultDicebear7xAvatarUrl(currentUser.uid),
      selectedAvatarFrameId: userProfile.selectedAvatarFrameId,
      selectedAvatarFlairId: userProfile.selectedAvatarFlairId,
      chatStreak: userProfile.chatStreak || 0,
      lastSeen: serverTimestamp(),
      isTyping: false,
    };

    onDisconnectRef.current = onDisconnect(userPresenceRefForEffect);
    onDisconnectRef.current.remove()
      .then(() => set(userPresenceRefForEffect, userData))
      .catch((err: any) => {
        console.error("Error setting up onDisconnect.remove() or initial presence:", err);
        set(userPresenceRefForEffect, userData).catch(e => console.error("Error setting initial presence (fallback):", e));
      });

    usersListenerUnsubscribeRef.current = onValue(allUsersRef, (snapshot) => {
      setIsLoadingUsers(true);
      const usersData = snapshot.val();
      const loadedUsers: ChatUser[] = usersData ? Object.values(usersData) : [];
      setActiveUsers(loadedUsers.sort((a,b) => (b.lastSeen as number) - (a.lastSeen as number)));
      setIsLoadingUsers(false);
    }, (err) => {
      console.error("Error fetching active users:", err);
      setError("Could not load user list.");
      setIsLoadingUsers(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser, userProfile]);

  const cleanupPresenceManagement = useCallback(() => {
    if (usersListenerUnsubscribeRef.current) {
      off(ref(db_rtdb, 'globalChat/activeUsers'), 'value', usersListenerUnsubscribeRef.current);
      usersListenerUnsubscribeRef.current = null;
    }
    if (onDisconnectRef.current) {
      onDisconnectRef.current.cancel();
      onDisconnectRef.current = null;
    }
    if (userPresencePathRef.current) {
      remove(ref(db_rtdb, userPresencePathRef.current)).catch(err => console.warn("Could not clean up user presence on close:", err));
      userPresencePathRef.current = null;
    }
  }, []);

  const setupMessagesListener = useCallback(() => {
    const messagesRef = query(ref(db_rtdb, 'globalChat/messages'), orderByChild('timestamp'), limitToLast(MAX_CHAT_MESSAGES));
    messagesListenerUnsubscribeRef.current = onValue(messagesRef, (snapshot) => {
      setIsLoadingMessages(true);
      const messagesData = snapshot.val();
      const loadedMessages: ChatMessageData[] = messagesData ? Object.keys(messagesData).map(key => ({ id: key, ...messagesData[key] })) : [];
      setMessages(loadedMessages);
      setIsLoadingMessages(false);
    }, (err) => {
      console.error("Error fetching chat messages:", err);
      setError("Could not load messages.");
      setIsLoadingMessages(false);
    });
  }, []);

  const cleanupMessagesListener = useCallback(() => {
    if (messagesListenerUnsubscribeRef.current) {
      // Correct way to use 'off' with a query
      const messagesQuery = query(ref(db_rtdb, 'globalChat/messages'), orderByChild('timestamp'), limitToLast(MAX_CHAT_MESSAGES));
      off(messagesQuery, 'value', messagesListenerUnsubscribeRef.current);
      messagesListenerUnsubscribeRef.current = null;
    }
  }, []);

  const handleSendMessage = async (text: string) => {
    if (!currentUser || !userProfile) {
      setError("You must be logged in to send messages.");
      openAuthPage('login', "Log in to send messages.", '/');
      return;
    }
    if (!text.trim()) return;

    const firstMessageCheck = await checkAndAwardFirstMessageOfTheDay(currentUser.uid, userProfile.username);
    if (firstMessageCheck.wasFirst) {
        const systemMessageId = push(ref(db_rtdb, 'globalChat/messages')).key;
        if (systemMessageId) {
            const systemMsg: ChatMessageData = {
                id: systemMessageId,
                userId: 'system',
                username: 'BanterBot',
                userPhotoURL: SYSTEM_BOT_AVATAR_URL,
                text: `${userProfile.username} got the first message of the day! +${firstMessageCheck.pointsAwarded} points! 🎉`,
                timestamp: serverTimestamp(),
                type: 'system_firstMessage',
            };
            await set(ref(db_rtdb, `globalChat/messages/${systemMessageId}`), systemMsg);
        }
    }
    
    await checkAndUpdateChatStreak(currentUser.uid);
    await checkAndUpdateDailyMessageCount(currentUser.uid);

    // Fetch the latest profile data for streak to include in message
    const updatedProfileSnapshot = await get(ref(db_rtdb, `userProfiles/${currentUser.uid}`));
    const updatedProfileData = updatedProfileSnapshot.val() as UserProfile | null;

    const newMessage: Omit<ChatMessageData, 'id'> = {
      userId: currentUser.uid,
      username: userProfile.username || userProfile.displayName || 'AnonymousBanterer',
      userPhotoURL: userProfile.photoURL || generateDefaultDicebear7xAvatarUrl(currentUser.uid),
      userSelectedFrameId: userProfile.selectedAvatarFrameId,
      userSelectedFlairId: userProfile.selectedAvatarFlairId,
      userChatStreak: updatedProfileData?.chatStreak || userProfile.chatStreak || 0,
      text: text.trim(),
      timestamp: serverTimestamp(),
      type: 'user',
    };
    try {
      const newMessageRef = push(ref(db_rtdb, 'globalChat/messages'));
      await set(newMessageRef, newMessage);

      // Update user's lastSeen timestamp in activeUsers
      if (userPresencePathRef.current) {
         await update(ref(db_rtdb, userPresencePathRef.current), { 
            lastSeen: serverTimestamp(),
            chatStreak: updatedProfileData?.chatStreak || userProfile.chatStreak || 0 // Also update streak here
         });
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError("Failed to send message. Please try again.");
      throw err; // Re-throw so input component can handle its sending state
    }
  };

  if (!isOpen && !currentUser) return null; // Fully closed or user logged out

  const modalBoxStyle: React.CSSProperties = { maxHeight: '85vh', height: '85vh', width: '90vw', maxWidth: '1200px' };

  return (
    <dialog id="chat_modal" className="modal modal-bottom sm:modal-middle" ref={dialogRef}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="modal-box p-0 flex flex-col overflow-hidden"
            style={modalBoxStyle}
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
          >
            <div className="flex justify-between items-center p-3 border-b border-base-300 bg-base-100 shrink-0">
              <h3 className="font-bold text-lg text-primary flex items-center">
                <i className="fas fa-comments mr-2"></i>Global Banter Chat
              </h3>
              <form method="dialog">
                <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose} aria-label="Close chat">✕</button>
              </form>
            </div>

            {error && (
              <div role="alert" className="alert alert-error text-xs m-2 p-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Error: {error}</span>
                <button className="btn btn-xs btn-ghost" onClick={() => setError(null)}>Clear</button>
              </div>
            )}
            
            <div className="flex flex-1 overflow-hidden min-h-0"> {/* Ensure this div takes remaining space and allows children to scroll */}
              {currentUser && userProfile ? (
                <>
                  <NewChatInterface
                    currentUser={currentUser}
                    userProfile={userProfile} // Pass userProfile here
                    messages={messages}
                    activeUsers={activeUsers}
                    onSendMessage={handleSendMessage}
                    isLoadingMessages={isLoadingMessages}
                    isLoadingUsers={isLoadingUsers}
                  />
                  <NewChatUserList activeUsers={activeUsers} isLoadingUsers={isLoadingUsers} />
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                  <LoadingSpinner size="lg" className="text-primary mb-4" />
                  <p className="text-base-content/70">Connecting to the Banterverse...</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <form method="dialog" className="modal-backdrop">
        <button type="button" onClick={onClose}>close</button>
      </form>
    </dialog>
  );
};

export default ChatModal;
