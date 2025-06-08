
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PencilIcon, ArrowPathIcon, LockClosedIcon, EyeIcon, CheckCircleIcon, PhotoIcon, PaintBrushIcon } from '@heroicons/react/24/outline'; // Added PaintBrushIcon
import { UserProfile, AvatarFrameDefinition, AvatarFlairDefinition, AvatarFlairElement, FirebaseUser as FirebaseUserType } from '../types'; // Added FirebaseUserType
// Removed: import type { User as FirebaseUserType } from 'firebase/auth'; 
import { AVATAR_FRAMES, AVATAR_FLAIRS, getFrameById, getFlairById } from '../utils/avatarDecorations';
import LoadingSpinner from './LoadingSpinner';

const dicebearAvatarStyles = [
  'adventurer', 'adventurer-neutral', 'avataaars', 'big-ears', 'big-ears-neutral',
  'big-smile', 'bottts', 'croodles', 'croodles-neutral', 'fun-emoji',
  'icons', 'identicon', 'initials', 'lorelei', 'lorelei-neutral',
  'micah', 'miniavs', 'notionists', 'open-peeps', 'personas',
  'pixel-art', 'pixel-art-neutral'
];

interface ProfilePhotoProps {
  currentUser: FirebaseUserType | null; 
  userProfile: UserProfile | null;
  onUpdateAvatarCustomization: (customization: { photoURL?: string; frameId?: string | null; flairId?: string | null; }) => Promise<{ success: boolean; error?: string }>;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  editable?: boolean;
  className?: string;
  selectedFrameId?: string | null;
  selectedFlairId?: string | null;
  availableFrames?: AvatarFrameDefinition[];
  availableFlairs?: AvatarFlairDefinition[];
  unlockedFrameIds?: string[];
  unlockedFlairIds?: string[];
}

type ActiveModalTab = 'style' | 'frames' | 'flairs';

const RenderFlairElements: React.FC<{ elements: AvatarFlairElement[], parentRelative?: boolean }> = ({ elements, parentRelative = false }) => {
  return (
    <>
      {elements.map((el, idx) => (
        <div key={idx} className={`${el.positionClasses} ${parentRelative ? 'pointer-events-none' : 'pointer-events-none z-20'}`}> {/* Ensure flair is above avatar but below edit overlay */}
          {el.type === 'icon' && el.iconClass && (
            <i className={`${el.iconClass} ${el.iconColorClass || ''}`}></i>
          )}
          {el.type === 'shape' && el.shapeClasses && (
            <div className={`${el.shapeClasses}`}></div>
          )}
        </div>
      ))}
    </>
  );
};


