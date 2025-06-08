
import { ref, get, update, runTransaction, serverTimestamp, remove } from 'firebase/database';
import { db_rtdb } from '../firebase';
import { ConfessionPost, UserProfile, BadgeId, DMRoomMetadata, NotificationType } from '../types'; 
import { AVATAR_FRAMES, AVATAR_FLAIRS } from './avatarDecorations'; 
import { POST_FLAIRS } from './postFlairDecorations'; 
import { createNotification } from './notificationUtils'; 

/**
 * Updates the authorPhotoURL for all posts and comments made by a specific user.
 * Also updates the user's photoURL in their direct message room metadata.
 * @param userId The ID of the user whose photoURL has changed.
 * @param newPhotoURL The new photoURL to set.
 */
export async function updateAuthorPhotoURLsInContent(userId: string, newPhotoURL: string): Promise<void> {
  console.log(`Starting photoURL update for user ${userId} to ${newPhotoURL}`);
  const confessionsRef = ref(db_rtdb, 'confessions');
  const userDmRoomsRef = ref(db_rtdb, `userDmRooms/${userId}`);
  const updates: { [key: string]: any } = {};
  let updatedPostCount = 0;
  let updatedCommentCount = 0;
  let updatedDmRoomCount = 0;

  try {
    // Update in Confessions (Posts and Comments)
    const confessionsSnapshot = await get(confessionsRef);
    if (confessionsSnapshot.exists()) {
      const allConfessionsData = confessionsSnapshot.val() as { [key: string]: ConfessionPost };
      for (const postId in allConfessionsData) {
        const post = allConfessionsData[postId];
        if (post.userId === userId && post.authorPhotoURL !== newPhotoURL) {
          updates[`confessions/${postId}/authorPhotoURL`] = newPhotoURL;
          updatedPostCount++;
        }
        if (post.comments) {
          for (const commentId in post.comments) {
            const comment = post.comments[commentId];
            if (comment.userId === userId && comment.commenterPhotoURL !== newPhotoURL) {
              updates[`confessions/${postId}/comments/${commentId}/commenterPhotoURL`] = newPhotoURL;
              updatedCommentCount++;
            }
          }
        }
      }
    } else {
      console.log("No confessions found to update photoURLs.");
    }

    // Update in Direct Messages Metadata
    const userDmRoomsSnapshot = await get(userDmRoomsRef);
    if (userDmRoomsSnapshot.exists()) {
        const userDmRoomIds = userDmRoomsSnapshot.val() as Record<string, boolean>;
        for (const dmRoomId in userDmRoomIds) {
            if (userDmRoomIds[dmRoomId]) { 
                const dmRoomMetadataRef = ref(db_rtdb, `directMessages/${dmRoomId}/metadata`);
                const dmRoomMetadataSnapshot = await get(dmRoomMetadataRef);
                if (dmRoomMetadataSnapshot.exists()) {
                    const metadata = dmRoomMetadataSnapshot.val() as DMRoomMetadata;
                    if (metadata.participantPhotoURLs && metadata.participantPhotoURLs[userId] !== newPhotoURL) {
                         updates[`directMessages/${dmRoomId}/metadata/participantPhotoURLs/${userId}`] = newPhotoURL;
                         updatedDmRoomCount++;
                    }
                }
            }
        }
    }


    if (Object.keys(updates).length > 0) {
      await update(ref(db_rtdb), updates);
      console.log(`Successfully updated photoURLs. Posts: ${updatedPostCount}, Comments: ${updatedCommentCount}, DM Rooms: ${updatedDmRoomCount}.`);
    } else {
      console.log("No photoURLs needed updating in content for user " + userId);
    }
  } catch (error: any) {
    let errorMessage = `Error updating photoURLs in content for user ${userId}: ${error.message || error}`;
    if (error.code === 'PERMISSION_DENIED' || (error.message && error.message.toUpperCase().includes('PERMISSION_DENIED'))) {
        errorMessage += "\nThis is likely a Firebase Realtime Database security rule issue. Ensure your rules allow the authenticated user to write to their content and DM metadata.";
    }
    console.error(errorMessage, error);
    throw new Error("Failed to update photoURLs in all content. Check Firebase security rules.");
  }
}

