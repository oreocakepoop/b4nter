// components/ChatMessage.tsx - To be treated as NewChatMessage.tsx
import React from 'react';
import { motion }
from 'framer-motion';
import { ChatMessageData } from '../types';
import { formatRelativeTime } from '../utils/dateUtils';
import ProfilePhoto from './ProfilePhoto';
import { Link } from 'react-router-dom';

interface NewChatMessageProps {
  message: ChatMessageData;
  isCurrentUser: boolean;
}

const messageVariants = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 30 } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const NewChatMessageComponent: React.FC<NewChatMessageProps> = React.memo(({ message, isCurrentUser }) => {
  if (message.type === 'system_firstMessage' || message.type === 'system_generic') {
    return (
      <motion.div
        variants={messageVariants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="my-1 py-1.5 px-3 text-center"
        role="log"
        aria-live="polite"
      >
        <div className="inline-block text-xs text-base-content/70 bg-base-200 px-3 py-1 rounded-full shadow-sm">
          {message.type === 'system_firstMessage' && <i className="fas fa-award mr-1.5 text-yellow-500"></i>}
          {message.type === 'system_generic' && <i className="fas fa-info-circle mr-1.5 text-info"></i>}
          {message.text} - <span className="italic text-base-content/50">{formatRelativeTime(message.timestamp as number)}</span>
        </div>
      </motion.div>
    );
  }

  // Regular user message
  const alignment = isCurrentUser ? 'justify-end' : 'justify-start';
  const bubbleStyles = isCurrentUser
    ? 'bg-primary text-primary-content rounded-t-xl rounded-l-xl group-hover:bg-opacity-80' // Softer radius & hover
    : 'bg-base-300 text-base-content rounded-t-xl rounded-r-xl group-hover:bg-opacity-70'; // Softer radius & hover

  const userForAvatar = {
    uid: message.userId,
    photoURL: message.userPhotoURL,
    displayName: message.username
  } as any;

  const userProfileForAvatar = {
    photoURL: message.userPhotoURL,
    username: message.username,
    displayName: message.username,
    selectedAvatarFrameId: message.userSelectedFrameId,
    selectedAvatarFlairId: message.userSelectedFlairId,
  } as any;

  return (
    <motion.div
      variants={messageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`flex items-end w-full ${alignment} my-1 group`} 
    >
      <div className={`flex items-start max-w-[80%] sm:max-w-[70%] ${isCurrentUser ? 'flex-row-reverse space-x-reverse space-x-2' : 'flex-row space-x-2'}`}>
        <div className="flex-shrink-0 mt-1">
          <ProfilePhoto
            currentUser={userForAvatar}
            userProfile={userProfileForAvatar}
            size="sm"
            editable={false}
            className="!w-7 !h-7 sm:!w-8 !h-8" // Slightly smaller for chat
            selectedFrameId={message.userSelectedFrameId}
            selectedFlairId={message.userSelectedFlairId}
            onUpdateAvatarCustomization={async () => ({ success: false, error: "" })}
          />
        </div>
        <div className="flex flex-col w-full">
          {!isCurrentUser && (
            <div className={`flex items-center space-x-1.5 mb-0.5 ${isCurrentUser ? 'self-end' : 'self-start'} px-2`}>
              <Link 
                  to={`/user/${message.username}`} 
                  className="text-xs text-secondary font-medium truncate hover:underline" 
                  style={{ maxWidth: '130px' }}
                  title={message.username}
              >
                {message.username}
              </Link>
              {message.userChatStreak && message.userChatStreak > 1 && (
                <span className="text-xs text-orange-500 font-semibold" title={`Chat Streak: ${message.userChatStreak} days`}>
                  🔥{message.userChatStreak}
                </span>
              )}
            </div>
          )}
          <div
            className={`p-2.5 sm:p-3 shadow-md ${bubbleStyles} break-words whitespace-pre-wrap min-w-[50px] transition-colors duration-150 ease-in-out`}
          >
            <p className="text-sm leading-snug">{message.text}</p>
          </div>
          <time dateTime={new Date(message.timestamp as number).toISOString()} className={`text-[0.65rem] text-base-content/60 mt-1 px-2 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
            {formatRelativeTime(message.timestamp as number)}
          </time>
        </div>
      </div>
    </motion.div>
  );
});
NewChatMessageComponent.displayName = 'NewChatMessageComponent';

// Exporting as a named export
export { NewChatMessageComponent as NewChatMessage };

// Default export can also be provided if needed for other import styles, but named export is key here.
export default NewChatMessageComponent;