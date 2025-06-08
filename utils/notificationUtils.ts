import { ref, push, update, serverTimestamp, runTransaction, get } from 'firebase/database';
import { db_rtdb } from '../firebase';
import { Notification, NotificationType, UserProfile } from '../types';

/**
 * Creates a new notification for a user.
 * @param userId The ID of the user to notify.
 * @param type The type of notification.
 * @param actorId The ID of the user who performed the action.
 * @param actorUsername The username of the actor.
 * @param targetId The ID of the entity related to the notification (e.g., postId, commentId).
 * @param message The notification message.
 * @param link The client-side link for navigation.
 * @param actorPhotoURL Optional photo URL of the actor.
 * @param targetParentId Optional parent ID (e.g., postId for a comment reply).
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  actorId: string,
  actorUsername: string,
  targetId: string,
  message: string,
  link: string,
  actorPhotoURL?: string,
  targetParentId?: string
): Promise<void> {
  if (!userId || userId === actorId) { // Don't notify users of their own actions
    return;
  }

  const notificationsRef = ref(db_rtdb, `notifications/${userId}`);
  const newNotificationRef = push(notificationsRef);
  const notificationId = newNotificationRef.key;

  if (!notificationId) {
    console.error("Failed to generate notification ID.");
    return;
  }

  const newNotificationData: Notification = {
    id: notificationId,
    userId,
    type,
    actorId,
    actorUsername,
    targetId,
    message,
    link,
    timestamp: serverTimestamp(),
    isRead: false,
    ...(actorPhotoURL && { actorPhotoURL }),
    ...(targetParentId && { targetParentId }),
  };

  try {
    await update(newNotificationRef, newNotificationData);
    // Increment unread notifications count
    const userProfileRef = ref(db_rtdb, `userProfiles/${userId}`);
    await runTransaction(userProfileRef, (profile: UserProfile | null) => {
      if (profile) {
        profile.unreadNotificationsCount = (profile.unreadNotificationsCount || 0) + 1;
      }
      return profile;
    });
    console.log(`Notification created for user ${userId}: ${type}`);
  } catch (error) {
    console.error(`Error creating notification for user ${userId}:`, error);
  }
}

/**
 * Marks a specific notification as read.
 * @param userId The ID of the user who owns the notification.
 * @param notificationId The ID of the notification to mark as read.
 */
export async function markNotificationAsRead(userId: string, notificationId: string): Promise<void> {
  if (!userId || !notificationId) return;

  const notificationRef = ref(db_rtdb, `notifications/${userId}/${notificationId}`);
  const userProfileRef = ref(db_rtdb, `userProfiles/${userId}`);

  try {
    const notificationSnapshot = await get(notificationRef);
    if (notificationSnapshot.exists()) {
      const notificationData = notificationSnapshot.val() as Notification;
      if (!notificationData.isRead) {
        await update(notificationRef, { isRead: true });
        await runTransaction(userProfileRef, (profile: UserProfile | null) => {
          if (profile) {
            profile.unreadNotificationsCount = Math.max(0, (profile.unreadNotificationsCount || 0) - 1);
          }
          return profile;
        });
        console.log(`Notification ${notificationId} marked as read for user ${userId}.`);
      }
    }
  } catch (error) {
    console.error(`Error marking notification ${notificationId} as read for user ${userId}:`, error);
  }
}

/**
 * Marks multiple notifications as read for a user.
 * @param userId The ID of the user.
 * @param notificationIds An array of notification IDs to mark as read.
 */
export async function markMultipleNotificationsAsRead(userId: string, notificationIds: string[]): Promise<void> {
  if (!userId || notificationIds.length === 0) return;

  const userProfileRef = ref(db_rtdb, `userProfiles/${userId}`);
  const updates: { [key: string]: any } = {};
  let actualUnreadCountToDecrement = 0;

  for (const notificationId of notificationIds) {
    const notificationRef = ref(db_rtdb, `notifications/${userId}/${notificationId}`);
    // Check if it's actually unread before adding to updates and count
    const notificationSnapshot = await get(notificationRef);
    if (notificationSnapshot.exists()) {
        const notificationData = notificationSnapshot.val() as Notification;
        if (!notificationData.isRead) {
            updates[`notifications/${userId}/${notificationId}/isRead`] = true;
            actualUnreadCountToDecrement++;
        }
    }
  }

  if (Object.keys(updates).length > 0) {
    try {
      await update(ref(db_rtdb), updates); // Use root ref for multi-path update
      await runTransaction(userProfileRef, (profile: UserProfile | null) => {
        if (profile) {
          profile.unreadNotificationsCount = Math.max(0, (profile.unreadNotificationsCount || 0) - actualUnreadCountToDecrement);
        }
        return profile;
      });
      console.log(`${actualUnreadCountToDecrement} notifications marked as read for user ${userId}.`);
    } catch (error) {
      console.error(`Error marking multiple notifications as read for user ${userId}:`, error);
    }
  }
}


/**
 * Marks all unread notifications for a user as read.
 * @param userId The ID of the user.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<void> {
  if (!userId) return;

  const notificationsRef = ref(db_rtdb, `notifications/${userId}`);
  const userProfileRef = ref(db_rtdb, `userProfiles/${userId}`);

  try {
    const snapshot = await get(notificationsRef);
    if (snapshot.exists()) {
      const updates: { [key: string]: any } = {};
      let unreadCountToDecrement = 0;
      snapshot.forEach(childSnapshot => {
        const notification = childSnapshot.val() as Notification;
        if (!notification.isRead) {
          updates[`notifications/${userId}/${childSnapshot.key}/isRead`] = true;
          unreadCountToDecrement++;
        }
      });

      if (Object.keys(updates).length > 0) {
        await update(ref(db_rtdb), updates); // Use root ref for multi-path update
        await runTransaction(userProfileRef, (profile: UserProfile | null) => {
          if (profile) {
            profile.unreadNotificationsCount = Math.max(0, (profile.unreadNotificationsCount || 0) - unreadCountToDecrement);
          }
          return profile;
        });
        console.log(`All unread notifications marked as read for user ${userId}. Decremented count by ${unreadCountToDecrement}.`);
      }
    }
  } catch (error) {
    console.error(`Error marking all notifications as read for user ${userId}:`, error);
  }
}