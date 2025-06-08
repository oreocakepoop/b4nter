
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AdminPageProps, UserProfile, ConfessionPost } from '../types';
import LoadingSpinner from '../components/LoadingSpinner';
import ProfilePhoto from '../components/ProfilePhoto';
import AdminActionModal, { AdminActionModalProps } from '../components/AdminActionModal'; // Import new modal
import { formatRelativeTime } from '../utils/dateUtils';
import { calculatePostStarPower } from '../utils/postUtils';
import { toggleUserAdminStatus, deleteConfessionByAdmin, setUserBanStatus, setTempUserBanStatus } from '../utils/firebaseUtils';

const AdminPage: React.FC<AdminPageProps> = ({
  currentUser,
  loggedInUserProfile,
  allUserProfiles,
  allConfessions,
  isLoadingUserProfiles,
  isLoadingConfessions,
}) => {
  const [togglingAdminForUid, setTogglingAdminForUid] = useState<string | null>(null);
  const [deletingConfessionId, setDeletingConfessionId] = useState<string | null>(null);
  // States for modal driven ban process
  const [isActionModalOpen, setIsActionModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState<Partial<AdminActionModalProps> | null>(null);
  const [actionTargetUser, setActionTargetUser] = useState<UserProfile | null>(null);
  const [tempBanDetails, setTempBanDetails] = useState<{ durationHours?: number; reason?: string }>({});
  const [currentActionType, setCurrentActionType] = useState<'permBan' | 'tempBan' | 'unban' | 'liftTempBan' | null>(null);
  const [isProcessingAction, setIsProcessingAction] = useState(false); // General loading state for modal actions

  const [adminActionStatus, setAdminActionStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  
  useEffect(() => {
    if (adminActionStatus) {
      const timer = setTimeout(() => setAdminActionStatus(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [adminActionStatus]);


  if (!loggedInUserProfile?.isAdmin) {
    return (
      <div className="container mx-auto p-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="alert alert-error shadow-lg"
        >
          <div>
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span>Access Denied! You do not have permission to view this page.</span>
          </div>
        </motion.div>
      </div>
    );
  }
  
  const openModalForAction = (config: Partial<AdminActionModalProps>) => {
    setModalConfig(config);
    setIsActionModalOpen(true);
  };
  
  const closeModal = () => {
    setIsActionModalOpen(false);
    setModalConfig(null);
    setActionTargetUser(null);
    setTempBanDetails({});
    setCurrentActionType(null);
    setIsProcessingAction(false);
  };


  const handleToggleAdminStatus = async (targetUid: string, currentIsAdmin: boolean) => {
    if (!loggedInUserProfile || !currentUser || targetUid === currentUser.uid) {
        setAdminActionStatus({ type: 'error', message: 'Cannot change your own admin status.' });
        return;
    }
    console.log(`[Admin ToggleAdmin] User: ${targetUid}, Current Admin: ${currentIsAdmin}, Action: ${currentIsAdmin ? 'Revoke' : 'Promote'}`);
    setTogglingAdminForUid(targetUid);
    setAdminActionStatus(null);
    try {
      await toggleUserAdminStatus(targetUid, currentIsAdmin);
      setAdminActionStatus({ type: 'success', message: `User ${currentIsAdmin ? 'revoked as' : 'promoted to'} admin successfully.` });
    } catch (error: any) {
      console.error(`[Admin ToggleAdmin] Error for ${targetUid}:`, error);
      setAdminActionStatus({ type: 'error', message: error.message || 'Failed to toggle admin status.' });
    } finally {
      setTogglingAdminForUid(null);
    }
  };

  const handleDeleteConfession = async (postId: string, postTitle: string) => {
    console.log(`[Admin DeleteConfession] Post ID: ${postId}, Title: "${postTitle || 'Untitled'}"`);
    openModalForAction({
      title: "Confirm Deletion",
      message: `Are you sure you want to delete the confession: "${postTitle || 'Untitled Post'}"? This action cannot be undone.`,
      confirmText: "Delete",
      confirmButtonClass: "btn-error",
      onConfirm: async () => {
        setIsProcessingAction(true);
        setDeletingConfessionId(postId); // Keep for UI feedback if needed on table
        try {
          await deleteConfessionByAdmin(postId);
          setAdminActionStatus({ type: 'success', message: 'Confession deleted successfully.' });
        } catch (error: any) {
          console.error(`[Admin DeleteConfession] Error deleting post ${postId}:`, error);
          setAdminActionStatus({ type: 'error', message: error.message || 'Failed to delete confession.' });
        } finally {
          setDeletingConfessionId(null);
          closeModal();
        }
      },
      onClose: closeModal,
    });
  };

  // --- Permanent Ban Flow ---
  const initiatePermanentBan = (targetUser: UserProfile) => {
    if (!loggedInUserProfile || !currentUser || targetUser.uid === currentUser.uid) {
      setAdminActionStatus({ type: 'error', message: 'Cannot change your own ban status.' });
      return;
    }
    console.log(`[Admin PermBan] Initiating for user: ${targetUser.username} (UID: ${targetUser.uid})`);
    setActionTargetUser(targetUser);
    setCurrentActionType('permBan');
    openModalForAction({
      title: `Permanently Ban ${targetUser.username}`,
      targetUsername: targetUser.username,
      message: "Please provide a reason for the permanent ban.",
      showInput: true,
      inputType: 'text',
      inputLabel: "Reason for Permanent Ban:",
      inputPlaceholder: "Enter reason...",
      confirmText: "Next: Confirm Ban",
      onConfirm: (reason) => { // reason is inputValue from modal
        console.log(`[Admin PermBan] Reason provided for ${targetUser.username}: "${reason || "No reason provided."}"`);
        setTempBanDetails({ reason: reason || "No reason provided." }); // Re-use tempBanDetails for simplicity
        confirmPermanentBan(targetUser, reason || "No reason provided.");
      },
      onClose: closeModal,
    });
  };

  const confirmPermanentBan = (targetUser: UserProfile, reason: string) => {
    console.log(`[Admin PermBan] Confirming ban for ${targetUser.username}, Reason: "${reason}"`);
    openModalForAction({
      title: `Confirm Permanent Ban: ${targetUser.username}`,
      targetUsername: targetUser.username,
      message: `Are you sure you want to PERMANENTLY ban ${targetUser.username}? Reason: "${reason}". This action is severe.`,
      confirmText: "Yes, Ban Permanently",
      confirmButtonClass: "btn-error",
      onConfirm: async () => {
        setIsProcessingAction(true);
        try {
          await setUserBanStatus(targetUser.uid, true, reason);
          setAdminActionStatus({ type: 'success', message: `User ${targetUser.username} permanently banned.` });
        } catch (error: any) {
           console.error(`[Admin PermBan] Error permanently banning ${targetUser.username}:`, error);
          setAdminActionStatus({ type: 'error', message: error.message || 'Failed to permanently ban user.' });
        } finally {
          closeModal();
        }
      },
      onClose: closeModal,
    });
  };

  const initiateUnban = (targetUser: UserProfile) => {
     if (!loggedInUserProfile || !currentUser || targetUser.uid === currentUser.uid) {
      setAdminActionStatus({ type: 'error', message: 'Cannot change your own ban status.' });
      return;
    }
    console.log(`[Admin Unban] Initiating for user: ${targetUser.username} (UID: ${targetUser.uid})`);
    setActionTargetUser(targetUser);
    setCurrentActionType('unban');
    openModalForAction({
      title: `Unban ${targetUser.username}`,
      targetUsername: targetUser.username,
      message: `Are you sure you want to lift the permanent ban for ${targetUser.username}?`,
      confirmText: "Yes, Unban",
      confirmButtonClass: "btn-success",
      onConfirm: async () => {
        setIsProcessingAction(true);
        try {
          await setUserBanStatus(targetUser.uid, false);
          setAdminActionStatus({ type: 'success', message: `User ${targetUser.username} unbanned.` });
        } catch (error: any) {
          console.error(`[Admin Unban] Error unbanning ${targetUser.username}:`, error);
          setAdminActionStatus({ type: 'error', message: error.message || 'Failed to unban user.' });
        } finally {
          closeModal();
        }
      },
      onClose: closeModal,
    });
  };
  
  // --- Temporary Ban Flow ---
  const initiateTemporaryBan_Step1_Duration = (targetUser: UserProfile) => {
     if (!loggedInUserProfile || !currentUser || targetUser.uid === currentUser.uid) {
      setAdminActionStatus({ type: 'error', message: 'Cannot change your own ban status.' });
      return;
    }
    console.log(`[Admin TempBan] User: ${targetUser.username} (UID: ${targetUser.uid})`);
    console.log(`[Admin TempBan] Currently temp banned (from UI data): ${targetUser.tempBanUntil ? new Date(targetUser.tempBanUntil).toLocaleString() : 'No'}. Action verb: apply.`);
    setActionTargetUser(targetUser);
    setCurrentActionType('tempBan');
    setTempBanDetails({}); // Reset
    openModalForAction({
      title: `Temporarily Ban ${targetUser.username}`,
      targetUsername: targetUser.username,
      message: "Enter the duration for the temporary ban.",
      showInput: true,
      inputType: 'number',
      inputLabel: "Duration (in hours):",
      inputPlaceholder: "e.g., 24 for 1 day",
      confirmText: "Next: Add Reason",
      onConfirm: (durationStr) => {
        const duration = parseInt(durationStr || '0', 10);
        if (isNaN(duration) || duration <= 0) {
            console.log(`[Admin TempBan] Invalid duration entered for ${targetUser.username}: "${durationStr}"`);
            setAdminActionStatus({type: 'error', message: "Duration must be a positive number of hours."});
            closeModal(); 
            initiateTemporaryBan_Step1_Duration(targetUser); 
            return;
        }
        console.log(`[Admin TempBan] Duration set for ${targetUser.username}: ${duration} hours.`);
        setTempBanDetails({ durationHours: duration });
        initiateTemporaryBan_Step2_Reason(targetUser, duration);
      },
      onClose: () => {
        console.log(`[Admin TempBan] Apply temporary ban for ${targetUser.username} cancelled by admin at duration prompt.`);
        closeModal();
      },
    });
  };

  const initiateTemporaryBan_Step2_Reason = (targetUser: UserProfile, durationHours: number) => {
    console.log(`[Admin TempBan] Requesting reason for ${targetUser.username}, Duration: ${durationHours} hours.`);
    openModalForAction({
      title: `Reason for Temp Ban: ${targetUser.username} (${durationHours} hrs)`,
      targetUsername: targetUser.username,
      message: `Provide a reason for temporarily banning ${targetUser.username} for ${durationHours} hours.`,
      showInput: true,
      inputType: 'text',
      inputLabel: "Reason for Temporary Ban:",
      inputPlaceholder: "Enter reason...",
      confirmText: "Apply Temporary Ban",
      confirmButtonClass: "btn-warning",
      onConfirm: async (reason) => {
        setIsProcessingAction(true);
        const finalReason = reason || "No reason provided.";
        console.log(`[Admin TempBan] Applying temporary ban to ${targetUser.username} for ${durationHours} hours. Reason: "${finalReason}"`);
        setTempBanDetails(prev => ({ ...prev, reason: finalReason }));
        try {
          await setTempUserBanStatus(targetUser.uid, durationHours, finalReason);
          setAdminActionStatus({ type: 'success', message: `User ${targetUser.username} temporarily banned for ${durationHours} hours.` });
        } catch (error: any) {
          console.error(`[Admin TempBan] Error applying temporary ban to ${targetUser.username}:`, error);
          setAdminActionStatus({ type: 'error', message: error.message || 'Failed to apply temporary ban.' });
        } finally {
          closeModal();
        }
      },
      onClose: () => {
        console.log(`[Admin TempBan] Apply temporary ban for ${targetUser.username} cancelled by admin at reason prompt.`);
        closeModal();
      },
    });
  };

  const initiateLiftTemporaryBan = (targetUser: UserProfile) => {
    if (!loggedInUserProfile || !currentUser || targetUser.uid === currentUser.uid) {
      setAdminActionStatus({ type: 'error', message: 'Cannot change your own ban status.' });
      return;
    }
    console.log(`[Admin LiftTempBan] Initiating for user: ${targetUser.username} (UID: ${targetUser.uid})`);
    console.log(`[Admin LiftTempBan] Current ban reason (from UI data): "${targetUser.tempBanReason || 'N/A'}". Action verb: lift.`);
    setActionTargetUser(targetUser);
    setCurrentActionType('liftTempBan');
    openModalForAction({
      title: `Lift Temporary Ban: ${targetUser.username}`,
      targetUsername: targetUser.username,
      message: `Are you sure you want to lift the temporary ban for ${targetUser.username}? Their current ban reason was: "${targetUser.tempBanReason || 'N/A'}"`,
      confirmText: "Yes, Lift Ban",
      confirmButtonClass: "btn-accent",
      onConfirm: async () => {
        setIsProcessingAction(true);
        try {
          await setTempUserBanStatus(targetUser.uid, 0); // 0 duration lifts the ban
          setAdminActionStatus({ type: 'success', message: `Temporary ban lifted for ${targetUser.username}.` });
        } catch (error: any) {
           console.error(`[Admin LiftTempBan] Error lifting temporary ban for ${targetUser.username}:`, error);
          setAdminActionStatus({ type: 'error', message: error.message || 'Failed to lift temporary ban.' });
        } finally {
          closeModal();
        }
      },
      onClose: () => {
        console.log(`[Admin LiftTempBan] Lift temporary ban for ${targetUser.username} cancelled by admin.`);
        closeModal();
      }
    });
  };


  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1 }
  };

  return (
    <>
    <motion.div
      className="container mx-auto p-4 sm:p-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <motion.h1 variants={itemVariants} className="text-3xl sm:text-4xl font-bold text-primary mb-6 text-center">
        <i className="fas fa-user-shield mr-3"></i>Admin Control Panel
      </motion.h1>

      {adminActionStatus && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={`alert ${adminActionStatus.type === 'success' ? 'alert-success' : 'alert-error'} text-sm p-3 my-3 shadow-lg`}
        >
          <div className="flex-1">
            {adminActionStatus.type === 'success' ? <i className="fas fa-check-circle mr-2"></i> : <i className="fas fa-times-circle mr-2"></i>}
            {adminActionStatus.message}
          </div>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="card bg-base-100 shadow-xl mb-8 border border-info/30">
        <div className="card-body p-4 sm:p-6">
          <h2 className="card-title text-xl sm:text-2xl text-info mb-2">
            <i className="fas fa-users-cog mr-2"></i>User Management ({allUserProfiles.length})
          </h2>
          {isLoadingUserProfiles ? (
            <div className="flex justify-center items-center py-10"><LoadingSpinner size="lg" /> <p className="ml-3">Loading Users...</p></div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar max-h-[500px]">
              <table className="table table-sm table-zebra w-full">
                <thead>
                  <tr>
                    <th>Avatar</th>
                    <th>Username</th>
                    <th>UID</th>
                    <th>Points</th>
                    <th>Status</th>
                    <th>Admin?</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allUserProfiles.map(user => {
                    const isUserTempBanned = user.tempBanUntil && user.tempBanUntil > Date.now();
                    const canAdminTarget = loggedInUserProfile?.uid !== user.uid;
                    return (
                    <tr key={user.uid} className="hover">
                      <td>
                        <ProfilePhoto
                          userProfile={user}
                          currentUser={null}
                          size="sm"
                          editable={false}
                          className="!w-8 !h-8"
                          onUpdateAvatarCustomization={async () => ({success:false, error:""})}
                        />
                      </td>
                      <td><Link to={`/user/${user.username}`} className="link link-hover link-primary text-xs sm:text-sm">{user.username}</Link></td>
                      <td className="text-xs truncate" title={user.uid}>{user.uid.substring(0, 8)}...</td>
                      <td className="text-xs sm:text-sm">{user.points.toLocaleString()}</td>
                      <td className="text-xs">
                        {user.isBanned ? (
                          <div className="flex flex-col items-start">
                            <span className="badge badge-error badge-outline">Banned (Perm)</span>
                            {user.banReason && <span className="text-error/80 mt-0.5 opacity-80 text-[0.65rem] leading-tight block" title={user.banReason}>Reason: {user.banReason.substring(0,25)}{user.banReason.length > 25 ? '...' : ''}</span>}
                          </div>
                        ) : isUserTempBanned ? (
                          <div className="flex flex-col items-start">
                            <span className="badge badge-warning badge-outline">Temp Banned</span>
                             <span className="text-warning/80 mt-0.5 opacity-80 text-[0.65rem] leading-tight block" title={new Date(user.tempBanUntil!).toLocaleString()}>Until: {new Date(user.tempBanUntil!).toLocaleDateString()} {new Date(user.tempBanUntil!).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            {user.tempBanReason && <span className="text-warning/80 mt-0.5 opacity-80 text-[0.65rem] leading-tight block" title={user.tempBanReason}>Reason: {user.tempBanReason.substring(0,25)}{user.tempBanReason.length > 25 ? '...' : ''}</span>}
                          </div>
                        ) : (
                          <span className="badge badge-success badge-outline">Active</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge badge-xs sm:badge-sm ${user.isAdmin ? 'badge-info' : 'badge-ghost'}`}>
                          {user.isAdmin ? 'Yes' : 'No'}
                        </span>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                           <button
                              onClick={() => isUserTempBanned ? initiateLiftTemporaryBan(user) : initiateTemporaryBan_Step1_Duration(user)}
                              className={`btn btn-xs btn-outline ${isUserTempBanned ? 'btn-accent' : 'btn-warning'}`}
                              disabled={!canAdminTarget || user.isBanned}
                              title={user.isBanned ? "User is permanently banned, cannot temp ban/lift." : (isUserTempBanned ? "Lift temporary ban" : "Apply temporary ban")}
                          >
                              {isUserTempBanned ? 'Lift Temp' : 'Temp Ban'}
                          </button>
                          <button
                              onClick={() => user.isBanned ? initiateUnban(user) : initiatePermanentBan(user)}
                              className={`btn btn-xs btn-outline ${user.isBanned ? 'btn-success' : 'btn-error'}`}
                              disabled={!canAdminTarget}
                          >
                               {user.isBanned ? 'Unban Perm' : 'Ban Perm'}
                          </button>
                          <button
                              onClick={() => handleToggleAdminStatus(user.uid, !!user.isAdmin)}
                              className={`btn btn-xs btn-outline ${user.isAdmin ? 'btn-warning' : 'btn-info'}`}
                              disabled={!canAdminTarget || togglingAdminForUid === user.uid}
                          >
                              {togglingAdminForUid === user.uid ? <LoadingSpinner size="xs"/> : (user.isAdmin ? 'Revoke Adm' : 'Make Adm')}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )})}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="card bg-base-100 shadow-xl border border-warning/30">
        <div className="card-body p-4 sm:p-6">
          <h2 className="card-title text-xl sm:text-2xl text-warning mb-2">
           <i className="fas fa-gavel mr-2"></i>Content Moderation ({allConfessions.length} Confessions)
          </h2>
          {isLoadingConfessions ? (
             <div className="flex justify-center items-center py-10"><LoadingSpinner size="lg" /> <p className="ml-3">Loading Confessions...</p></div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar max-h-[500px]">
              <table className="table table-sm table-zebra w-full">
                <thead>
                  <tr>
                    <th>Title / Snippet</th>
                    <th>Author</th>
                    <th>Created At</th>
                    <th>Reactions</th>
                    <th>Comments</th>
                    <th>Star Power</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allConfessions.map(post => {
                    const titleOrSnippet = post.customTitle || post.text.substring(0, 30) + (post.text.length > 30 ? '...' : '');
                    const totalReactions = Object.values(post.reactionSummary || {}).reduce((sum, count) => sum + (count || 0), 0);
                    const starPower = calculatePostStarPower(post);
                    return (
                      <tr key={post.id} className="hover">
                        <td className="text-xs sm:text-sm truncate max-w-xs" title={titleOrSnippet}>
                           <Link to={`/?postId=${post.id}`} className="link link-hover link-secondary">{titleOrSnippet}</Link>
                        </td>
                        <td>
                            {post.authorUsername ? (
                                <Link to={`/user/${post.authorUsername}`} className="link link-hover link-primary text-xs sm:text-sm">{post.authorUsername}</Link>
                            ) : (
                                <span className="text-xs text-base-content/70 italic">{post.wittyDisplayName || 'Anonymous'}</span>
                            )}
                        </td>
                        <td className="text-xs">{formatRelativeTime(post.createdAt)}</td>
                        <td className="text-xs sm:text-sm">{totalReactions}</td>
                        <td className="text-xs sm:text-sm">{post.commentCount || 0}</td>
                        <td className="text-xs sm:text-sm">{starPower.toFixed(1)}</td>
                        <td>
                          <div className="flex flex-wrap gap-1">
                            <button
                              onClick={() => handleDeleteConfession(post.id, titleOrSnippet)}
                              className="btn btn-xs btn-outline btn-error"
                              disabled={deletingConfessionId === post.id}
                            >
                              {deletingConfessionId === post.id ? <LoadingSpinner size="xs"/> : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
    {isActionModalOpen && modalConfig && (
      <AdminActionModal
        isOpen={isActionModalOpen}
        onClose={closeModal}
        title={modalConfig.title || "Confirm Action"}
        message={modalConfig.message}
        inputType={modalConfig.inputType}
        inputLabel={modalConfig.inputLabel}
        inputPlaceholder={modalConfig.inputPlaceholder}
        initialInputValue={modalConfig.initialInputValue}
        onConfirm={modalConfig.onConfirm as (inputValue?: string) => void} // Cast because it's set dynamically
        confirmText={modalConfig.confirmText}
        cancelText={modalConfig.cancelText}
        confirmButtonClass={modalConfig.confirmButtonClass}
        isLoading={isProcessingAction || modalConfig.isLoading}
        showInput={modalConfig.showInput}
        targetUsername={actionTargetUser?.username}
      />
    )}
    </>
  );
};

export default AdminPage;