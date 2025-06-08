
import { Timestamp } from 'firebase/firestore'; // Kept for potential other uses, but not for RTDB ConfessionPost.createdAt
import firebase from './firebase'; // Import the firebase namespace

// --- Firebase Auth Specific Types ---
export type FirebaseUser = firebase.User; // Specific type for Firebase Auth User object
export type FirebaseUserCredential = firebase.auth.UserCredential; // Specific type for Firebase Auth UserCredential object


// --- START OF BANTER APP-SPECIFIC DEFINITIONS ---

export type BadgeId =
  | 'wordsmith'
  | 'comeback_kid'
  | 'trending_now'
  | 'banter_og'
  | 'mvp'
  | 'star_scorer'      // New badge for entering top 5
  | 'supernova_author' // New badge for hitting #1
  // Chat Gamification Badges
  | 'daily_chatter_bronze'
  | 'daily_chatter_silver'
  | 'daily_chatter_gold'
  | 'streak_starter'
  | 'streak_master';


export interface PostFlairDefinition {
  id: string;
  name: string;
  icon: string; // e.g., 'fas fa-fire'
  iconColorClass: string; // e.g., 'text-red-500'
  backgroundColorClass?: string; // Optional: e.g., 'bg-red-500/10' for post card background
  borderColorClass?: string; // Optional: e.g., 'border-red-500/50' for post card border
  description: string;
  unlockAtPoints: number;
}

// Definition for an avatar frame
export interface AvatarFrameDefinition {
  id: string;
  name: string;
  borderClasses: string; // Tailwind classes for the border
  unlockAtPoints: number;
  description: string;
}

// Definition for a single element within an avatar flair (e.g., an icon or a shape)
export interface AvatarFlairElement {
  type: 'icon' | 'shape';
  iconClass?: string; // e.g., 'fas fa-star'
  iconColorClass?: string; // e.g., 'text-yellow-400'
  shapeClasses?: string; // e.g., 'w-2 h-2 bg-red-500 rounded-full'
  positionClasses: string; // Tailwind classes for positioning (absolute, top-0, etc.)
  // animationClasses?: string; // Optional: e.g., 'animate-pulse'
}

// Definition for an avatar flair (can be composed of multiple elements)
export interface AvatarFlairDefinition {
  id: string;
  name: string;
  elements: AvatarFlairElement[];
  unlockAtPoints: number;
  description: string;
}


export interface BadgeDefinition {
  id: BadgeId;
  name: string;
  description: string;
  icon: string; // Font Awesome class, e.g., "fas fa-medal"
}

export type ReactionType = 'like' | 'dislike' | 'funny' | 'relatable' | 'wow' | 'hmm';

export const REACTION_ICONS: Record<ReactionType, string> = {
  like: 'fas fa-heart',
  dislike: 'fas fa-heart-crack',
  funny: 'fas fa-face-laugh-squint',
  relatable: 'fas fa-people-arrows',
  wow: 'fas fa-face-surprise',
  hmm: 'fas fa-face-thinking',
};

export const REACTION_COLORS: Record<ReactionType, string> = {
  like: 'text-red-500', // DaisyUI: text-error
  dislike: 'text-slate-500',
  funny: 'text-yellow-500', // DaisyUI: text-warning
  relatable: 'text-blue-500', // DaisyUI: text-info
  wow: 'text-purple-500', // DaisyUI: text-accent
  hmm: 'text-green-500', // DaisyUI: text-success
};


