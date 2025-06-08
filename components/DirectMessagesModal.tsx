
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FirebaseUser, UserProfile, DMConversationItem, DMMessage } from '../types';
import { listenToUserDmConversations, listenToDmMessages, markDmRoomAsRead, sendDmMessage, startOrCreateDmConversation } from '../utils/dmUtils';
import LoadingSpinner from './LoadingSpinner';
import ProfilePhoto from './ProfilePhoto';
import { NewChatMessage } from './ChatMessage';
import NewChatMessageInput from './ChatMessageInput';

interface DirectMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser;
  currentUserProfile: UserProfile;
  allUserProfiles: UserProfile[];
  openAuthPage: (type: 'login' | 'register', message?: string, redirectPath?: string) => void;
}

interface ConversationListItemProps {
  conversation: DMConversationItem;
  isSelected: boolean;
  onSelect: () => void;
}

const ConversationListItem: React.FC<ConversationListItemProps> = React.memo(({
  conversation,
  isSelected,
  onSelect,
}) => {
  return (
    <li>
      <button
        onClick={onSelect}
        className={`w-full text-left p-2.5 flex items-center space-x-2.5 transition-colors duration-150 ease-in-out hover:bg-primary/15
          ${isSelected ? 'bg-primary/25 border-l-4 border-primary' : 'border-l-4 border-transparent'}`}
        aria-current={isSelected ? 'page' : undefined}
      >
        <ProfilePhoto
          userProfile={conversation.otherParticipant as any}
          currentUser={null}
          size="sm" editable={false} className="!w-9 !h-9"
          onUpdateAvatarCustomization={async () => ({success:false, error:""})}
        />
        <div className="flex-grow min-w-0">
          <div className="flex justify-between items-center">
            <span className={`font-medium text-sm truncate ${isSelected ? 'text-primary-focus' : 'text-base-content'}`} title={conversation.otherParticipant.username}>
              {conversation.otherParticipant.username}
            </span>
            {conversation.unreadCount > 0 && (
              <span className="badge badge-secondary badge-xs animate-pulse">{conversation.unreadCount}</span>
            )}
          </div>
          <p className="text-xs text-base-content/60 truncate" title={conversation.lastMessageText || 'No messages yet'}>
            {conversation.lastMessageText || '...'}
          </p>
        </div>
      </button>
    </li>
  );
});
ConversationListItem.displayName = "ConversationListItem";


