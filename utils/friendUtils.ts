import { ref, update, runTransaction, serverTimestamp } from 'firebase/database';
import { db_rtdb } from '../firebase';
import { UserProfile } from '../types';
import { createNotification } from './notificationUtils';

/**
 * Sends a friend request from the current user to the target user.
 * @param currentUserId UID of the user sending the request.
 * @param currentUserUsername Username of the user sending the request.
 * @param currentUserPhotoUrl Photo URL of the user sending the request (optional).
 * @param targetUserId UID of the user to whom the request is sent.
 */
export async function sendFriendRequest(
  currentUserId: string,
  currentUserUsername: string,
  currentUserPhotoUrl: string | undefined,
  targetUserId: string
): Promise<void> {
  if (currentUserId === targetUserId) {
    throw new Error("You cannot send a friend request to yourself.");
  }

  const currentUserProfileRef = ref(db_rtdb, `userProfiles/${currentUserId}`);
  const targetUserProfileRef = ref(db_rtdb, `userProfiles/${targetUserId}`);

  const updates: { [key: string]: any } = {};
  updates[`userProfiles/${currentUserId}/friendRequestsSent/${targetUserId}`] = true;
  updates[`userProfiles/${targetUserId}/friendRequestsReceived/${currentUserId}`] = true;
  // We will also increment unreadFriendRequestCount on the target user.

  try {
    await update(ref(db_rtdb), updates);

    // Increment unreadFriendRequestCount for the target user
    await runTransaction(targetUserProfileRef, (profile: UserProfile | null) => {
      if (profile) {
        profile.unreadFriendRequestCount = (profile.unreadFriendRequestCount || 0) + 1;
      }
      return profile;
    });

    // Create notification for the target user
    await createNotification(
      targetUserId,
      'friend_request',
      currentUserId,
      currentUserUsername,
      currentUserId, // targetId for friend request notification is the sender's UID
      `${currentUserUsername} sent you a friend request.`,
      `/user/${currentUserUsername}`, // Link to sender's profile
      currentUserPhotoUrl
    );

    console.log(`Friend request sent from ${currentUserId} to ${targetUserId}`);
  } catch (error) {
    console.error("Error sending friend request:", error);
    throw new Error("Failed to send friend request. Please try again.");
  }
}

/**
 * Accepts a friend request.
 * @param currentUserId UID of the user accepting the request.
 * @param senderUserId UID of the user who sent the request.
 * @param currentUserUsername Username of the user accepting for notification.
 * @param currentUserPhotoUrl PhotoURL of the user accepting for notification.
 */
export async function acceptFriendRequest(
    currentUserId: string, 
    senderUserId: string,
    currentUserUsername: string,
    currentUserPhotoUrl?: string
): Promise<void> {
  const updates: { [key: string]: any } = {};
  updates[`userProfiles/${currentUserId}/friends/${senderUserId}`] = true;
  updates[`userProfiles/${senderUserId}/friends/${currentUserId}`] = true;
  updates[`userProfiles/${currentUserId}/friendRequestsReceived/${senderUserId}`] = null; // Remove received request
  updates[`userProfiles/${senderUserId}/friendRequestsSent/${currentUserId}`] = null;   // Remove sent request

  try {
    await update(ref(db_rtdb), updates);

    // Decrement unreadFriendRequestCount for the current user if it was > 0
    const currentUserProfileRef = ref(db_rtdb, `userProfiles/${currentUserId}`);
    await runTransaction(currentUserProfileRef, (profile: UserProfile | null) => {
        if (profile && (profile.unreadFriendRequestCount || 0) > 0) {
            profile.unreadFriendRequestCount = Math.max(0, (profile.unreadFriendRequestCount || 0) - 1);
        }
        return profile;
    });
    
    // Create notification for the original sender
    await createNotification(
      senderUserId,
      'friend_request_accepted',
      currentUserId,
      currentUserUsername,
      currentUserId, // targetId for accepted request is the acceptor's UID
      `${currentUserUsername} accepted your friend request!`,
      `/user/${currentUserUsername}`, // Link to acceptor's profile
      currentUserPhotoUrl
    );
    console.log(`Friend request from ${senderUserId} accepted by ${currentUserId}`);
  } catch (error) {
    console.error("Error accepting friend request:", error);
    throw new Error("Failed to accept friend request.");
  }
}


/**
 * Declines a friend request.
 * @param currentUserId UID of the user declining the request.
 * @param senderUserId UID of the user who sent the request.
 */
export async function declineFriendRequest(currentUserId: string, senderUserId: string): Promise<void> {
    const updates: { [key: string]: any } = {};
    updates[`userProfiles/${currentUserId}/friendRequestsReceived/${senderUserId}`] = null;
    updates[`userProfiles/${senderUserId}/friendRequestsSent/${currentUserId}`] = null;

    try {
        await update(ref(db_rtdb), updates);
         // Decrement unreadFriendRequestCount for the current user if it was > 0
        const currentUserProfileRef = ref(db_rtdb, `userProfiles/${currentUserId}`);
        await runTransaction(currentUserProfileRef, (profile: UserProfile | null) => {
            if (profile && (profile.unreadFriendRequestCount || 0) > 0) {
                profile.unreadFriendRequestCount = Math.max(0, (profile.unreadFriendRequestCount || 0) - 1);
            }
            return profile;
        });
        console.log(`Friend request from ${senderUserId} declined by ${currentUserId}`);
    } catch (error) {
        console.error("Error declining friend request:", error);
        throw new Error("Failed to decline friend request.");
    }
}

/**
 * Removes a friend.
 * @param currentUserId UID of the user initiating the unfriend.
 * @param friendUserId UID of the user to unfriend.
 */
export async function removeFriend(currentUserId: string, friendUserId: string): Promise<void> {
    const updates: { [key: string]: any } = {};
    updates[`userProfiles/${currentUserId}/friends/${friendUserId}`] = null;
    updates[`userProfiles/${friendUserId}/friends/${currentUserId}`] = null;

    try {
        await update(ref(db_rtdb), updates);
        console.log(`User ${currentUserId} unfriended ${friendUserId}`);
    } catch (error) {
        console.error("Error removing friend:", error);
        throw new Error("Failed to remove friend.");
    }
}