export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
  points: number;
  createdAt: number; // RTDB: Typically a number (timestamp)
  lastActivityAt: number | object; // RTDB: number or serverTimestamp() object
  photoURL?: string;
  selectedTheme?: string;
  // Avatar Customization
  selectedAvatarFrameId?: string | null;
  selectedAvatarFlairId?: string | null;
  unlockedAvatarFrames?: string[];
  unlockedAvatarFlairs?: string[];
  // Post Flairs
  unlockedPostFlairs?: string[];
  // Badges & Stats
  badges?: BadgeId[];
  postsAuthoredCount?: number;
  commentsAuthoredCount?: number;
  reactionsReceivedCount?: number; // Total reactions on user's posts
  // Chat Gamification
  chatStreak?: number;
  longestChatStreak?: number;
  lastChatActivityDate?: string; // YYYY-MM-DD
  dailyMessageCount?: number;
  lastDailyMessageCountResetDate?: string; // YYYY-MM-DD
  awardedDailyMessageMilestones?: {
    [date_YYYYMMDD: string]: {
      '5': boolean;
      '15': boolean;
      '30': boolean;
    }
  };
  awardedStreakMilestones?: {
    '3day': boolean;
    '7day': boolean;
    '30day': boolean;
  };
  // Notifications & DMs
  unreadNotificationsCount?: number;
  // unreadDmCount will be derived client-side or managed per DM room

  // Friend System
  friends?: Record<string, boolean>; // Key: friend's UID, Value: true
  friendRequestsSent?: Record<string, boolean>; // Key: target UID, Value: true (request pending)
  friendRequestsReceived?: Record<string, boolean>; // Key: sender UID, Value: true (request pending)
  unreadFriendRequestCount?: number; // For quick display on a "Friends" icon/tab

  // Admin field
  isAdmin?: boolean;
  isBanned?: boolean;
  banReason?: string;
  tempBanUntil?: number; // Timestamp for when the temporary ban expires
  tempBanReason?: string; // Reason for the temporary ban
}

export interface ConfessionPost {
  id: string;
  userId: string;
  authorUsername?: string;
  authorPhotoURL?: string;
  authorSelectedFrameId?: string | null;
  authorSelectedFlairId?: string | null;
  wittyDisplayName?: string;
  customTitle?: string;
  text: string;
  createdAt: number; // RTDB: Typically a number (timestamp)
  reactions?: { [userId: string]: ReactionType };
  reactionSummary?: { [key in ReactionType]?: number };
  likesCount?: number; // Legacy or quick access, prefer reactionSummary
  commentCount: number;
  comments?: { [commentId: string]: Comment };
  tags?: string[];
  authorLevelName?: string;
  authorBadges?: BadgeId[];
  imageUrl?: string;
  selectedPostFlairId?: string | null; // NEW
  // Trending/Star Power related fields
  wishesGrantedBy?: { [userId: string]: number }; // userId: timestamp
  starPowerBoost?: { amount: number; expiresAt: number } | null;
  hasBeenInTop5?: boolean;
  hasBeenSupernova?: boolean;
  firstReachedSupernovaAt?: number | null; // Timestamp
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  userDisplayName: string;
  commenterPhotoURL?: string;
  commenterSelectedFrameId?: string | null;
  commenterSelectedFlairId?: string | null;
  text: string;
  createdAt: number; // RTDB: Typically a number (timestamp)
  parentId?: string; // For nested comments
}

// For client-side processing, adding level and reply counts
export interface ProcessedComment extends Comment {
  level: number;
  directReplyCount: number;
  totalReplyCount: number;
}


export type SortByType = 'latest' | 'mostLiked' | 'mostCommented' | 'hot';

export type ImagePresenceFilter = 'all' | 'with' | 'without';


// Component Prop Types
export interface AuthFormProps {
  isRegister?: boolean;
  onSubmit: (email: string, passwordOne: string, passwordTwo?: string, username?: string) => Promise<void>;
  loading: boolean;
  error: string | null;
  contextualMessage?: string | null;
  onSwitchForm?: () => void;
}

export interface FeedControlsProps {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  pointsTooltipText: string;
  sortBy: SortByType;
  setSortBy: (type: SortByType) => void;
  allPosts: ConfessionPost[]; // Used for PopulatTagsCloud
  onTagClick: (tag: string) => void;
  activeTagFilter: string[];
  onClearAllTagFilters: () => void;
  searchKeyword: string;
  setSearchKeyword: (keyword: string) => void;
  onApplyKeywordSearch: () => void;
  filterUsername: string;
  setFilterUsername: (username: string) => void;
  filterImagePresence: ImagePresenceFilter;
  setFilterImagePresence: (filter: ImagePresenceFilter) => void;
  onClearAdvancedFilters: () => void;
}

