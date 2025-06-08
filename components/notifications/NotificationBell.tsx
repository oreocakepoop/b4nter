import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { ref, query, orderByChild, limitToLast, onValue, Unsubscribe } from 'firebase/database';
import { db_rtdb } from '../../firebase';
import { FirebaseUser, Notification, ProcessedNotificationItem, GroupedNotificationItem } from '../../types';
import LoadingSpinner from '../LoadingSpinner';
import { formatRelativeTime } from '../../utils/dateUtils';
import { markNotificationAsRead, markAllNotificationsAsRead, markMultipleNotificationsAsRead } from '../../utils/notificationUtils';
import ProfilePhoto from '../ProfilePhoto';

interface NotificationBellProps {
  currentUser: FirebaseUser;
  unreadCount: number;
}

const GROUPABLE_TYPES: Notification['type'][] = ['reaction_post', 'reply_post', 'reply_comment'];
const GROUP_THRESHOLD = 3;
const MAX_ACTORS_IN_SUMMARY = 2;

const NotificationBell: React.FC<NotificationBellProps> = ({ currentUser, unreadCount }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rawNotifications, setRawNotifications] = useState<Notification[]>([]);
  const [processedNotifications, setProcessedNotifications] = useState<ProcessedNotificationItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    if (currentUser) { // Fetch raw notifications regardless of isOpen for unreadCount accuracy from parent
      setIsLoading(true);
      const userNotificationsRef = query(
        ref(db_rtdb, `notifications/${currentUser.uid}`),
        orderByChild('timestamp'),
        limitToLast(50) // Fetch more to allow for better grouping
      );
      unsubscribe = onValue(userNotificationsRef, (snapshot) => {
        const data = snapshot.val();
        const loadedNotifications: Notification[] = data
          ? (Object.values(data) as Notification[]).sort((a, b) => (b.timestamp as number) - (a.timestamp as number))
          : [];
        setRawNotifications(loadedNotifications);
        setIsLoading(false);
      }, (error) => {
        console.error("Error fetching notifications:", error);
        setIsLoading(false);
      });
    } else {
      setRawNotifications([]);
      setProcessedNotifications([]);
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!isOpen) {
        // When dropdown is closed, we don't need to show processed items.
        // Raw notifications are still fetched above for the unread count.
        setProcessedNotifications([]); 
        return;
    }

    // Process raw notifications for display when dropdown opens
    const unreadGroupable: Record<string, Notification[]> = {};
    const otherNotifications: Notification[] = [];

    rawNotifications.forEach(n => {
      if (!n.isRead && GROUPABLE_TYPES.includes(n.type) && n.targetId) {
        const groupKey = `${n.type}_${n.targetId}`;
        if (!unreadGroupable[groupKey]) unreadGroupable[groupKey] = [];
        unreadGroupable[groupKey].push(n);
      } else {
        otherNotifications.push(n);
      }
    });

    const finalProcessedList: ProcessedNotificationItem[] = [];

    for (const key in unreadGroupable) {
      const group = unreadGroupable[key];
      if (group.length >= GROUP_THRESHOLD) {
        const latestNotification = group[0]; // Already sorted by timestamp desc
        const actorUsernames = [...new Set(group.map(n => n.actorUsername))]; // Unique actors
        const actorPhotoURLs = group
            .slice(0, MAX_ACTORS_IN_SUMMARY)
            .map(n => n.actorPhotoURL)
            .filter(Boolean) as string[];

        let message = "";
        const firstFewActors = actorUsernames.slice(0, MAX_ACTORS_IN_SUMMARY).join(', ');
        const remainingCount = actorUsernames.length - MAX_ACTORS_IN_SUMMARY;
        
        let targetObjectName = latestNotification.targetParentId ? "your comment" : "your post";
        // Attempt to get a snippet of the post/comment title if available (enhancement)
        // For now, a generic message.
        
        if (latestNotification.type === 'reaction_post') {
            message = `${firstFewActors}${remainingCount > 0 ? ` and ${remainingCount} other${remainingCount > 1 ? 's' : ''}` : ''} reacted to ${targetObjectName}.`;
        } else if (latestNotification.type === 'reply_post' || latestNotification.type === 'reply_comment') {
            message = `${firstFewActors}${remainingCount > 0 ? ` and ${remainingCount} other${remainingCount > 1 ? 's' : ''}` : ''} replied to ${targetObjectName}.`;
        }
        
        finalProcessedList.push({
          id: `group-${latestNotification.targetId}-${latestNotification.type}`,
          type: `grouped_${latestNotification.type}` as GroupedNotificationItem['type'],
          targetId: latestNotification.targetId,
          targetParentId: latestNotification.targetParentId,
          actorUsernames,
          actorPhotoURLs,
          firstActorUsername: actorUsernames[0],
          firstActorPhotoURL: actorPhotoURLs[0],
          message,
          link: latestNotification.link,
          timestamp: latestNotification.timestamp as number,
          isRead: false, // A group of unread items is unread
          originalNotificationIds: group.map(n => n.id),
          count: group.length,
        });
      } else {
        finalProcessedList.push(...group); // Add as individual if not meeting threshold
      }
    }
    
    finalProcessedList.push(...otherNotifications.filter(n => !finalProcessedList.some(fp => 'originalNotificationIds' in fp && fp.originalNotificationIds.includes(n.id))));
    finalProcessedList.sort((a,b) => (b.timestamp as number) - (a.timestamp as number));
    
    setProcessedNotifications(finalProcessedList.slice(0, 15)); // Limit displayed items

  }, [isOpen, rawNotifications]);


  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleNotificationClick = async (item: ProcessedNotificationItem) => {
    if ('originalNotificationIds' in item) { // It's a GroupedNotificationItem
      await markMultipleNotificationsAsRead(currentUser.uid, item.originalNotificationIds);
    } else { // It's a single Notification
      if (!item.isRead) {
        await markNotificationAsRead(currentUser.uid, item.id);
      }
    }
    setIsOpen(false);
    navigate(item.link);
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(currentUser.uid);
  };

  const renderNotificationItem = (item: ProcessedNotificationItem) => {
    const isGrouped = 'originalNotificationIds' in item;
    const displayItem = item as (Notification & GroupedNotificationItem); // Cast for easier access, ensure type safety

    const photoUrlsToDisplay = isGrouped ? displayItem.actorPhotoURLs.slice(0, MAX_ACTORS_IN_SUMMARY) : [displayItem.actorPhotoURL];
    const primaryUsername = isGrouped ? displayItem.firstActorUsername : displayItem.actorUsername;
    const primaryPhotoUrl = isGrouped ? displayItem.firstActorPhotoURL : displayItem.actorPhotoURL;

    return (
      <li key={displayItem.id} role="menuitem">
        <button
          onClick={() => handleNotificationClick(item)}
          className={`p-2.5 rounded-lg w-full text-left transition-colors duration-150 ease-in-out ${
            item.isRead ? 'bg-base-200 hover:bg-base-300/60' : 'bg-primary/10 hover:bg-primary/20 font-medium'
          }`}
        >
          <div className="flex items-start space-x-2.5">
            <div className="flex -space-x-2 mt-0.5 flex-shrink-0">
                {photoUrlsToDisplay.map((url, index) => (
                    url ? (
                        <ProfilePhoto 
                            key={index}
                            currentUser={null}
                            userProfile={{ uid: isGrouped ? item.originalNotificationIds[index] : displayItem.actorId, username: isGrouped ? displayItem.actorUsernames[index] : primaryUsername, photoURL: url } as any}
                            size="sm" editable={false} className="!w-8 !h-8 ring-2 ring-base-200"
                            onUpdateAvatarCustomization={async () => ({success:false, error:""})}
                        />
                    ) : (
                         <div key={index} className="avatar placeholder">
                            <div className="bg-neutral-focus text-neutral-content rounded-full w-8 h-8 ring-2 ring-base-200">
                                <span className="text-xs">{(isGrouped ? displayItem.actorUsernames[index] : primaryUsername).substring(0,1).toUpperCase()}</span>
                            </div>
                        </div>
                    )
                ))}
                 {isGrouped && displayItem.count > MAX_ACTORS_IN_SUMMARY && (
                    <div className="avatar placeholder">
                        <div className="w-8 h-8 rounded-full bg-neutral text-neutral-content flex items-center justify-center ring-2 ring-base-200" title={`${displayItem.count - MAX_ACTORS_IN_SUMMARY} more`}>
                            <span className="text-xs">+{displayItem.count - MAX_ACTORS_IN_SUMMARY}</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-grow min-w-0">
              <p className={`text-sm ${item.isRead ? 'text-base-content/90' : 'text-base-content'}`}>
                {displayItem.message}
              </p>
              <p className={`text-xs mt-0.5 ${item.isRead ? 'text-base-content/60' : 'text-primary/80'}`}>
                {formatRelativeTime(displayItem.timestamp as number)}
              </p>
            </div>
            {!item.isRead && (
              <div className="w-2 h-2 bg-primary rounded-full self-center flex-shrink-0" title="Unread"></div>
            )}
          </div>
        </button>
      </li>
    );
  };


  return (
    <div className="dropdown dropdown-end" ref={dropdownRef}>
      <label tabIndex={0} className="btn btn-ghost btn-circle" onClick={() => setIsOpen(!isOpen)} aria-label="Notifications" aria-haspopup="true" aria-expanded={isOpen}>
        <div className="indicator">
          <i className="fas fa-bell text-xl"></i>
          {unreadCount > 0 && (
            <span className="badge badge-xs badge-primary indicator-item animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </label>
      <AnimatePresence>
        {isOpen && (
          <motion.ul
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95, transition: { duration: 0.15 } }}
            tabIndex={0}
            className="menu menu-sm dropdown-content mt-3 z-[101] p-2 shadow bg-base-200 rounded-box w-80 sm:w-96 max-h-[70vh] overflow-y-auto custom-scrollbar"
            role="menu"
          >
            <div className="flex justify-between items-center px-2 py-1 mb-1 border-b border-base-300">
              <h3 className="font-semibold text-base-content">Notifications</h3>
              {rawNotifications.some(n => !n.isRead) && ( // Check raw notifications for unread status for "Mark all read" button
                <button 
                    onClick={handleMarkAllRead} 
                    className="btn btn-xs btn-ghost text-info hover:bg-info/10"
                    disabled={isLoading}
                >
                    Mark all as read
                </button>
              )}
            </div>
            {isLoading && processedNotifications.length === 0 ? ( // Show loading only if processed list is empty
              <div className="flex justify-center items-center h-32">
                <LoadingSpinner size="md" />
              </div>
            ) : processedNotifications.length === 0 ? (
              <li className="p-3 text-center text-sm text-base-content/70">No new notifications.</li>
            ) : (
              processedNotifications.map(item => renderNotificationItem(item))
            )}
            <li className="mt-2 border-t border-base-300 pt-1">
              <Link to="/notifications" onClick={() => setIsOpen(false)} className="btn btn-ghost btn-sm w-full justify-center">
                View All Notifications (Coming Soon)
              </Link>
            </li>
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationBell;