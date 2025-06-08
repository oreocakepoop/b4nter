
// components/ChatMessageInput.tsx - To be treated as NewChatMessageInput.tsx
import React, { useState, KeyboardEvent, useRef } from 'react';
import { motion } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';
import { UserProfile } from '../types'; // Added UserProfile

interface NewChatMessageInputProps {
  userProfile: UserProfile | null; // Added userProfile prop
  onSendMessage: (text: string) => Promise<void>;
  isSending: boolean;
  setIsSending: (isSending: boolean) => void;
}

const MAX_MESSAGE_LENGTH = 500;

const NewChatMessageInput: React.FC<NewChatMessageInputProps> = ({ userProfile, onSendMessage, isSending, setIsSending }) => {
  const [messageText, setMessageText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isPermanentlyBanned = userProfile?.isBanned === true;
  const isTemporarilyBanned = userProfile?.tempBanUntil && userProfile.tempBanUntil > Date.now();
  let banMessage: string | null = null;

  if (isPermanentlyBanned) {
    banMessage = `Your account is permanently banned. Reason: ${userProfile?.banReason || 'Not specified.'} You cannot send messages.`;
  } else if (isTemporarilyBanned && userProfile?.tempBanUntil) {
    const expiryDate = new Date(userProfile.tempBanUntil).toLocaleString();
    banMessage = `Your account is temporarily restricted from sending messages until ${expiryDate}. Reason: ${userProfile?.tempBanReason || 'Not specified.'}`;
  }
  const canSendMessage = userProfile && !isPermanentlyBanned && !isTemporarilyBanned;

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; 
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`; 
    }
    if (error) setError(null);
  };

  const handleSubmit = async () => {
    if (!canSendMessage) {
        setError(banMessage || "You are currently restricted from sending messages.");
        return;
    }
    if (!messageText.trim() || isSending) return;
    if (messageText.length > MAX_MESSAGE_LENGTH) {
      setError(`Max ${MAX_MESSAGE_LENGTH} characters.`);
      return;
    }
    setIsSending(true);
    setError(null);
    try {
      await onSendMessage(messageText);
      setMessageText('');
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'; // Reset height
      }
    } catch (err) {
      console.error("Error sending message from input:", err);
      setError("Failed to send. Try again.");
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-2 sm:p-3 border-t border-base-300 bg-base-200">
      {banMessage && (
        <div role="alert" className={`alert ${isPermanentlyBanned ? 'alert-error' : 'alert-warning'} text-xs p-1.5 mb-1.5`}>
          <i className={`fas ${isPermanentlyBanned ? 'fa-ban' : 'fa-clock'} mr-1.5`}></i>
          {banMessage}
        </div>
      )}
      <div className="flex items-end space-x-2">
        <textarea
          ref={textareaRef}
          value={messageText}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type your banter..."
          className="flex-grow py-2.5 px-4 bg-base-100 border border-base-300 rounded-full text-sm resize-none focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all duration-150 ease-in-out overflow-y-hidden max-h-36 shadow-sm"
          rows={1}
          maxLength={MAX_MESSAGE_LENGTH + 20} // Allow a bit more for visual typing before clamping
          disabled={isSending || !canSendMessage}
          aria-label="Chat message input"
          style={{ lineHeight: '1.6' }} 
        />
        <motion.button
          onClick={handleSubmit}
          disabled={!messageText.trim() || isSending || messageText.length > MAX_MESSAGE_LENGTH || !canSendMessage}
          className="btn btn-primary btn-circle btn-md shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-focus disabled:opacity-70 disabled:bg-opacity-70"
          whileHover={{ scale: (isSending || !canSendMessage) ? 1 : 1.1 }}
          whileTap={{ scale: (isSending || !canSendMessage) ? 1 : 0.9 }}
          aria-label="Send message"
        >
          {isSending ? <LoadingSpinner size="sm" /> : <i className="fas fa-paper-plane text-lg"></i>}
        </motion.button>
      </div>
      {(error || messageText.length > MAX_MESSAGE_LENGTH) && !banMessage && (
        <div className="text-xs mt-1.5 flex justify-between px-2">
          {error && <p className="text-error font-medium">{error}</p>}
          <p className={`ml-auto ${messageText.length > MAX_MESSAGE_LENGTH ? 'text-error font-semibold' : 'text-base-content/70'}`}>
            {messageText.length}/{MAX_MESSAGE_LENGTH}
          </p>
        </div>
      )}
    </div>
  );
};

export default NewChatMessageInput;
