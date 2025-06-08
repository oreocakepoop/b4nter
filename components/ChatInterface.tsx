
// components/ChatInterface.tsx - To be treated as NewChatInterface.tsx
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserProfile, ChatMessageData, ChatUser, FirebaseUser } from '../types'; 
import { NewChatMessage } from './ChatMessage'; // Corrected to named import - this should now work with the updated ChatMessage.tsx
import NewChatMessageInput from './ChatMessageInput'; // Corrected to default import
import LoadingSpinner from './LoadingSpinner';
import ChatMessageSkeleton from './skeletons/ChatMessageSkeleton'; 

interface NewChatInterfaceProps {
  currentUser: FirebaseUser;
  userProfile: UserProfile; // Added userProfile prop
  messages: ChatMessageData[];
  activeUsers: ChatUser[];
  onSendMessage: (text: string) => Promise<void>;
  isLoadingMessages: boolean;
  isLoadingUsers: boolean;
}

export const NewChatInterface: React.FC<NewChatInterfaceProps> = ({
  currentUser,
  userProfile, // Destructure userProfile
  messages,
  activeUsers,
  onSendMessage,
  isLoadingMessages,
  isLoadingUsers,
}) => {
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isFirstLoadRef = useRef(true);
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    if (isFirstLoadRef.current && isLoadingMessages) {
      return;
    }
    
    if (messages.length > 0) {
        if (isFirstLoadRef.current) {
            scrollToBottom('auto'); 
            isFirstLoadRef.current = false;
        } else {
            const { scrollHeight, scrollTop, clientHeight } = container;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 150; 
            if (isNearBottom) {
                scrollToBottom();
            }
        }
    }
  }, [messages, isLoadingMessages, scrollToBottom]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-base-100"> {/* Ensure it takes space and allows child scrolling */}
      <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1 custom-scrollbar">
        <AnimatePresence initial={false}>
          {isLoadingMessages && messages.length === 0 ? (
            <ChatMessageSkeleton count={8} />
          ) : !isLoadingMessages && messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y:10 }} animate={{ opacity:1, y:0 }}
              className="text-center text-sm text-base-content/60 py-10"
            >
              <i className="fas fa-comments text-3xl mb-3 opacity-50"></i>
              <p>No messages yet. Be the first to break the ice!</p>
            </motion.div>
          ) : (
            messages.map(msg => (
              <NewChatMessage
                key={msg.id}
                message={msg}
                isCurrentUser={msg.userId === currentUser.uid}
              />
            ))
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>
      <NewChatMessageInput 
        userProfile={userProfile} // Pass userProfile
        onSendMessage={onSendMessage} 
        isSending={isSendingMessage}
        setIsSending={setIsSendingMessage}
      />
    </div>
  );
};