/**
 * Updates selected avatar frame and flair IDs in all posts and comments by a user.
 * @param userId The user's ID.
 * @param frameId The new frame ID (or null to remove).
 * @param flairId The new flair ID (or null to remove).
 */
export async function updateAuthorDecorationsInContent(userId: string, frameId?: string | null, flairId?: string | null): Promise<void> {
  console.log(`Starting decoration update for user ${userId}. Frame: ${frameId}, Flair: ${flairId}`);
  const confessionsRef = ref(db_rtdb, 'confessions');
  try {
    const snapshot = await get(confessionsRef);
    if (!snapshot.exists()) {
      console.log("No confessions found to update decorations.");
      return;
    }
    const allConfessionsData = snapshot.val() as { [key: string]: ConfessionPost };
    const updates: { [key: string]: any } = {};
    let updatedPosts = 0;
    let updatedComments = 0;

    for (const postId in allConfessionsData) {
      const post = allConfessionsData[postId];
      let postNeedsUpdate = false;
      if (post.userId === userId) {
        if (frameId !== undefined && post.authorSelectedFrameId !== frameId) {
          updates[`confessions/${postId}/authorSelectedFrameId`] = frameId;
          postNeedsUpdate = true;
        }
        if (flairId !== undefined && post.authorSelectedFlairId !== flairId) {
          updates[`confessions/${postId}/authorSelectedFlairId`] = flairId;
          postNeedsUpdate = true;
        }
        if (postNeedsUpdate) updatedPosts++;
      }

      if (post.comments) {
        for (const commentId in post.comments) {
          const comment = post.comments[commentId];
          let commentNeedsUpdate = false;
          if (comment.userId === userId) {
            if (frameId !== undefined && comment.commenterSelectedFrameId !== frameId) {
              updates[`confessions/${postId}/comments/${commentId}/commenterSelectedFrameId`] = frameId;
              commentNeedsUpdate = true;
            }
            if (flairId !== undefined && comment.commenterSelectedFlairId !== flairId) {
              updates[`confessions/${postId}/comments/${commentId}/commenterSelectedFlairId`] = flairId;
              commentNeedsUpdate = true;
            }
            if (commentNeedsUpdate) updatedComments++;
          }
        }
      }
    }
    if (Object.keys(updates).length > 0) {
      await update(ref(db_rtdb), updates);
      console.log(`Successfully updated decorations. Posts: ${updatedPosts}, Comments: ${updatedComments}.`);
    } else {
      console.log(`No decorations needed updating in content for user ${userId}.`);
    }
  } catch (error: any) {
    let errorMessage = `Error updating decorations in content for user ${userId}: ${error.message || error}`;
    if (error.code === 'PERMISSION_DENIED' || (error.message && error.message.toUpperCase().includes('PERMISSION_DENIED'))) {
        errorMessage += "\nThis is likely a Firebase Realtime Database security rule issue. Ensure your rules allow the authenticated user to write to the 'authorSelectedFrameId', 'authorSelectedFlairId', 'commenterSelectedFrameId', and 'commenterSelectedFlairId' fields of their own posts and comments respectively.";
    }
    console.error(errorMessage, error);
    throw new Error("Failed to update decorations in all content. Check Firebase security rules.");
  }
}

/**
 * Checks and unlocks avatar frames/flairs based on user points.
 * Updates the user's profile in Firebase if new items are unlocked.
 * @param userId User's ID
 * @param currentPoints User's current points
 * @param currentUnlockedFrames Array of currently unlocked frame IDs
 * @param currentUnlockedFlairs Array of currently unlocked flair IDs
 */
