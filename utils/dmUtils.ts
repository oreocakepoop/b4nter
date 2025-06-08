import { ref, set, push, update, serverTimestamp, get, query, orderByChild, equalTo, Unsubscribe, onValue, runTransaction } from 'firebase/database';
import { db_rtdb } from '../firebase';
import { DMMessage, DMRoomMetadata, UserProfile, FirebaseUser, DMConversationItem as DMConversationItemType } from '../types'; // Aliased DMConversationItem
import { createNotification } from './notificationUtils';
import { generateDefaultDicebear7xAvatarUrl } from './firebaseUtils';


/**
 * Generates a unique, sorted room ID for two users.
 * @param uid1 First user's ID.
 * @param uid2 Second user's ID.
 * @returns A string representing the DM room ID.
 */
function getDmRoomId(uid1: string, uid2: string): string {
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

/**
 * Starts or gets an existing DM conversation between two users.
 * Checks if users are friends before creating/accessing the room.
 * @param currentUser The current authenticated user.
 * @param currentUserProfile The profile of the current user.
 * @param targetUser The user to start a conversation with.
 * @returns The DM Room ID.
 * @throws Error if users are not friends or other validation fails.
 */
export async function startOrCreateDmConversation(
  currentUser: FirebaseUser,
  currentUserProfile: UserProfile,
  targetUser: UserProfile
): Promise<string> {
  if (!currentUser || !currentUserProfile || !targetUser) {
    throw new Error("Invalid user data provided for starting DM conversation.");
  }
  if (currentUser.uid === targetUser.uid) {
    throw new Error("Cannot start a DM conversation with yourself.");
  }

  // Friendship Check
  if (!currentUserProfile.friends?.[targetUser.uid]) {
    throw new Error(`You can only message friends. Send ${targetUser.username} a friend request first!`);
  }

  const dmRoomId = getDmRoomId(currentUser.uid, targetUser.uid);
  const dmRoomRef = ref(db_rtdb, `directMessages/${dmRoomId}/metadata`);
  const userDmRoomsRefCurrentUser = ref(db_rtdb, `userDmRooms/${currentUser.uid}/${dmRoomId}`);
  const userDmRoomsRefTargetUser = ref(db_rtdb, `userDmRooms/${targetUser.uid}/${dmRoomId}`);

  const roomSnapshot = await get(dmRoomRef);

  if (!roomSnapshot.exists()) {
    const now = serverTimestamp();
    const newRoomMetadata: DMRoomMetadata = {
      id: dmRoomId,
      participants: {
        [currentUser.uid]: true,
        [targetUser.uid]: true,
      },
      participantUsernames: {
        [currentUser.uid]: currentUserProfile.username,
        [targetUser.uid]: targetUser.username,
      },
      participantPhotoURLs: {
        [currentUser.uid]: currentUserProfile.photoURL || generateDefaultDicebear7xAvatarUrl(currentUser.uid),
        [targetUser.uid]: targetUser.photoURL || generateDefaultDicebear7xAvatarUrl(targetUser.uid),
      },
      createdAt: now,
      updatedAt: now,
      unreadCount: {
        [currentUser.uid]: 0,
        [targetUser.uid]: 0,
      }
    };
    await set(dmRoomRef, newRoomMetadata);
    await set(userDmRoomsRefCurrentUser, true);
    await set(userDmRoomsRefTargetUser, true);
    console.log(`DM Room ${dmRoomId} created between ${currentUserProfile.username} and ${targetUser.username}`);
  }
  return dmRoomId;
}

/**
 * Sends a DM message to a specific room.
 * @param dmRoomId The ID of the DM room.
 * @param sender The user sending the message.
 * @param senderProfile The profile of the sender.
 * @param text The message text.
 * @param recipientId The ID of the message recipient.
 */
export async function sendDmMessage(
  dmRoomId: string,
  sender: FirebaseUser,
  senderProfile: UserProfile,
  text: string,
  recipientId: string
): Promise<void> {
  if (!dmRoomId || !sender || !senderProfile || !text.trim() || !recipientId) {
    throw new Error("Invalid parameters for sending DM.");
  }

  const messagesRef = ref(db_rtdb, `directMessages/${dmRoomId}/messages`);
  const newMessageRef = push(messagesRef);
  const messageId = newMessageRef.key;

  if (!messageId) {
    throw new Error("Failed to generate DM message ID.");
  }
  
  const newMessageData: Omit<DMMessage, 'id'> = {
    senderId: sender.uid,
    senderUsername: senderProfile.username,
    senderPhotoURL: senderProfile.photoURL || generateDefaultDicebear7xAvatarUrl(sender.uid),
    text: text.trim(),
    timestamp: serverTimestamp(),
    // dmRoomId is contextually known and not part of the DMMessage type itself stored under messages node
  };

  await set(newMessageRef, newMessageData);

  // Update room metadata
  const roomMetadataRef = ref(db_rtdb, `directMessages/${dmRoomId}/metadata`);
  await runTransaction(roomMetadataRef, (metadata: DMRoomMetadata | null) => {
    if (metadata) {
      metadata.lastMessageText = text.trim().substring(0, 100); // Snippet
      metadata.lastMessageTimestamp = serverTimestamp();
      metadata.lastMessageSenderId = sender.uid;
      metadata.updatedAt = serverTimestamp();
      if (!metadata.unreadCount) metadata.unreadCount = {};
      metadata.unreadCount[recipientId] = (metadata.unreadCount[recipientId] || 0) + 1;
    }
    return metadata;
  });

  // Create notification for the recipient
  const recipientProfileSnapshot = await get(ref(db_rtdb, `userProfiles/${recipientId}`));
  if (recipientProfileSnapshot.exists()) {
    // const recipientProfile = recipientProfileSnapshot.val() as UserProfile; // Not needed for DM notif
     createNotification(
        recipientId,
        'new_dm',
        sender.uid,
        senderProfile.username,
        dmRoomId,
        `You have a new message from ${senderProfile.username}.`,
        `/?roomId=${dmRoomId}`, // Link to open the specific DM in modal context
        senderProfile.photoURL
    ).catch(err => console.error("Error creating DM notification:", err));
  }
}

/**
 * Marks all messages in a DM room as read for a specific user.
 * @param dmRoomId The ID of the DM room.
 * @param userId The ID of the user for whom messages should be marked as read.
 */
export async function markDmRoomAsRead(dmRoomId: string, userId: string): Promise<void> {
  if (!dmRoomId || !userId) return;
  const roomMetadataRef = ref(db_rtdb, `directMessages/${dmRoomId}/metadata`);
  try {
    await runTransaction(roomMetadataRef, (metadata: DMRoomMetadata | null) => {
      if (metadata && metadata.unreadCount && metadata.unreadCount[userId] > 0) {
        metadata.unreadCount[userId] = 0;
      }
      return metadata;
    });
  } catch (error) {
    console.error(`Error marking DM room ${dmRoomId} as read for user ${userId}:`, error);
  }
}

/**
 * Fetches and listens to messages for a specific DM room.
 * @param dmRoomId The ID of the DM room.
 * @param callback Function to call with the array of messages.
 * @returns Unsubscribe function.
 */
export function listenToDmMessages(dmRoomId: string, callback: (messages: DMMessage[]) => void): Unsubscribe {
  const messagesQuery = query(ref(db_rtdb, `directMessages/${dmRoomId}/messages`), orderByChild('timestamp'));
  return onValue(messagesQuery, (snapshot) => {
    const messagesData = snapshot.val();
    const loadedMessages: DMMessage[] = messagesData
      ? Object.keys(messagesData).map(key => ({ id: key, ...messagesData[key] })) // dmRoomId is not part of message itself
      : [];
    callback(loadedMessages);
  }, (error) => {
    console.error(`Error listening to DM messages for room ${dmRoomId}:`, error);
    callback([]); // Send empty array on error
  });
}

/**
 * Fetches and listens to a user's DM conversations list.
 * @param userId The ID of the user.
 * @param callback Function to call with the array of conversation items.
 * @returns Unsubscribe function.
 */
export function listenToUserDmConversations(
  userId: string,
  callback: (conversations: DMConversationItemType[]) => void
): Unsubscribe {
  const userDmRoomsRef = ref(db_rtdb, `userDmRooms/${userId}`);
  const conversationListeners: Record<string, Unsubscribe> = {};
  let dmRoomIds: string[] = [];
  let conversationData: Record<string, DMConversationItemType> = {};

  const processAndCallback = () => {
    const sortedConversations = Object.values(conversationData).sort(
      (a, b) => (b.lastMessageTimestamp || 0) - (a.lastMessageTimestamp || 0)
    );
    callback(sortedConversations);
  };

  return onValue(userDmRoomsRef, async (snapshot) => {
    const newDmRoomIdsData = snapshot.val();
    const newDmRoomIds = newDmRoomIdsData ? Object.keys(newDmRoomIdsData).filter(roomId => newDmRoomIdsData[roomId] === true) : [];

    // Unsubscribe from rooms no longer in the list or marked as false
    dmRoomIds.forEach(roomId => {
      if (!newDmRoomIds.includes(roomId) && conversationListeners[roomId]) {
        conversationListeners[roomId]();
        delete conversationListeners[roomId];
        delete conversationData[roomId];
      }
    });

    dmRoomIds = newDmRoomIds;

    if (dmRoomIds.length === 0) {
      conversationData = {};
      processAndCallback();
      return;
    }

    dmRoomIds.forEach(roomId => {
      if (!conversationListeners[roomId]) {
        const roomMetadataRef = ref(db_rtdb, `directMessages/${roomId}/metadata`);
        conversationListeners[roomId] = onValue(roomMetadataRef, (metaSnapshot) => {
          if (metaSnapshot.exists()) {
            const metadata = metaSnapshot.val() as DMRoomMetadata;
            const otherParticipantId = Object.keys(metadata.participants || {}).find(pid => pid !== userId);
            
            if (otherParticipantId) {
              const existingConvo = conversationData[roomId];
              const newOtherParticipantUsername = metadata.participantUsernames?.[otherParticipantId] || 'Unknown User';
              const newOtherParticipantPhotoURL = metadata.participantPhotoURLs?.[otherParticipantId];
              const newLastMessageText = metadata.lastMessageText;
              const newUnreadCount = metadata.unreadCount?.[userId] || 0;
              const newTimestamp = metadata.lastMessageTimestamp as number;

              // Check if significant data has changed before recreating the object
              if (
                !existingConvo ||
                existingConvo.lastMessageText !== newLastMessageText ||
                existingConvo.unreadCount !== newUnreadCount ||
                existingConvo.lastMessageTimestamp !== newTimestamp ||
                existingConvo.otherParticipant.username !== newOtherParticipantUsername ||
                existingConvo.otherParticipant.photoURL !== newOtherParticipantPhotoURL
              ) {
                conversationData[roomId] = {
                  dmRoomId: roomId,
                  otherParticipant: {
                    uid: otherParticipantId,
                    username: newOtherParticipantUsername,
                    photoURL: newOtherParticipantPhotoURL,
                  },
                  lastMessageText: newLastMessageText,
                  lastMessageTimestamp: newTimestamp,
                  unreadCount: newUnreadCount,
                };
              }
              // No "else" needed; if data is same, existingConvo in conversationData keeps its reference.
              processAndCallback();
            } else { // Could happen if participant data is malformed
                 delete conversationData[roomId];
                 if (conversationListeners[roomId]) {
                    conversationListeners[roomId]();
                    delete conversationListeners[roomId];
                 }
                 processAndCallback();
            }
          } else {
            delete conversationData[roomId];
            if (conversationListeners[roomId]) {
                conversationListeners[roomId]();
                delete conversationListeners[roomId];
            }
            processAndCallback();
          }
        }, (error) => {
            console.error(`Error listening to metadata for room ${roomId}:`, error);
            delete conversationData[roomId];
            if (conversationListeners[roomId]) {
                conversationListeners[roomId]();
                delete conversationListeners[roomId];
            }
            processAndCallback();
        });
      }
    });
  }, (error) => {
    console.error(`Error listening to user DM rooms for ${userId}:`, error);
    Object.values(conversationListeners).forEach(unsubscribe => unsubscribe());
    callback([]);
  });
}
