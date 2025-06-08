// components/ChatUserList.tsx - To be treated as NewChatUserList.tsx
import React from 'react';
import { Link } from 'react-router-dom'; 
import { motion } from 'framer-motion';
import { ChatUser } from '../types';
import ProfilePhoto from './ProfilePhoto';
import LoadingSpinner from './LoadingSpinner';
import ChatUserListItemSkeleton from './skeletons/ChatUserListItemSkeleton'; // Import skeleton

interface NewChatUserListProps {
  activeUsers: ChatUser[];
  isLoadingUsers: boolean;
}

const ACTIVE_THRESHOLD_MS = 5 * 60 * 1000; 

const NewChatUserList: React.FC<NewChatUserListProps> = ({ activeUsers, isLoadingUsers }) => {
  return (
    <aside className="w-48 sm:w-56 bg-base-100 border-l border-base-300 flex-shrink-0 hidden md:flex flex-col h-full custom-scrollbar">
      <header className="p-3 bg-base-100 border-b border-base-300 shadow-sm sticky top-0 z-10">
        <h3 className="text-sm font-semibold text-primary">Online ({activeUsers.length})</h3>
      </header>
      <div className="flex-1 overflow-y-auto p-1.5 sm:p-2 space-y-1">
        {isLoadingUsers ? (
          <ChatUserListItemSkeleton count={8} />
        ) : activeUsers.length === 0 ? (
          <p className="text-xs text-center text-base-content/60 p-3">
            No one else is here.
          </p>
        ) : (
          activeUsers.map((user, index) => {
            const lastSeenTime = user.lastSeen as number;
            const isOnline = (Date.now() - lastSeenTime) < ACTIVE_THRESHOLD_MS;
            const statusColor = isOnline ? 'bg-success' : 'bg-base-content/40';

            return (
              <motion.div
                key={user.uid}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.07, duration: 0.3, ease:"circOut" }}
                className="p-1.5 hover:bg-primary/10 rounded-lg transition-colors group"
              >
                <Link to={`/user/${user.username}`} className="flex items-center space-x-2 sm:space-x-2.5">
                  <div className="relative">
                    <ProfilePhoto
                      currentUser={null}
                      userProfile={user as any} 
                      size="sm"
                      editable={false}
                      className="!w-7 !h-7 sm:!w-8 !h-8" 
                      selectedFrameId={user.selectedAvatarFrameId}
                      selectedFlairId={user.selectedAvatarFlairId}
                      onUpdateAvatarCustomization={async () => ({ success: false, error: ""})}
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 block w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full ring-2 ring-base-100 ${statusColor}`}
                      title={isOnline ? 'Online' : 'Recently Active'}
                    ></span>
                  </div>
                  <div className="flex-grow min-w-0">
                    <span className="text-sm text-base-content group-hover:text-primary-focus truncate block" title={user.username}>
                      {user.username}
                    </span>
                    {user.chatStreak && user.chatStreak > 1 && (
                      <span className="text-xs text-orange-500 font-semibold" title={`Chat Streak: ${user.chatStreak} days`}>
                        🔥{user.chatStreak}
                      </span>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })
        )}
      </div>
    </aside>
  );
};

export default NewChatUserList;