export interface BanterFeedProps {
  isLoading: boolean;
  allConfessions: ConfessionPost[];
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  openAuthModal: (type: 'login' | 'register', message?: string, redirectPath?: string) => void;
  onReact: (postId: string, reactionType: ReactionType, postAuthorId: string) => Promise<void>;
  onOpenCommentModal: (post: ConfessionPost) => void;
  onOpenReadMoreModal: (post: ConfessionPost) => void;
  onOpenAuthorProfileModal: (authorUsername: string, targetUserProfile?: UserProfile | null) => void;
  onTagClick: (tag: string) => void;
  activeTagFilter?: string[];
  onShareFirstBanter: () => void;
  onClearAllTagFilters: () => void;
  allUserProfiles?: UserProfile[]; // For UserHoverTooltip points
}

export interface PostCardProps {
  post: ConfessionPost;
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null; // Logged-in user's profile
  onReact: (postId: string, reactionType: ReactionType, postAuthorId: string) => Promise<void>;
  openAuthModal: (type: 'login' | 'register', message?: string, redirectPath?: string) => void;
  onOpenCommentModal: (post: ConfessionPost) => void;
  onOpenReadMoreModal: (post: ConfessionPost) => void;
  onOpenAuthorProfileModal: (authorUsername: string, targetUserProfile?: UserProfile | null) => void;
  onTagClick: (tag: string) => void;
  activeTags?: string[];
  allUserProfiles?: UserProfile[]; // For UserHoverTooltip points
}


export interface NavbarProps {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  isLoading: boolean;
  openAuthPage: (type: 'login' | 'register', message?: string, redirectPath?: string) => void;
  allConfessions: ConfessionPost[];
  isLoadingConfessions: boolean;
  openChatModal: () => void;
  openDmModal: () => void;
  unreadNotificationsCount?: number;
  unreadDmCount?: number;
}

export interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: FirebaseUser;
  userProfile: UserProfile;
  onLogout: () => void;
  allConfessions: ConfessionPost[];
  onUsernameUpdate: (newUsername: string, oldUsername: string) => Promise<void>;
  onAvatarCustomizationUpdate: (customization: { photoURL?: string; frameId?: string | null; flairId?: string | null; }) => Promise<{ success: boolean; error?: string }>;
}

export interface AuthorProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  authorProfile: UserProfile | null;
  allConfessions: ConfessionPost[];
  isLoading: boolean;
}

export interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (text: string, tags: string[], wittyDisplayName: string, customTitle: string, imageUrl?: string, selectedPostFlairId?: string | null) => Promise<void>;
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  initialText?: string;
  initialTags?: string[];
}

export interface PaginationProps {
  totalItems: number;
  itemsPerPage: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  maxPageButtons?: number;
}

export interface UserProfilePageProps {
  allConfessions: ConfessionPost[];
  userProfiles?: UserProfile[];
  isLoadingUserProfiles?: boolean;
  openAuthPage: (type: 'login' | 'register', message?: string, redirectPath?: string) => void;
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  onReact: (postId: string, reactionType: ReactionType, postAuthorId: string) => Promise<void>;
  onOpenCommentModal: (post: ConfessionPost) => void;
  onOpenReadMoreModal: (post: ConfessionPost) => void;
  onTagClick: (tag: string) => void;
  onOpenAuthorProfileModal: (authorUsername: string, targetUserProfile?: UserProfile | null) => void;
}

export interface LeaderboardPageProps {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  allUserProfiles: UserProfile[];
  isLoadingUserProfiles: boolean;
}

export interface AdminPageProps {
  currentUser: FirebaseUser | null;
  loggedInUserProfile: UserProfile | null; // Admin's own profile
  allUserProfiles: UserProfile[];
  allConfessions: ConfessionPost[];
  isLoadingUserProfiles: boolean;
  isLoadingConfessions: boolean;
}


// Chat Specific Types
export interface ChatMessageData {
  id: string;
  userId: string;
  username: string;
  userPhotoURL?: string;
  userSelectedFrameId?: string | null;
  userSelectedFlairId?: string | null;
  userChatStreak?: number;
  text: string;
  timestamp: number | object;
  type?: 'user' | 'system_firstMessage' | 'system_generic';
}

export interface ChatUser extends Pick<UserProfile, 'uid' | 'username' | 'photoURL' | 'selectedAvatarFrameId' | 'selectedAvatarFlairId' | 'chatStreak'> {
  lastSeen: number | object;
  isTyping?: boolean;
}

export interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  openAuthPage: (type: 'login' | 'register', message?: string, redirectPath?: string) => void;
}

// Daily Prompt Type
export interface DailyPrompt {
  date: string; // YYYY-MM-DD
  text: string;
  error?: string;
}

