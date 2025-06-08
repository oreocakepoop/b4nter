
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// Removed: import type { User as FirebaseUser } from 'firebase/auth'; 
import {
  ref, push, set, runTransaction, serverTimestamp as rtdbServerTimestamp, get,
} from 'firebase/database';
import { AnimatePresence } from 'framer-motion'; 
import { useNavigate } from 'react-router-dom'; // Updated import

import { ConfessionPost, SortByType, UserProfile, ReactionType, BadgeId, DailyPrompt, FirebaseUser, ImagePresenceFilter } from '../types'; // Added FirebaseUser, ImagePresenceFilter
import { getRandomWittyName, generateUntitledWittyTitle } from '../utils/wittyNameGenerator';
import { getBanterLevelInfo } from '../utils/banterLevels'; 
import { generateDefaultDicebear7xAvatarUrl, checkAndUnlockAvatarItemsIfNeeded, awardPoints, ensureBadgeAwarded } from '../utils/firebaseUtils'; 
import { calculatePostStarPower } from '../utils/postUtils';
import { fetchOrGenerateDailyPrompt } from '../utils/promptUtils'; // Import daily prompt utility
import { useTheme } from '../contexts/ThemeContext'; // Import useTheme
import { createNotification } from '../utils/notificationUtils'; // Added

import TrendingBanterSidebar from '../components/TrendingBanterSidebar';
import CreatePostModal from '../components/CreatePostModal';
import CommentModal from '../components/CommentModal';
import ReadMoreModal from '../components/ReadMoreModal';
import FeedControls from '../components/FeedControls';
import BanterFeed from '../components/BanterFeed';
import CreatePostFAB from '../components/CreatePostFAB';
import Pagination from '../components/Pagination'; 
import AuthorProfileModal from '../components/AuthorProfileModal';
import DailyPromptDisplay from '../components/DailyPromptDisplay'; // Import DailyPromptDisplay
import { db_rtdb } from '../firebase'; 

interface HomePageProps {
  openAuthPage: (type: 'login' | 'register', message?: string, redirectPath?: string) => void; // Changed from openAuthModal
  currentUser: FirebaseUser | null; // Updated type
  userProfile: UserProfile | null; 
  allConfessions: ConfessionPost[]; 
  isLoadingConfessions: boolean; 
}

const POINTS_CREATE_POST = 10;
const POINTS_RECEIVE_LIKE = 5; 
const POINTS_RECEIVE_DISLIKE = -5; // Points for receiving a dislike
const POINTS_POST_COMMENT = 2;
const POSTS_PER_PAGE = 10; 
const MAX_ACTIVE_TAGS = 5;