export async function checkAndUnlockAvatarItemsIfNeeded(
  userId: string,
  currentPoints: number,
  currentUnlockedFrames: string[] = [],
  currentUnlockedFlairs: string[] = []
): Promise<void> {
  const userProfileRef = ref(db_rtdb, `userProfiles/${userId}`);
  let newFramesUnlocked = false;
  let newFlairsUnlocked = false;

  const updatedUnlockedFrames = [...(currentUnlockedFrames || ['none'])]; 
  AVATAR_FRAMES.forEach(frame => {
    if (currentPoints >= frame.unlockAtPoints && !updatedUnlockedFrames.includes(frame.id)) {
      updatedUnlockedFrames.push(frame.id);
      newFramesUnlocked = true;
    }
  });

  const updatedUnlockedFlairs = [...(currentUnlockedFlairs || ['none'])]; 
  AVATAR_FLAIRS.forEach(flair => {
    if (currentPoints >= flair.unlockAtPoints && !updatedUnlockedFlairs.includes(flair.id)) {
      updatedUnlockedFlairs.push(flair.id);
      newFlairsUnlocked = true;
    }
  });

  if (newFramesUnlocked || newFlairsUnlocked) {
    try {
      const updates: Partial<UserProfile> = {};
      if (newFramesUnlocked) updates.unlockedAvatarFrames = updatedUnlockedFrames;
      if (newFlairsUnlocked) updates.unlockedAvatarFlairs = updatedUnlockedFlairs;
      
      await update(userProfileRef, updates);
      console.log(`User ${userId} unlocked new avatar items. Frames: ${newFramesUnlocked}, Flairs: ${newFlairsUnlocked}`);
    } catch (error) {
      console.error(`Failed to update unlocked avatar items for user ${userId}:`, error);
    }
  }
}

/**
 * Checks and unlocks post flairs based on user points.
 * Updates the user's profile in Firebase if new post flairs are unlocked.
 * @param userId User's ID
 * @param currentPoints User's current points
 * @param currentUnlockedPostFlairs Array of currently unlocked post flair IDs
 */
export async function checkAndUnlockPostFlairsIfNeeded(
  userId: string,
  currentPoints: number,
  currentUnlockedPostFlairs: string[] = []
): Promise<void> {
  const userProfileRef = ref(db_rtdb, `userProfiles/${userId}`);
  let newPostFlairsUnlocked = false;

  const updatedUnlockedPostFlairs = [...(currentUnlockedPostFlairs || [])]; 
  POST_FLAIRS.forEach(flair => {
    if (flair.unlockAtPoints >= 0 && currentPoints >= flair.unlockAtPoints && !updatedUnlockedPostFlairs.includes(flair.id)) {
      updatedUnlockedPostFlairs.push(flair.id);
      newPostFlairsUnlocked = true;
    }
  });

  if (newPostFlairsUnlocked) {
    try {
      const updates: Partial<UserProfile> = {
        unlockedPostFlairs: updatedUnlockedPostFlairs,
      };
      await update(userProfileRef, updates);
      console.log(`User ${userId} unlocked new post flairs.`);
    } catch (error) {
      console.error(`Failed to update unlocked post flairs for user ${userId}:`, error);
    }
  }
}


export const generateDefaultDicebear7xAvatarUrl = (seed: string, style: string = 'initials'): string => {
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;
};

export async function awardTrendingMilestone(
  postId: string, 
  userId: string, 
  milestoneType: 'top5' | 'supernova',
  actorUsername?: string, 
  actorPhotoURL?: string 
): Promise<void> {
  if (!userId || !postId) return;

  const postRef = ref(db_rtdb, `confessions/${postId}`);
  const userProfileRef = ref(db_rtdb, `userProfiles/${userId}`);
  let postTitleForNotif = "Your Post";
  const badgeToAward: BadgeId | null = milestoneType === 'top5' ? 'star_scorer' : 'supernova_author';
  const pointsToAward = milestoneType === 'top5' ? 25 : 100; 

  try {
    const postSnapshot = await get(postRef);
    if(postSnapshot.exists()) {
        const postData = postSnapshot.val() as ConfessionPost;
        postTitleForNotif = postData.customTitle || postData.text.substring(0, 20) + "...";

        if (milestoneType === 'top5' && postData.hasBeenInTop5) return; 
        if (milestoneType === 'supernova' && postData.hasBeenSupernova) return; 
    } else {
        return; 
    }

    await runTransaction(postRef, (post: ConfessionPost | null) => {
      if (post) {
        if (milestoneType === 'top5' && !post.hasBeenInTop5) {
          post.hasBeenInTop5 = true;
        }
        if (milestoneType === 'supernova' && !post.hasBeenSupernova) {
          post.hasBeenSupernova = true;
          post.firstReachedSupernovaAt = serverTimestamp() as any;
        }
      }
      return post;
    });

    await awardPoints(userId, pointsToAward, undefined); 
    if (badgeToAward) {
      await ensureBadgeAwarded(userId, badgeToAward, actorUsername, actorPhotoURL);
    }
    
    const notificationMessage = milestoneType === 'top5' 
        ? `Congrats! Your post "${postTitleForNotif}" made it to the Top 5 Rising Stars! +${pointsToAward}pts & new badge!`
        : `WOW! Your post "${postTitleForNotif}" hit #1 Supernova status! +${pointsToAward}pts & new badge!`;

    await createNotification(
        userId,
        'trending_milestone',
        actorUsername || 'Banter System', 
        actorUsername || 'Banter System', 
        postId,
        notificationMessage,
        `/?postId=${postId}`,
        actorPhotoURL 
    );

    console.log(`Awarded '${milestoneType}' milestone to user ${userId} for post ${postId}.`);

  } catch (error) {
    console.error(`Error awarding trending milestone for post ${postId}:`, error);
  }
}