// Represents Banter Level information
export interface BanterLevel {
    name: string;
    minPoints: number;
    maxPoints: number;
    icon: string;
}

// --- Direct Messaging (DM) Types ---
export interface DMMessage {
  id: string;
  senderId: string;
  senderUsername: string;
  senderPhotoURL?: string;
  text: string;
  timestamp: number | object;
  isRead?: boolean;
}

export interface DMRoomMetadata {
  id: string;
  participants: Record<string, boolean>;
  participantUsernames: Record<string, string>;
  participantPhotoURLs: Record<string, string | undefined>;
  lastMessageText?: string;
  lastMessageTimestamp?: number | object;
  lastMessageSenderId?: string;
  createdAt: number | object;
  updatedAt: number | object;
  unreadCount?: Record<string, number>;
}

export interface DMRoom extends DMRoomMetadata {
  messages: Record<string, DMMessage>;
}

// For client-side display of DM conversations
export interface DMConversationItem {
  dmRoomId: string;
  otherParticipant: {
    uid: string;
    username: string;
    photoURL?: string;
  };
  lastMessageText?: string;
  lastMessageTimestamp?: number;
  unreadCount: number;
}


// --- Notification Types ---
export type NotificationType =
  | 'reply_post'
  | 'reply_comment'
  | 'reaction_post'
  | 'new_dm'
  | 'trending_milestone'
  | 'badge_unlocked'
  | 'friend_request'
  | 'friend_request_accepted'
  | 'temp_ban_applied' // Added for temporary ban
  | 'temp_ban_lifted'; // Added for temporary ban lift

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  actorId: string;
  actorUsername: string;
  actorPhotoURL?: string;
  targetId: string;
  targetParentId?: string;
  message: string;
  link: string;
  timestamp: number | object;
  isRead: boolean;
}

// For displaying grouped notifications
export interface GroupedNotificationItem {
  id: string; // e.g., `group-${targetId}-${type}`
  type: `grouped_${NotificationType}` | NotificationType; // Distinguish from single notification
  targetId: string; // Common target ID for the group (e.g., postId)
  targetParentId?: string; // Common parent target ID (e.g., commentId for grouped replies to same comment)
  actorUsernames: string[]; // List of usernames of actors in the group
  actorPhotoURLs: (string | undefined)[]; // List of photoURLs
  message: string; // Summarized message, e.g., "Alice, Bob, and 2 others reacted..."
  link: string; // Link to the common target
  timestamp: number; // Timestamp of the latest notification in the group
  isRead: boolean; // Group is unread if any constituent notification is unread
  originalNotificationIds: string[]; // IDs of the individual notifications this group represents
  count: number; // Total number of notifications in this group
  firstActorUsername: string; // Username of the first actor for display
  firstActorPhotoURL?: string; // PhotoURL of the first actor for display
}

export type ProcessedNotificationItem = Notification | GroupedNotificationItem;


// CommentModalProps: onSubmitComment expects Promise<void>
export interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: ConfessionPost | null;
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  onSubmitComment: (postId: string, commentText: string, parentId?: string, parentCommentUserId?: string, originalPostTimestamp?: number) => Promise<void>;
  openAuthModal: (type: 'login' | 'register', message?: string, redirectPath?: string) => void;
}

// ReadMoreModalProps: onReact expects Promise<void>
export interface ReadMoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: ConfessionPost | null;
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  onOpenComments: (post: ConfessionPost) => void;
  onReact: (postId: string, reactionType: ReactionType, postAuthorId: string) => Promise<void>;
  openAuthModal: (type: 'login' | 'register', message?: string, redirectPath?: string) => void;
  onTagClickOnFeed: (tag: string) => void;
}

// Suggested Users Sidebar Props
export interface SuggestedUsersSidebarProps {
  currentUser: FirebaseUser | null;
  currentUserProfile: UserProfile | null;
  allUserProfiles: UserProfile[];
  isLoadingUserProfiles: boolean;
}

// User Hover Tooltip Props
export interface UserHoverTooltipProps {
  targetUser: UserProfile;
  currentUser: FirebaseUser | null;
  currentUserProfile: UserProfile | null;
  children: React.ReactNode;
  onSendMessage?: (targetUserId: string) => void;
}