const HomePage: React.FC<HomePageProps> = ({ openAuthPage, currentUser, userProfile, allConfessions, isLoadingConfessions }) => {
  const navigateHook = useNavigate(); // Updated usage
  const { theme: currentGlobalTheme } = useTheme();
  const [isCreatePostModalOpen, setIsCreatePostModalOpen] = useState(false);
  const [createPostInitialText, setCreatePostInitialText] = useState<string | undefined>(undefined);
  const [createPostInitialTags, setCreatePostInitialTags] = useState<string[] | undefined>(undefined);
  
  // Filtering states
  const [activeTagFilter, setActiveTagFilter] = useState<string[]>([]);
  const [searchKeywordState, setSearchKeywordState] = useState<string>(''); // Internal state for keyword before applying
  const [appliedSearchKeyword, setAppliedSearchKeyword] = useState<string>(''); // Keyword applied for filtering
  const [filterUsername, setFilterUsername] = useState<string>('');
  const [filterImagePresence, setFilterImagePresence] = useState<ImagePresenceFilter>('all');

  const [sortBy, setSortBy] = useState<SortByType>('latest');
  const [currentPage, setCurrentPage] = useState(1); 
  const [selectedPostForCommentModal, setSelectedPostForCommentModal] = useState<ConfessionPost | null>(null);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [selectedPostForReadMoreModal, setSelectedPostForReadMoreModal] = useState<ConfessionPost | null>(null);
  const [isReadMoreModalOpen, setIsReadMoreModalOpen] = useState(false);
  const feedContainerRef = useRef<HTMLDivElement>(null); 
  const [selectedAuthorProfileForModal, setSelectedAuthorProfileForModal] = useState<UserProfile | null>(null);
  const [isAuthorProfileModalOpen, setIsAuthorProfileModalOpen] = useState(false); 
  const [isLoadingAuthorProfile, setIsLoadingAuthorProfile] = useState(false); 
  const [dailyPrompt, setDailyPrompt] = useState<DailyPrompt | null>(null);
  const [isLoadingDailyPrompt, setIsLoadingDailyPrompt] = useState(true);

  useEffect(() => {
    const loadDailyPrompt = async () => {
      setIsLoadingDailyPrompt(true);
      const promptData = await fetchOrGenerateDailyPrompt();
      setDailyPrompt(promptData);
      setIsLoadingDailyPrompt(false);
    };
    loadDailyPrompt();
  }, []);

  useEffect(() => {
    if (selectedPostForCommentModal && isCommentModalOpen) {
      const updatedPost = allConfessions.find(p => p.id === selectedPostForCommentModal.id);
      if (updatedPost && (JSON.stringify(updatedPost.comments || {}) !== JSON.stringify(selectedPostForCommentModal.comments || {}) || updatedPost.commentCount !== selectedPostForCommentModal.commentCount)) {
        setSelectedPostForCommentModal(updatedPost);
      }
    }
  }, [allConfessions, selectedPostForCommentModal, isCommentModalOpen]);

   useEffect(() => {
    if (selectedPostForReadMoreModal && isReadMoreModalOpen) {
      const updatedPost = allConfessions.find(p => p.id === selectedPostForReadMoreModal.id);
      if (updatedPost && JSON.stringify(updatedPost) !== JSON.stringify(selectedPostForReadMoreModal)) {
        setSelectedPostForReadMoreModal(updatedPost);
      }
    }
  }, [allConfessions, selectedPostForReadMoreModal, isReadMoreModalOpen]);

  useEffect(() => { 
    setCurrentPage(1); 
  }, [activeTagFilter, sortBy, appliedSearchKeyword, filterUsername, filterImagePresence]);


  const handleApplyKeywordSearch = useCallback(() => {
    setAppliedSearchKeyword(searchKeywordState.trim().toLowerCase());
  }, [searchKeywordState]);

  const handleClearAdvancedFilters = useCallback(() => {
    setFilterUsername('');
    setFilterImagePresence('all');
  }, []);


  const openCreatePostModalWithDefaults = useCallback((initialText?: string, initialTags?: string[]) => {
    if (!currentUser) {
      openAuthPage('login', "Log in to share your banter!", window.location.hash.substring(1) || '/');
      return;
    }
    setCreatePostInitialText(initialText);
    setCreatePostInitialTags(initialTags);
    setIsCreatePostModalOpen(true);
  }, [currentUser, openAuthPage]);

  const handleUseDailyPrompt = useCallback((promptText: string) => {
    openCreatePostModalWithDefaults(promptText, ['#dailyspark']);
  }, [openCreatePostModalWithDefaults]);

  const handleCreatePost = useCallback(async (text: string, tags: string[], wittyDisplayName: string, customTitle: string, imageUrl?: string, selectedPostFlairId?: string | null) => {
    if (!currentUser || !userProfile) { 
      openAuthPage('login', "Please log in to share banter!", window.location.hash.substring(1) || '/');
      throw new Error("User not logged in or profile not loaded");
    }
    const userLevel = getBanterLevelInfo(userProfile.points);
    const newPostRef = push(ref(db_rtdb, 'confessions'));
    const finalCustomTitle = customTitle.trim() || generateUntitledWittyTitle();
    
    const newPostData: Omit<ConfessionPost, 'id'> = {
      text, customTitle: finalCustomTitle, createdAt: rtdbServerTimestamp() as any, userId: currentUser.uid, 
      authorUsername: userProfile.username, authorPhotoURL: userProfile.photoURL || generateDefaultDicebear7xAvatarUrl(currentUser.uid),
      authorSelectedFrameId: userProfile.selectedAvatarFrameId || null, authorSelectedFlairId: userProfile.selectedAvatarFlairId || null,
      wittyDisplayName: wittyDisplayName.trim() || getRandomWittyName(),
      reactions: {}, reactionSummary: {}, commentCount: 0, comments: {}, tags,
      authorLevelName: userLevel.name, authorBadges: userProfile.badges || [],
      ...(imageUrl && { imageUrl }), selectedPostFlairId: selectedPostFlairId || null,
      wishesGrantedBy: {}, starPowerBoost: null, hasBeenInTop5: false,
      hasBeenSupernova: false, firstReachedSupernovaAt: null, 
    };

    await set(newPostRef, newPostData);
    await awardPoints(currentUser.uid, POINTS_CREATE_POST, currentUser.email || undefined); 
    let newPostsCount = 0;
    await runTransaction(ref(db_rtdb, `userProfiles/${currentUser.uid}`), (p: UserProfile | null) => { if(p) {p.postsAuthoredCount = (p.postsAuthoredCount || 0) + 1; newPostsCount = p.postsAuthoredCount;} return p; });
    if (newPostsCount >= 50) await ensureBadgeAwarded(currentUser.uid, 'wordsmith');
  }, [currentUser, userProfile, openAuthPage]);

  const handleReactToPost = useCallback(async (postId: string, reactionType: ReactionType, postAuthorId: string) => {
    if (!currentUser || !userProfile) { openAuthPage('login', "Log in to react!", window.location.hash.substring(1) || '/'); return; }
    const postRef = ref(db_rtdb, `confessions/${postId}`);
    let previousReactionType: ReactionType | null = null; 
    let isNewReactionAdded = false; 
    let isReactionRemoved = false;
    let currentReactionOfUser: ReactionType | null = null;

    try {
        await runTransaction(postRef, (post: ConfessionPost | null) => {
            if (post) {
                if (!post.reactions) post.reactions = {}; if (!post.reactionSummary) post.reactionSummary = {};
                previousReactionType = post.reactions[currentUser.uid] || null;
                currentReactionOfUser = reactionType; 
                if (previousReactionType === reactionType) { 
                    delete post.reactions[currentUser.uid];
                    post.reactionSummary[reactionType] = (post.reactionSummary[reactionType] || 1) - 1;
                    isReactionRemoved = true; isNewReactionAdded = false; currentReactionOfUser = null; 
                } else { 
                    if (previousReactionType) post.reactionSummary[previousReactionType] = (post.reactionSummary[previousReactionType] || 1) - 1;
                    post.reactions[currentUser.uid] = reactionType;
                    post.reactionSummary[reactionType] = (post.reactionSummary[reactionType] || 0) + 1;
                    isNewReactionAdded = true; isReactionRemoved = false;
                }
                Object.keys(post.reactionSummary).forEach(key => { if (post.reactionSummary![key as ReactionType]! < 0) post.reactionSummary![key as ReactionType] = 0; });
            } 
            return post;
        });

        if (postAuthorId && postAuthorId !== currentUser.uid) {
            let pointChange = 0;
            if (currentReactionOfUser) { 
                if (currentReactionOfUser === 'like') pointChange += POINTS_RECEIVE_LIKE;
                else if (currentReactionOfUser === 'dislike') pointChange += POINTS_RECEIVE_DISLIKE;
            }
            if (previousReactionType && previousReactionType !== currentReactionOfUser) {
                 if (previousReactionType === 'like') pointChange -= POINTS_RECEIVE_LIKE;
                 else if (previousReactionType === 'dislike') pointChange -= POINTS_RECEIVE_DISLIKE;
            }
            if (pointChange !== 0) await awardPoints(postAuthorId, pointChange);
            const authorProfileRef = ref(db_rtdb, `userProfiles/${postAuthorId}`);
            if (isNewReactionAdded && !previousReactionType) runTransaction(authorProfileRef, (p:UserProfile|null) => {if(p)p.reactionsReceivedCount=(p.reactionsReceivedCount||0)+1; return p;});
            else if (isReactionRemoved && previousReactionType) runTransaction(authorProfileRef, (p:UserProfile|null) => {if(p)p.reactionsReceivedCount=Math.max(0,(p.reactionsReceivedCount||0)-1); return p;});
            
            // Create Notification
            if (isNewReactionAdded && userProfile) {
                const postSnapshot = await get(postRef);
                const postData = postSnapshot.val() as ConfessionPost | null;
                if(postData) {
                    const messageText = postData.customTitle || postData.text;
                    const truncatedMessage = messageText.substring(0, 20) + (messageText.length > 20 ? "..." : "");
                    createNotification(
                        postAuthorId, 'reaction_post', currentUser.uid, userProfile.username, postId,
                        `${userProfile.username} reacted with ${reactionType} to your post: "${truncatedMessage}"`,
                        `/?postId=${postId}`, userProfile.photoURL
                    ).catch(err => console.error("Error creating reaction notification:", err));
                }
            }
        }
    } catch (error) { console.error("Failed to update reaction:", error); }
  }, [currentUser, userProfile, openAuthPage]);

  const handleOpenCommentModal = useCallback((post: ConfessionPost) => { setSelectedPostForReadMoreModal(null); setIsReadMoreModalOpen(false); setSelectedPostForCommentModal(post); setIsCommentModalOpen(true); }, []);
  const handleCloseCommentModal = useCallback(() => { setIsCommentModalOpen(false); setSelectedPostForCommentModal(null); }, []);

  const handlePostComment = useCallback(async (postId: string, commentText: string, parentId?: string, parentCommentUserId?: string, originalPostTimestamp?: number) => {
    if (!currentUser || !userProfile || !selectedPostForCommentModal) { openAuthPage('login', "Log in to comment.", window.location.hash.substring(1) || '/'); throw new Error("User not logged in or post not selected."); }
    const commenterDisplayName = userProfile.username || userProfile.displayName || currentUser.email?.split('@')[0] || 'Anon';
    const commentId = push(ref(db_rtdb, `confessions/${postId}/comments`)).key;
    if(!commentId) throw new Error("Failed to generate comment ID.");
    const replyTimestamp = Date.now(); 
    const newCommentData = { 
        id: commentId, postId, text: commentText, userId: currentUser.uid, userDisplayName: commenterDisplayName, 
        commenterPhotoURL: userProfile.photoURL || generateDefaultDicebear7xAvatarUrl(currentUser.uid),
        commenterSelectedFrameId: userProfile.selectedAvatarFrameId || null,
        commenterSelectedFlairId: userProfile.selectedAvatarFlairId || null,
        createdAt: rtdbServerTimestamp() as any, ...(parentId && { parentId }) 
    };
    try {
        await set(ref(db_rtdb, `confessions/${postId}/comments/${commentId}`), newCommentData); 
        await runTransaction(ref(db_rtdb, `confessions/${postId}`), (p: ConfessionPost | null) => { if(p) p.commentCount = (p.commentCount || 0) + 1; return p; });
        await awardPoints(currentUser.uid, POINTS_POST_COMMENT, currentUser.email || undefined);
        await runTransaction(ref(db_rtdb, `userProfiles/${currentUser.uid}`), (p: UserProfile | null) => { if(p) p.commentsAuthoredCount = (p.commentsAuthoredCount || 0) + 1; return p; });
        
        // Notification Logic
        const postAuthorId = selectedPostForCommentModal.userId;
        const postTitleSnippet = selectedPostForCommentModal.customTitle || selectedPostForCommentModal.text.substring(0,20) + (selectedPostForCommentModal.text.length > 20 ? "..." : "");

        if (parentId && parentCommentUserId && parentCommentUserId !== currentUser.uid) { // It's a reply to another comment
             createNotification(
                parentCommentUserId, 'reply_comment', currentUser.uid, userProfile.username, commentId,
                `${userProfile.username} replied to your comment on "${postTitleSnippet}"`,
                `/?postId=${postId}&commentId=${parentId}`, userProfile.photoURL, postId
            ).catch(err => console.error("Error creating comment reply notification:", err));
        } else if (!parentId && postAuthorId !== currentUser.uid) { // It's a direct comment on someone else's post
             createNotification(
                postAuthorId, 'reply_post', currentUser.uid, userProfile.username, postId,
                `${userProfile.username} commented on your post: "${postTitleSnippet}"`,
                `/?postId=${postId}&commentId=${commentId}`, userProfile.photoURL
            ).catch(err => console.error("Error creating post comment notification:", err));
        }

        if ((parentId && parentCommentUserId && parentCommentUserId !== currentUser.uid) || (!parentId && originalPostTimestamp && selectedPostForCommentModal.userId !== currentUser.uid)) {
            const baseTimestamp = parentId ? (await get(ref(db_rtdb, `confessions/${postId}/comments/${parentId}`))).val()?.createdAt : originalPostTimestamp;
            if (baseTimestamp && (replyTimestamp - baseTimestamp) < 60000) await ensureBadgeAwarded(currentUser.uid, 'comeback_kid');
        }
    } catch (error) { console.error("Error posting comment:", error); throw new Error("Failed to post comment."); }
  }, [currentUser, userProfile, openAuthPage, selectedPostForCommentModal]);

  const handleOpenReadMoreModal = useCallback((post: ConfessionPost) => { setSelectedPostForReadMoreModal(post); setIsReadMoreModalOpen(true); }, []);
  const handleCloseReadMoreModal = useCallback(() => { setIsReadMoreModalOpen(false); setSelectedPostForReadMoreModal(null); }, []);
  
  const handleTagClick = useCallback((tag: string) => {
    setActiveTagFilter(prevTags => {
      const newTags = new Set(prevTags);
      if (newTags.has(tag)) newTags.delete(tag);
      else if (newTags.size < MAX_ACTIVE_TAGS) newTags.add(tag);
      else console.log("Max 5 tags allowed.");
      return Array.from(newTags);
    });
  }, [setActiveTagFilter]); 

  const handleClearAllTagFilters = useCallback(() => setActiveTagFilter([]), [setActiveTagFilter]);

  const handleOpenAuthorProfile = useCallback((authorUsername: string) => {
    if (!currentUser) { openAuthPage('login', "Log in to view profiles.", window.location.hash.substring(1) || '/'); return; }
    if (!authorUsername) return;
    navigateHook(`/user/${authorUsername}`);
  }, [currentUser, openAuthPage, navigateHook]);
  
  const handleCloseAuthorProfileModal = useCallback(() => { setIsAuthorProfileModalOpen(false); setSelectedAuthorProfileForModal(null); }, []);


  const filteredAndSortedConfessions = useMemo(() => {
    let filtered = [...allConfessions]; 
    if (activeTagFilter.length > 0) filtered = filtered.filter(p => activeTagFilter.every(filterTag => p.tags?.includes(filterTag)));
    if (appliedSearchKeyword) filtered = filtered.filter(p => (p.text.toLowerCase().includes(appliedSearchKeyword)) || (p.customTitle && p.customTitle.toLowerCase().includes(appliedSearchKeyword)));
    if (filterUsername) { const lowerFilterUsername = filterUsername.toLowerCase(); filtered = filtered.filter(p => (p.authorUsername && p.authorUsername.toLowerCase().includes(lowerFilterUsername)) || (p.wittyDisplayName && p.wittyDisplayName.toLowerCase().includes(lowerFilterUsername))); }
    if (filterImagePresence === 'with') filtered = filtered.filter(p => !!p.imageUrl);
    else if (filterImagePresence === 'without') filtered = filtered.filter(p => !p.imageUrl);

    switch (sortBy) {
      case 'mostLiked': return filtered.sort((a,b) => (b.reactionSummary?.like || 0) - (a.reactionSummary?.like || 0));
      case 'mostCommented': return filtered.sort((a,b) => (b.commentCount || 0) - (a.commentCount || 0));
      case 'hot': return filtered.map(p => ({...p, hotness: calculatePostStarPower(p)})).sort((a,b) => (b.hotness||0) - (a.hotness||0));
      case 'latest': default: return filtered.sort((a,b) => b.createdAt - a.createdAt);
    }
  }, [allConfessions, activeTagFilter, sortBy, appliedSearchKeyword, filterUsername, filterImagePresence]);

  const paginatedConfessions = useMemo(() => {
    const startIndex = (currentPage - 1) * POSTS_PER_PAGE;
    return filteredAndSortedConfessions.slice(startIndex, startIndex + POSTS_PER_PAGE);
  }, [filteredAndSortedConfessions, currentPage]);
  
  const handlePageChange = (page: number) => { setCurrentPage(page); feedContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  const MemoizedTrendingSidebar = useMemo(() => (<TrendingBanterSidebar allConfessions={allConfessions} isLoadingConfessions={isLoadingConfessions} onOpenReadMoreModal={handleOpenReadMoreModal}/>), [allConfessions, isLoadingConfessions, handleOpenReadMoreModal]);
  const pointsTooltipText = `Earn Banter Points: +${POINTS_CREATE_POST}/Post, +${POINTS_RECEIVE_LIKE}/Like, ${POINTS_RECEIVE_DISLIKE}/Dislike, +${POINTS_POST_COMMENT}/Comment`;

  return (
    <div className="flex flex-col md:flex-row gap-3 py-2 sm:py-3"> 
      {MemoizedTrendingSidebar}
      <main className="flex-grow min-w-0" ref={feedContainerRef}> 
        <FeedControls currentUser={currentUser} userProfile={userProfile} pointsTooltipText={pointsTooltipText} sortBy={sortBy} setSortBy={setSortBy} allPosts={allConfessions} onTagClick={handleTagClick} activeTagFilter={activeTagFilter} onClearAllTagFilters={handleClearAllTagFilters} searchKeyword={searchKeywordState} setSearchKeyword={setSearchKeywordState} onApplyKeywordSearch={handleApplyKeywordSearch} filterUsername={filterUsername} setFilterUsername={setFilterUsername} filterImagePresence={filterImagePresence} setFilterImagePresence={setFilterImagePresence} onClearAdvancedFilters={handleClearAdvancedFilters} />
        <DailyPromptDisplay dailyPrompt={dailyPrompt} isLoading={isLoadingDailyPrompt} onUsePrompt={handleUseDailyPrompt} currentTheme={currentGlobalTheme} />
        <BanterFeed isLoading={isLoadingConfessions} allConfessions={paginatedConfessions} currentUser={currentUser} userProfile={userProfile} openAuthModal={openAuthPage} onReact={handleReactToPost} onOpenCommentModal={handleOpenCommentModal} onOpenReadMoreModal={handleOpenReadMoreModal} onOpenAuthorProfileModal={handleOpenAuthorProfile} onTagClick={handleTagClick} activeTagFilter={activeTagFilter} onShareFirstBanter={() => openCreatePostModalWithDefaults()} onClearAllTagFilters={handleClearAllTagFilters} />
        {filteredAndSortedConfessions.length > POSTS_PER_PAGE && (<Pagination totalItems={filteredAndSortedConfessions.length} itemsPerPage={POSTS_PER_PAGE} currentPage={currentPage} onPageChange={handlePageChange} />)}
      </main>
      <CreatePostFAB currentUser={currentUser} openAuthModal={openAuthPage} setIsCreatePostModalOpen={() => openCreatePostModalWithDefaults()} />
      <AnimatePresence>{isCreatePostModalOpen && (<CreatePostModal isOpen={isCreatePostModalOpen} onClose={() => setIsCreatePostModalOpen(false)} onSubmit={handleCreatePost} currentUser={currentUser} userProfile={userProfile} initialText={createPostInitialText} initialTags={createPostInitialTags} />)}</AnimatePresence>
      <AnimatePresence>{isCommentModalOpen && selectedPostForCommentModal && currentUser && userProfile && (<CommentModal isOpen={isCommentModalOpen} onClose={handleCloseCommentModal} post={selectedPostForCommentModal} currentUser={currentUser} userProfile={userProfile} onSubmitComment={handlePostComment} openAuthModal={openAuthPage} />)}</AnimatePresence>
      <AnimatePresence>{isReadMoreModalOpen && selectedPostForReadMoreModal && (<ReadMoreModal isOpen={isReadMoreModalOpen} onClose={handleCloseReadMoreModal} post={selectedPostForReadMoreModal} currentUser={currentUser} userProfile={userProfile} onOpenComments={handleOpenCommentModal} onReact={handleReactToPost} openAuthModal={openAuthPage} onTagClickOnFeed={handleTagClick} />)}</AnimatePresence>
      <AnimatePresence>{isAuthorProfileModalOpen && (<AuthorProfileModal isOpen={isAuthorProfileModalOpen} onClose={handleCloseAuthorProfileModal} authorProfile={selectedAuthorProfileForModal} allConfessions={allConfessions} isLoading={isLoadingAuthorProfile} />)}</AnimatePresence>
    </div>
  );
};

export default HomePage;