const DirectMessagesModal: React.FC<DirectMessagesModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  currentUserProfile,
  allUserProfiles,
  openAuthPage,
}) => {
  const [conversations, setConversations] = useState<DMConversationItem[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<DMConversationItem | null>(null);
  const [messages, setMessages] = useState<DMMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSending, setIsSending] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const location = useLocation();
  const navigate = useNavigate();

  const handleSelectConversation = useCallback(async (conversation: DMConversationItem, updateNav = true) => {
    setSelectedConversation(conversation);
    if (updateNav) {
        navigate(`?roomId=${conversation.dmRoomId}`, { replace: true, state: location.state });
    }
    if (conversation.unreadCount > 0 && currentUser) {
      await markDmRoomAsRead(conversation.dmRoomId, currentUser.uid);
      // Optimistic update for unread count in UI, actual data will come from listener
      setConversations(prev => prev.map(c => c.dmRoomId === conversation.dmRoomId ? {...c, unreadCount: 0} : c));
    }
  }, [currentUser, navigate, location.state]);


  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
      setError(null); 

      const queryParams = new URLSearchParams(location.search);
      const roomIdFromQuery = queryParams.get('roomId');
      
      if (roomIdFromQuery) {
        // If the selected convo ID doesn't match query, or if no convo is selected but query has ID
        if (!selectedConversation || selectedConversation.dmRoomId !== roomIdFromQuery) {
            const convoToSelect = conversations.find(c => c.dmRoomId === roomIdFromQuery);
            if (convoToSelect) {
                handleSelectConversation(convoToSelect, false); // Don't update nav again
            } else if (conversations.length > 0) {
              // If convoToSelect is not found yet (maybe conversations list is not up-to-date)
              // We wait for the conversations listener to update the list and then this effect will run again.
            }
        }
      } else if (!roomIdFromQuery && selectedConversation) { // No roomId in query, but a convo is selected
        setSelectedConversation(null); 
        setMessages([]);
      }

    } else {
      dialogRef.current?.close();
       // When modal closes, clear the roomId from URL if it was set by DM modal interaction
      if (new URLSearchParams(location.search).get('roomId')) {
        navigate(location.pathname, { replace: true, state: location.state });
      }
      setSelectedConversation(null); // Also clear selected conversation
    }
  }, [isOpen, location.search, conversations, selectedConversation, handleSelectConversation, navigate, location.pathname, location.state, onClose]); 


  useEffect(() => {
    const dialog = dialogRef.current;
    const handleDialogCloseEvent = () => { if (isOpen) onClose(); };
    dialog?.addEventListener('close', handleDialogCloseEvent);
    return () => dialog?.removeEventListener('close', handleDialogCloseEvent);
  }, [onClose, isOpen]);

  useEffect(() => {
    if (!currentUser || !isOpen) { 
        setConversations([]); 
        setIsLoadingConversations(false);
        return;
    }
    setIsLoadingConversations(true);
    const unsubscribe = listenToUserDmConversations(currentUser.uid, (loadedConversations) => {
      setConversations(loadedConversations);
      setIsLoadingConversations(false);

      const currentSelectedRoomId = selectedConversation?.dmRoomId;
      if (currentSelectedRoomId && !loadedConversations.find(c => c.dmRoomId === currentSelectedRoomId)) {
        setSelectedConversation(null);
        setMessages([]);
        if (new URLSearchParams(location.search).get('roomId') === currentSelectedRoomId) {
            navigate(location.pathname, { replace: true, state: location.state });
        }
      }

      const queryParams = new URLSearchParams(location.search);
      const roomIdFromQuery = queryParams.get('roomId');
      if (roomIdFromQuery && (!selectedConversation || selectedConversation.dmRoomId !== roomIdFromQuery)) {
        const convoToSelect = loadedConversations.find(c => c.dmRoomId === roomIdFromQuery);
        if (convoToSelect) {
          handleSelectConversation(convoToSelect, false);
        }
      }
    });
    return () => unsubscribe();
  }, [currentUser, isOpen, location.search, selectedConversation, handleSelectConversation, navigate, location.pathname, location.state]);

  useEffect(() => {
    if (!selectedConversation || !isOpen) { 
      setMessages([]);
      return;
    }
    setIsLoadingMessages(true);
    const unsubscribe = listenToDmMessages(selectedConversation.dmRoomId, (loadedMessages) => {
      setMessages(loadedMessages);
      setIsLoadingMessages(false);
    });
    return () => unsubscribe();
  }, [selectedConversation, isOpen]);

  useEffect(() => {
    if (messages.length > 0 && isOpen) {
      // Scroll to bottom, but check if user has scrolled up
      const container = messagesEndRef.current?.parentElement;
      if (container) {
          const { scrollHeight, scrollTop, clientHeight } = container;
          // Check if user is near the bottom or if it's the initial load of messages for this convo
          const isNearBottom = scrollHeight - scrollTop - clientHeight < 200; 
          if(isNearBottom || messages.length <= 10) { // Heuristic: scroll if near bottom or few messages
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
          }
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [messages, isOpen]);


  const handleSendMessage = async (text: string) => {
    if (!selectedConversation || !text.trim() || !currentUser || !currentUserProfile) return;
    setIsSending(true);
    setError(null);
    try {
      await sendDmMessage(
        selectedConversation.dmRoomId,
        currentUser,
        currentUserProfile,
        text,
        selectedConversation.otherParticipant.uid
      );
    } catch (err: any) {
      console.error("Error sending DM:", err);
      setError(err.message || "Failed to send message.");
    } finally {
      setIsSending(false);
    }
  };
  
  const handleStartNewDM = async (targetUserId: string) => {
    if(!currentUser || !currentUserProfile) return;
    const targetUser = allUserProfiles.find(p => p.uid === targetUserId);
    if (!targetUser) {
        setError("User not found.");
        return;
    }
    setError(null); 
    try {
        const newDmRoomId = await startOrCreateDmConversation(currentUser, currentUserProfile, targetUser);
        navigate(`?roomId=${newDmRoomId}`, { replace: true, state: location.state });
        // The selectedConversation state will be updated by the useEffect that listens to location.search and conversations
    } catch (e: any) {
        setError(e.message || "Could not start DM.");
    }
  };
  
  const handleBackToConversations = () => {
    setSelectedConversation(null);
    setMessages([]);
    navigate(location.pathname, { replace: true, state: location.state }); // Clear roomId from URL
  };

  const modalBoxStyle: React.CSSProperties = { maxHeight: '85vh', height: '85vh', width: '90vw', maxWidth: '1000px' };


  return (
    <dialog id="dm_modal" className="modal modal-bottom sm:modal-middle" ref={dialogRef}>
    <AnimatePresence>
    {isOpen && currentUser && currentUserProfile && (
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
            <i className="fas fa-envelope mr-2"></i>Direct Messages
          </h3>
          <form method="dialog"><button className="btn btn-sm btn-circle btn-ghost" onClick={onClose} aria-label="Close direct messages">✕</button></form>
        </div>
        
        {error && (
            <div role="alert" className="alert alert-error text-xs m-2 p-2 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-4 w-4" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                <span>Error: {error}</span>
                <button className="btn btn-xs btn-ghost" onClick={() => setError(null)}>Clear</button>
            </div>
        )}

        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* Left Pane: Conversation List - Show if no convo selected OR on md+ screens */}
          <aside className={`
            ${selectedConversation ? 'hidden md:flex' : 'flex'} 
            w-full md:w-2/5 lg:w-1/3 border-r-0 md:border-r md:border-base-300 
            flex-col bg-base-200/30 overflow-y-auto custom-scrollbar
          `}>
            <header className="p-2 border-b border-base-300 sticky top-0 bg-base-200 z-10">
              <h2 className="text-md font-semibold text-base-content">Conversations</h2>
              <button 
                className="btn btn-xs btn-outline btn-primary mt-1 w-full" 
                onClick={() => {
                  const potentialTargets = allUserProfiles.filter(p => p.uid !== currentUser.uid && currentUserProfile?.friends?.[p.uid]);
                  if (potentialTargets.length === 0) {
                    setError("No friends available to message, or find them via their profile."); return;
                  }
                  const target = potentialTargets.find(p => !conversations.some(c => c.otherParticipant.uid === p.uid));
                  if (target) handleStartNewDM(target.uid);
                  else if (potentialTargets.length > 0) setError("Already in DMs with all available friends for this test button, or select from list.");
                  else setError("No friends available to start a new DM with via this test button.");
                }}
                title="Attempt to start a new DM with a test user (must be a friend)"
              >
                New Message (Test Friend)
              </button>
            </header>
            {isLoadingConversations ? (
              <div className="p-4 text-center"><LoadingSpinner /></div>
            ) : conversations.length === 0 && !isLoadingConversations ? (
              <p className="p-4 text-center text-sm text-base-content/70">No conversations yet.</p>
            ) : (
              <ul className="space-y-px py-1">
                {conversations.map(convo => (
                  <ConversationListItem
                    key={convo.dmRoomId}
                    conversation={convo}
                    isSelected={selectedConversation?.dmRoomId === convo.dmRoomId}
                    onSelect={() => handleSelectConversation(convo)}
                  />
                ))}
              </ul>
            )}
          </aside>

          {/* Right Pane: Chat View - Show if convo selected OR on md+ screens (but hidden by above logic if no convo on mobile) */}
           <main className={`
            ${selectedConversation ? 'flex' : 'hidden md:flex'} 
            flex-1 flex-col bg-base-100 min-w-0
          `}>
            {selectedConversation ? (
              <>
                <header className="p-3 border-b border-base-300 flex items-center space-x-2 bg-base-100 sticky top-0 z-10">
                  <button 
                    className="btn btn-ghost btn-sm btn-circle md:hidden" 
                    onClick={handleBackToConversations}
                    aria-label="Back to conversations"
                  >
                    <i className="fas fa-arrow-left"></i>
                  </button>
                  <ProfilePhoto
                        userProfile={selectedConversation.otherParticipant as any}
                        currentUser={null} size="sm" editable={false} className="!w-8 !h-8"
                        onUpdateAvatarCustomization={async () => ({success:false, error:""})}
                    />
                  <h3 className="text-base font-semibold text-base-content">{selectedConversation.otherParticipant.username}</h3>
                </header>
                <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1 custom-scrollbar">
                  <AnimatePresence initial={false}>
                    {isLoadingMessages ? (
                      <div className="flex justify-center items-center h-full"><LoadingSpinner /></div>
                    ) : messages.map(msg => (
                      <NewChatMessage
                        key={msg.id}
                        message={{...msg, userId: msg.senderId, username: msg.senderUsername, userPhotoURL: msg.senderPhotoURL }}
                        isCurrentUser={msg.senderId === currentUser.uid}
                      />
                    ))}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
                <NewChatMessageInput userProfile={currentUserProfile} onSendMessage={handleSendMessage} isSending={isSending} setIsSending={setIsSending}/>
              </>
            ) : (
              <div className="flex-1 flex-col items-center justify-center text-center p-6 bg-base-100 hidden md:flex"> {/* Hidden on mobile by default, shown on md+ if no convo */}
                <i className="fas fa-comments text-5xl text-base-content/20 mb-4"></i>
                <h2 className="text-xl font-semibold text-base-content/70">Select a conversation</h2>
                <p className="text-base-content/50 mt-1">Or start a new one to begin chatting!</p>
              </div>
            )}
          </main>
        </div>
      </motion.div>
    )}
    </AnimatePresence>
    <form method="dialog" className="modal-backdrop"><button type="button" onClick={onClose}>close</button></form>
    </dialog>
  );
};

export default DirectMessagesModal;