export const awardPoints = async (userId: string, points: number, userEmail?: string): Promise<void> => {
  if (!userId || typeof points !== 'number') return;
  const userProfileRef = ref(db_rtdb, `userProfiles/${userId}`);
  try {
    await runTransaction(userProfileRef, (profile: UserProfile | null) => {
      if (profile) {
        profile.points = (profile.points || 0) + points;
        profile.lastActivityAt = serverTimestamp() as any; 
      } else if (points > 0 && userEmail) { 
        console.warn(`Profile for user ${userId} not found, creating with initial points. This should ideally be handled at registration.`);
        const usernameFromEmail = userEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').substring(0, 15) || `user${Date.now().toString().slice(-4)}`;
        return {
          uid: userId, username: usernameFromEmail, displayName: usernameFromEmail,
          points: points, createdAt: serverTimestamp() as any, lastActivityAt: serverTimestamp() as any,
          photoURL: generateDefaultDicebear7xAvatarUrl(usernameFromEmail),
          selectedTheme: 'lemonade',
          selectedAvatarFrameId: 'none', selectedAvatarFlairId: 'none',
          unlockedAvatarFrames: ['none'], unlockedAvatarFlairs: ['none'], unlockedPostFlairs: [],
          badges: [], postsAuthoredCount: 0, commentsAuthoredCount: 0, reactionsReceivedCount: 0,
          chatStreak: 0, longestChatStreak: 0, lastChatActivityDate: '', dailyMessageCount: 0,
          lastDailyMessageCountResetDate: '', awardedDailyMessageMilestones: {},
          awardedStreakMilestones: { '3day': false, '7day': false, '30day': false },
          isAdmin: false, isBanned: false,
        } as UserProfile;
      }
      return profile;
    });
  } catch (error) {
    console.error(`Error awarding points to user ${userId}:`, error);
  }
};

export const ensureBadgeAwarded = async (userId: string, badgeId: BadgeId, actorUsername?: string, actorPhotoURL?: string): Promise<void> => {
  if (!userId || !badgeId) return;
  const userProfileRef = ref(db_rtdb, `userProfiles/${userId}`);
  try {
    await runTransaction(userProfileRef, (profile: UserProfile | null) => {
      if (profile) {
        if (!profile.badges) profile.badges = [];
        if (!profile.badges.includes(badgeId)) {
          profile.badges.push(badgeId);
          (profile as any).__newlyAwardedBadge = badgeId; 
        }
      }
      return profile;
    }).then(async (result) => {
        if (result.committed && (result.snapshot.val() as any)?.__newlyAwardedBadge === badgeId) {
            const profileAfterTransaction = result.snapshot.val() as UserProfile;
            await createNotification(
                userId,
                'badge_unlocked',
                actorUsername || 'Banter System', 
                actorUsername || 'Banter System',
                badgeId, 
                `You've unlocked the "${badgeId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}" badge!`,
                `/user/${profileAfterTransaction.username}`, 
                actorPhotoURL 
            );
            console.log(`Badge "${badgeId}" awarded to user ${userId}.`);
        }
    });
  } catch (error) {
    console.error(`Error ensuring badge "${badgeId}" for user ${userId}:`, error);
  }
};


export const toggleUserAdminStatus = async (targetUid: string, currentIsAdmin: boolean): Promise<void> => {
  const userProfileRef = ref(db_rtdb, `userProfiles/${targetUid}`);
  try {
    await update(userProfileRef, { isAdmin: !currentIsAdmin });
  } catch (error: any) {
    throw new Error(error.message || "Failed to update admin status.");
  }
};