const ProfilePhoto: React.FC<ProfilePhotoProps> = ({
  currentUser,
  userProfile,
  onUpdateAvatarCustomization,
  size = 'md',
  editable = true,
  className = '',
  selectedFrameId: initialSelectedFrameId,
  selectedFlairId: initialSelectedFlairId,
  availableFrames = AVATAR_FRAMES,
  availableFlairs = AVATAR_FLAIRS,
  unlockedFrameIds = [],
  unlockedFlairIds = [],
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveModalTab>('style');
  const [modalSelectedDicebearStyle, setModalSelectedDicebearStyle] = useState(
    userProfile?.photoURL?.includes('api.dicebear.com/7.x/') ? userProfile.photoURL.split('/')[4] || 'initials' : 'initials'
  );
  const initialSeed = userProfile?.username || currentUser?.uid || 'default-user';
  const [modalDicebearSeed, setModalDicebearSeed] = useState(
    userProfile?.photoURL?.includes('seed=') ? userProfile.photoURL.split('seed=')[1] || initialSeed : initialSeed
  );
  const [modalSelectedFrameId, setModalSelectedFrameId] = useState<string | null>(initialSelectedFrameId || 'none');
  const [modalSelectedFlairId, setModalSelectedFlairId] = useState<string | null>(initialSelectedFlairId || 'none');
  const [hovering, setHovering] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentDisplayPhotoUrl, setCurrentDisplayPhotoUrl] = useState('');
  
  const displayFrameDefinition = useMemo(() => getFrameById(initialSelectedFrameId || userProfile?.selectedAvatarFrameId), [initialSelectedFrameId, userProfile?.selectedAvatarFrameId]);
  const displayFlairDefinition = useMemo(() => getFlairById(initialSelectedFlairId || userProfile?.selectedAvatarFlairId), [initialSelectedFlairId, userProfile?.selectedAvatarFlairId]);

  const generateDicebearUrl = (style: string, seed: string) => `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(seed)}`;

  useEffect(() => {
    setCurrentDisplayPhotoUrl(userProfile?.photoURL || generateDicebearUrl('initials', currentUser?.uid || 'default-guest'));
    if (userProfile) {
        setModalSelectedDicebearStyle(userProfile.photoURL?.includes('api.dicebear.com/7.x/') ? userProfile.photoURL.split('/')[4] || 'initials' : 'initials');
        setModalDicebearSeed(userProfile.photoURL?.includes('seed=') ? userProfile.photoURL.split('seed=')[1] || initialSeed : initialSeed);
        setModalSelectedFrameId(userProfile.selectedAvatarFrameId || 'none');
        setModalSelectedFlairId(userProfile.selectedAvatarFlairId || 'none');
    }
  }, [userProfile, currentUser?.uid, isModalOpen, initialSeed]);

  const sizeClasses = { sm: 'w-10 h-10', md: 'w-16 h-16', lg: 'w-24 h-24', xl: 'w-32 h-32' };

  const generateRandomDicebearInModal = () => {
    setIsUpdating(true);
    const randomStyle = dicebearAvatarStyles[Math.floor(Math.random() * dicebearAvatarStyles.length)];
    const newRandomSeed = Math.random().toString(36).substring(7);
    setModalSelectedDicebearStyle(randomStyle);
    setModalDicebearSeed(newRandomSeed);
    setIsUpdating(false);
  };

  const handleDicebearStyleSelect = async (style: string) => {
    if (!currentUser) return;
    setIsUpdating(true);
    const newAvatarUrl = generateDicebearUrl(style, modalDicebearSeed);
    const result = await onUpdateAvatarCustomization({ photoURL: newAvatarUrl });
    if (result.success) {
      setCurrentDisplayPhotoUrl(newAvatarUrl); 
      setModalSelectedDicebearStyle(style);
    } else console.error('Failed to update Dicebear style:', result.error);
    setIsUpdating(false);
  };

  const handleFrameSelect = async (frameId: string | null) => {
    if (!currentUser) return;
    setIsUpdating(true);
    const result = await onUpdateAvatarCustomization({ frameId });
    if (result.success) {
      setModalSelectedFrameId(frameId);
    } else console.error('Failed to update frame:', result.error);
    setIsUpdating(false);
  };

  const handleFlairSelect = async (flairId: string | null) => {
    if (!currentUser) return;
    setIsUpdating(true);
    const result = await onUpdateAvatarCustomization({ flairId });
    if (result.success) {
      setModalSelectedFlairId(flairId);
    } else console.error('Failed to update flair:', result.error);
    setIsUpdating(false);
  };

  const altText = userProfile?.displayName || userProfile?.username || currentUser?.displayName || currentUser?.email || 'User Avatar';
  const isFrameUnlocked = (frame: AvatarFrameDefinition) => frame.unlockAtPoints === 0 || (userProfile && userProfile.points >= frame.unlockAtPoints) || (unlockedFrameIds || []).includes(frame.id);
  const isFlairUnlocked = (flair: AvatarFlairDefinition) => flair.unlockAtPoints === 0 || (userProfile && userProfile.points >= flair.unlockAtPoints) || (unlockedFlairIds || []).includes(flair.id);

  // Combine base classes with dynamic border classes
  const avatarWrapperClasses = `relative rounded-full w-full h-full ring-1 ring-base-content/20 shadow-inner overflow-hidden ${displayFrameDefinition?.borderClasses || ''}`;

  return (
    <>
      <motion.div
        className={`relative group ${sizeClasses[size]} ${className}`}
        onHoverStart={() => editable && setHovering(true)}
        onHoverEnd={() => editable && setHovering(false)}
        whileHover={{ scale: editable ? 1.02 : 1 }}
        whileTap={{ scale: editable ? 0.98 : 1 }}
        role={editable ? "button" : "img"}
        aria-label={editable ? `Edit ${altText}` : altText}
        tabIndex={editable ? 0 : -1}
        onClick={editable ? () => setIsModalOpen(true) : undefined}
        onKeyDown={editable ? (e) => { if (e.key === 'Enter' || e.key === ' ') setIsModalOpen(true); } : undefined}
      >
        {/* Optional decorative background elements, can be simplified if not desired */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 rounded-full" style={{ backgroundSize: '200% 200%', animation: 'gradient 8s ease infinite' }} />
        <div className="absolute -inset-[2px] bg-gradient-to-r from-primary/30 via-secondary/30 to-accent/30 rounded-full blur-sm opacity-30 group-hover:opacity-50 transition duration-500" />
        
        <div className="absolute inset-0 p-[2px] rounded-full bg-gradient-to-r from-base-100 to-base-200"> {/* Padding for border visibility */}
          <div className={avatarWrapperClasses}> {/* Avatar image and CSS border applied here */}
            {currentDisplayPhotoUrl ? (
                 <img
                    key={currentDisplayPhotoUrl} // Key helps React re-render if URL changes
                    src={currentDisplayPhotoUrl}
                    alt={altText}
                    className="w-full h-full object-cover rounded-full z-0" // z-0 to be behind flair
                    onError={() => setCurrentDisplayPhotoUrl(generateDicebearUrl('initials', currentUser?.uid || 'fallback'))} 
                 />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-base-300 rounded-full">
                <span className="loading loading-spinner loading-sm"></span>
              </div>
            )}
            {/* Flair elements are positioned above the avatar image */}
            {displayFlairDefinition && displayFlairDefinition.elements && displayFlairDefinition.elements.length > 0 && (
              <RenderFlairElements elements={displayFlairDefinition.elements} />
            )}
          </div>
        </div>

        {editable && hovering && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-base-content/30 backdrop-blur-sm cursor-pointer z-30 rounded-full" // z-30 to be on top
          >
            <div className="flex items-center gap-2 text-base-100"><PencilIcon className="w-5 h-5" /> <span className="text-sm font-medium">Edit</span></div>
          </motion.div>
        )}
      </motion.div>

      <AnimatePresence>
        {isModalOpen && editable && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={(e) => e.target === e.currentTarget && setIsModalOpen(false)}>
            <motion.dialog open className="modal-box max-w-4xl w-full bg-base-100 p-0 shadow-xl overflow-hidden" initial={{ scale: 0.9, opacity: 0, y:20 }} animate={{ scale: 1, opacity: 1, y:0 }} exit={{ scale: 0.9, opacity: 0, y:20, transition: {duration: 0.2} }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
              <div className="flex items-center justify-between p-4 border-b border-base-300">
                <h3 className="font-bold text-lg text-primary">Customize Your Look</h3>
                <button className="btn btn-sm btn-circle btn-ghost" onClick={() => setIsModalOpen(false)} aria-label="Close">✕</button>
              </div>

              <div className="tabs tabs-boxed justify-center bg-base-200 p-1">
                {(['style', 'frames', 'flairs'] as ActiveModalTab[]).map(tabName => (
                  <button key={tabName} onClick={() => setActiveTab(tabName)} className={`tab tab-sm sm:tab-md ${activeTab === tabName ? 'tab-active !bg-primary text-primary-content' : 'hover:bg-base-300/70'}`}>
                    {tabName.charAt(0).toUpperCase() + tabName.slice(1)}
                  </button>
                ))}
              </div>

              <div className="p-4 h-[60vh] overflow-y-auto overflow-x-hidden">
                {activeTab === 'style' && (
                  <>
                    <div className="flex justify-end mb-3">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className={`btn btn-xs sm:btn-sm btn-outline btn-secondary ${isUpdating ? 'loading' : ''}`} onClick={generateRandomDicebearInModal} disabled={isUpdating} title="Generate Random Preview">
                            <ArrowPathIcon className="w-4 h-4" /> Random Preview
                        </motion.button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {dicebearAvatarStyles.map((style) => (
                        <motion.div key={style} whileHover={{ y: -3, boxShadow: "0 4px 15px rgba(0,0,0,0.1)" }} whileTap={{ scale: 0.95 }} className={`relative cursor-pointer p-2 border-2 transition-all ${modalSelectedDicebearStyle === style && generateDicebearUrl(style, modalDicebearSeed) === userProfile?.photoURL ? 'border-primary shadow-lg bg-primary/10' : 'border-base-300 hover:border-secondary'}`} onClick={() => handleDicebearStyleSelect(style)} role="button" aria-pressed={modalSelectedDicebearStyle === style && generateDicebearUrl(style, modalDicebearSeed) === userProfile?.photoURL} aria-label={`Select ${style.replace(/-/g, ' ')} style`} tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleDicebearStyleSelect(style);}}>
                            <img src={generateDicebearUrl(style, modalDicebearSeed)} alt={style} className="w-full aspect-square bg-base-200" loading="lazy" />
                            <p className="text-center text-xs mt-1.5 capitalize truncate" title={style.replace(/-/g, ' ')}>{style.replace(/-/g, ' ')}</p>
                            {isUpdating && modalSelectedDicebearStyle === style && (<div className="absolute inset-0 flex items-center justify-center bg-white/50"><LoadingSpinner size="md" className="text-primary"/></div>)}
                            {userProfile?.photoURL === generateDicebearUrl(style, modalDicebearSeed) && ( 
                                <CheckCircleIcon className="w-5 h-5 text-success absolute top-1 right-1" title="Currently selected"/>
                            )}
                        </motion.div>
                        ))}
                    </div>
                  </>
                )}
                {activeTab === 'frames' && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {availableFrames.map((frame) => {
                            const unlocked = isFrameUnlocked(frame);
                            const tooltipText = !unlocked ? `Unlock at ${frame.unlockAtPoints} Banter Points. ${frame.description || ''}`.trim() : frame.description || frame.name;
                            return (
                                <div key={frame.id} className="tooltip tooltip-bottom tooltip-accent w-full" data-tip={tooltipText}>
                                    <motion.div whileHover={unlocked ? { y: -3, boxShadow: "0 4px 15px rgba(0,0,0,0.1)" } : {}} whileTap={unlocked ? { scale: 0.95 } : {}} className={`relative p-2 border-2 transition-all h-full flex flex-col items-center justify-center ${modalSelectedFrameId === frame.id ? 'border-primary shadow-lg bg-primary/10' : 'border-base-300'} ${unlocked ? 'cursor-pointer hover:border-secondary' : 'opacity-60 cursor-not-allowed'}`} onClick={() => unlocked && handleFrameSelect(frame.id)} role="button" aria-pressed={modalSelectedFrameId === frame.id} aria-label={`Select ${frame.name} frame`} tabIndex={unlocked ? 0 : -1} onKeyDown={(e) => { if (unlocked && (e.key === 'Enter' || e.key === ' ')) handleFrameSelect(frame.id);}}>
                                        {/* Preview Area for CSS Border */}
                                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-base-200 mb-1 relative flex items-center justify-center">
                                            <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-base-300 ${frame.borderClasses || ''} flex items-center justify-center`}>
                                                {frame.id === 'none' ? <PaintBrushIcon className="w-8 h-8 text-base-content/30"/> : <img src={generateDicebearUrl(modalSelectedDicebearStyle, modalDicebearSeed)} alt="Avatar Preview" className="w-full h-full object-cover rounded-full"/>}
                                            </div>
                                        </div>
                                        <p className="text-center text-xs mt-1 capitalize truncate w-full" title={frame.name}>{frame.name}</p>
                                        {!unlocked && <LockClosedIcon className="w-5 h-5 text-base-content/50 absolute top-1 right-1" />}
                                        {isUpdating && modalSelectedFrameId === frame.id && (<div className="absolute inset-0 flex items-center justify-center bg-white/50"><LoadingSpinner size="md" className="text-primary"/></div>)}
                                        {(userProfile?.selectedAvatarFrameId || 'none') === frame.id && (
                                             <CheckCircleIcon className="w-5 h-5 text-success absolute top-1 right-1 opacity-70" title="Currently equipped"/>
                                        )}
                                    </motion.div>
                                </div>
                            );
                        })}
                    </div>
                )}
                {activeTab === 'flairs' && (
                     <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                        {availableFlairs.map((flair) => {
                            const unlocked = isFlairUnlocked(flair);
                            const tooltipText = !unlocked ? `Unlock at ${flair.unlockAtPoints} Banter Points. ${flair.description || ''}`.trim() : flair.description || flair.name;
                             return (
                                <div key={flair.id} className="tooltip tooltip-bottom tooltip-accent w-full" data-tip={tooltipText}>
                                    <motion.div whileHover={unlocked ? { y: -3, boxShadow: "0 4px 15px rgba(0,0,0,0.1)" } : {}} whileTap={unlocked ? { scale: 0.95 } : {}} className={`relative p-2 border-2 transition-all h-full flex flex-col items-center justify-center ${modalSelectedFlairId === flair.id ? 'border-primary shadow-lg bg-primary/10' : 'border-base-300'} ${unlocked ? 'cursor-pointer hover:border-secondary' : 'opacity-60 cursor-not-allowed'}`} onClick={() => unlocked && handleFlairSelect(flair.id)} role="button" aria-pressed={modalSelectedFlairId === flair.id} aria-label={`Select ${flair.name} flair`} tabIndex={unlocked ? 0 : -1} onKeyDown={(e) => { if (unlocked && (e.key === 'Enter' || e.key === ' ')) handleFlairSelect(flair.id);}}>
                                        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-base-200 mb-1 relative flex items-center justify-center overflow-hidden">
                                            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-base-300 rounded-full relative">
                                                <img src={generateDicebearUrl(modalSelectedDicebearStyle, modalDicebearSeed)} alt="Avatar Preview" className="w-full h-full object-cover rounded-full"/>
                                                <RenderFlairElements elements={flair.elements} parentRelative={true} />
                                            </div>
                                        </div>
                                        <p className="text-center text-xs mt-1 capitalize truncate w-full" title={flair.name}>{flair.name}</p>
                                        {!unlocked && <LockClosedIcon className="w-5 h-5 text-base-content/50 absolute top-1 right-1" />}
                                        {isUpdating && modalSelectedFlairId === flair.id && (<div className="absolute inset-0 flex items-center justify-center bg-white/50"><LoadingSpinner size="md" className="text-primary"/></div>)}
                                        {(userProfile?.selectedAvatarFlairId || 'none') === flair.id && (
                                             <CheckCircleIcon className="w-5 h-5 text-success absolute top-1 right-1 opacity-70" title="Currently equipped"/>
                                        )}
                                    </motion.div>
                                </div>
                            );
                        })}
                    </div>
                )}
              </div>
              <div className="p-4 border-t border-base-300 modal-action">
                <button className="btn btn-ghost btn-sm" onClick={() => setIsModalOpen(false)}>Done</button>
              </div>
            </motion.dialog>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ProfilePhoto;