export const deleteConfessionByAdmin = async (postId: string): Promise<void> => {
  const postRef = ref(db_rtdb, `confessions/${postId}`);
  try {
    await remove(postRef);
  } catch (error: any) {
    throw new Error(error.message || "Failed to delete confession.");
  }
};

export const setUserBanStatus = async (targetUid: string, ban: boolean, reason?: string): Promise<void> => {
  const userProfileRef = ref(db_rtdb, `userProfiles/${targetUid}`);
  const profileSnapshot = await get(userProfileRef);
  if (!profileSnapshot.exists()) {
    throw new Error("User profile not found for ban/unban operation.");
  }
  const userProfile = profileSnapshot.val() as UserProfile;
  const finalReason = ban ? (reason || "No reason provided.") : null;

  try {
    await update(userProfileRef, { isBanned: ban, banReason: finalReason });
    
    // Determine notification type - use existing types and clarify in message
    // Ideally, new NotificationTypes 'permanent_ban_applied' and 'permanent_ban_lifted' would be added.
    // For now, re-using 'temp_ban_applied' and 'temp_ban_lifted' and making message distinct.
    const notificationType: NotificationType = ban ? 'temp_ban_applied' : 'temp_ban_lifted';
    const notificationMessage = ban 
        ? `Your account has been PERMANENTLY banned by an admin. Reason: ${finalReason || 'Not specified.'}`
        : "Your PERMANENT account ban has been lifted by an admin.";
    
    await createNotification(
      targetUid,
      notificationType,
      'Banter System', 
      'Banter System',
      targetUid, 
      notificationMessage,
      `/user/${userProfile.username}` 
    );
    console.log(`User ${targetUid} ${ban ? 'permanently banned' : 'unbanned'}. Reason: ${finalReason}`);
  } catch (error: any) {
    console.error(`Error ${ban ? 'banning' : 'unbanning'} user ${targetUid}:`, error);
    throw new Error(error.message || `Failed to ${ban ? 'ban' : 'unban'} user.`);
  }
};

export const setTempUserBanStatus = async (targetUid: string, durationHours: number, reason?: string): Promise<void> => {
  const userProfileRef = ref(db_rtdb, `userProfiles/${targetUid}`);
  const userProfileSnapshot = await get(userProfileRef);
  if (!userProfileSnapshot.exists()) {
    throw new Error("User profile not found.");
  }
  const userProfile = userProfileSnapshot.val() as UserProfile;

  try {
    if (durationHours <= 0) { 
      await update(userProfileRef, { tempBanUntil: null, tempBanReason: null });
      await createNotification(
        targetUid, 'temp_ban_lifted', 'Banter System', 'Banter System', targetUid,
        "Your temporary account restriction has been lifted by an admin.", `/user/${userProfile.username}`
      );
    } else { 
      const banExpiryTimestamp = Date.now() + durationHours * 60 * 60 * 1000;
      await update(userProfileRef, { tempBanUntil: banExpiryTimestamp, tempBanReason: reason || "No reason provided." });
      await createNotification(
        targetUid, 'temp_ban_applied', 'Banter System', 'Banter System', targetUid,
        `Your account has been temporarily restricted by an admin for ${durationHours} hour(s). Reason: ${reason || "No reason provided."} Restriction ends: ${new Date(banExpiryTimestamp).toLocaleString()}`,
        `/user/${userProfile.username}`
      );
    }
  } catch (error: any) {
    throw new Error(error.message || 'Failed to update temporary ban status.');
  }
};

export async function clearExpiredTempBan(userId: string): Promise<void> {
  const userProfileRef = ref(db_rtdb, `userProfiles/${userId}`);
  try {
    const snapshot = await get(userProfileRef);
    if (snapshot.exists()) {
      const profile = snapshot.val() as UserProfile;
      if (profile.tempBanUntil && profile.tempBanUntil <= Date.now()) {
        await update(userProfileRef, {
          tempBanUntil: null,
          tempBanReason: null,
        });
        await createNotification(
          userId,
          'temp_ban_lifted',
          'Banter System',
          'Banter System',
          userId,
          'Your temporary account restriction has expired.',
          `/user/${profile.username}` 
        );
        console.log(`Expired temporary ban cleared for user ${userId}.`);
      }
    }
  } catch (error) {
    console.error(`Error clearing expired temporary ban for user ${userId}:`, error);
  }
}
