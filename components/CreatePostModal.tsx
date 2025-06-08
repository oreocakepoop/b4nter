
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GoogleGenAI } from "@google/genai"; 
// Removed: import type { User as FirebaseUser } from 'firebase/auth'; 
import { UserProfile, CreatePostModalProps as CreatePostModalPropsType, FirebaseUser, PostFlairDefinition } from '../types'; // Added FirebaseUser, PostFlairDefinition
import LoadingSpinner from './LoadingSpinner';
import { getRandomWittyName, generateUntitledWittyTitle } from '../utils/wittyNameGenerator';
import { POST_FLAIRS } from '../utils/postFlairDecorations'; // Import POST_FLAIRS

const MAX_POST_LENGTH = 1000;
const MAX_CUSTOM_TITLE_LENGTH = 100; 
const MAX_TAGS_LENGTH = 100;
const MAX_WITTY_NAME_LENGTH = 50;
const MAX_IMAGE_URL_LENGTH = 2048; // Standard URL length limit

const CreatePostModal: React.FC<CreatePostModalPropsType> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  currentUser, 
  userProfile,
  initialText, 
  initialTags  
}) => {
  const [text, setText] = useState('');
  const [customTitleText, setCustomTitleText] = useState(''); 
  const [tagsInput, setTagsInput] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [suggestedWittyName, setSuggestedWittyName] = useState('');
  const [isSuggestingName, setIsSuggestingName] = useState(false);
  const [selectedPostFlairId, setSelectedPostFlairId] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const isPermanentlyBanned = userProfile?.isBanned === true;
  const isTemporarilyBanned = userProfile?.tempBanUntil && userProfile.tempBanUntil > Date.now();
  let banMessage: string | null = null;

  if (isPermanentlyBanned) {
    banMessage = `Your account is permanently banned. Reason: ${userProfile?.banReason || 'Not specified.'} You cannot create posts.`;
  } else if (isTemporarilyBanned && userProfile?.tempBanUntil) {
    const expiryDate = new Date(userProfile.tempBanUntil).toLocaleString();
    banMessage = `Your account is temporarily restricted from posting until ${expiryDate}. Reason: ${userProfile?.tempBanReason || 'Not specified.'}`;
  }
  const canSubmit = !isPermanentlyBanned && !isTemporarilyBanned;


  const resetAllState = () => {
    setText(initialText || '');
    setCustomTitleText('');
    setTagsInput(initialTags ? initialTags.join(', ') : '');
    setImageUrl('');
    setSuggestedWittyName('');
    setSelectedPostFlairId(null);
    setError(null);
    setIsSubmitting(false);
    setIsSuggestingName(false);
  };

  useEffect(() => {
    if (isOpen) {
      resetAllState(); 
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen, initialText, initialTags]); 

  useEffect(() => {
    const dialog = dialogRef.current;
    const handleDialogCloseEvent = () => { 
      if (isOpen) onClose();
    };
    dialog?.addEventListener('close', handleDialogCloseEvent);
    return () => {
      dialog?.removeEventListener('close', handleDialogCloseEvent);
    };
  }, [onClose, isOpen]);

  const handleSuggestWittyName = async () => {
    setIsSuggestingName(true);
    setSuggestedWittyName(''); 
    try {
      if (!process.env.API_KEY) {
        console.warn("API_KEY for Google GenAI is not set. Using fallback witty name.");
        setSuggestedWittyName(getRandomWittyName());
        return;
      }
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = "Suggest one very short, witty, anonymous nickname or persona (2-3 words, max 30 characters).";
      const response = await ai.models.generateContent({ model: 'gemini-2.5-flash-preview-04-17', contents: prompt });
      let nameFromAI = response.text.trim().replace(/["*]/g, ''); 
      if (nameFromAI.length > MAX_WITTY_NAME_LENGTH) nameFromAI = nameFromAI.substring(0, MAX_WITTY_NAME_LENGTH).trim() + "...";
      setSuggestedWittyName(nameFromAI || getRandomWittyName());
    } catch (e) {
      console.error("Error generating witty name, using fallback:", e);
      setSuggestedWittyName(getRandomWittyName()); 
    } finally {
      setIsSuggestingName(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) {
      setError(banMessage || "You are currently restricted from posting.");
      return;
    }
    if (!text.trim()) { setError("Banter can't be empty. Share something!"); return; }
    if (text.length > MAX_POST_LENGTH) { setError(`Banter too long! Under ${MAX_POST_LENGTH} chars (current: ${text.length}).`); return; }
    let finalCustomTitle = customTitleText.trim() || generateUntitledWittyTitle();
    if (finalCustomTitle.length > MAX_CUSTOM_TITLE_LENGTH) { setError(`Title too long! Under ${MAX_CUSTOM_TITLE_LENGTH} chars (current: ${finalCustomTitle.length}).`); return; }
    if (tagsInput.length > MAX_TAGS_LENGTH) { setError(`Tags string too long! Under ${MAX_TAGS_LENGTH} characters.`); return; }
    if (imageUrl.trim() && imageUrl.length > MAX_IMAGE_URL_LENGTH) { setError(`Image URL too long! Under ${MAX_IMAGE_URL_LENGTH} chars.`); return; }
    if (imageUrl.trim() && !imageUrl.trim().match(/^https?:\/\/.+/)) { setError(`Please enter a valid image URL (starting with http/https).`); return; }

    const parsedTags = tagsInput.split(',').map(tag => tag.trim().toLowerCase().replace(/\s+/g, '-')).filter(tag => tag.length > 0 && tag.length <= 20).slice(0, 5);
    setError(null);
    setIsSubmitting(true);
    try {
      // Pass selectedPostFlairId to the onSubmit handler
      await onSubmit(text, parsedTags, suggestedWittyName, finalCustomTitle, imageUrl.trim() || undefined, selectedPostFlairId); 
      onClose(); 
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to post. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const placeholderUser = userProfile?.username || userProfile?.displayName || currentUser?.email?.split('@')[0] || 'Banterer';
  
  const availablePostFlairs = useMemo(() => {
    if (!userProfile) return [];
    return POST_FLAIRS.filter(flair => 
        (userProfile.unlockedPostFlairs || []).includes(flair.id) || 
        userProfile.points >= flair.unlockAtPoints ||
        flair.unlockAtPoints === 0 // Always available if 0 points
    ).sort((a,b) => a.unlockAtPoints - b.unlockAtPoints);
  }, [userProfile]);

  return (
    <dialog id="create_post_modal" className="modal modal-bottom sm:modal-middle" ref={dialogRef}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="modal-box w-full max-w-xl p-0" 
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
          >
            <div className="flex justify-between items-center p-4 border-b border-base-300">
                <h3 className="text-xl font-bold text-primary">Share Your Banter!</h3> 
                <form method="dialog">
                    <button className="btn btn-sm btn-circle btn-ghost" aria-label="Close post creation modal" disabled={isSubmitting || isSuggestingName || !canSubmit} onClick={onClose}>✕</button>
                </form>
            </div>
            
            <div className="p-4 max-h-[65vh] overflow-y-auto space-y-3 custom-scrollbar">
              {banMessage && (
                <div role="alert" className={`alert ${isPermanentlyBanned ? 'alert-error' : 'alert-warning'} text-xs p-2 my-2`}>
                  <i className={`fas ${isPermanentlyBanned ? 'fa-ban' : 'fa-clock'} mr-2`}></i>
                  {banMessage}
                </div>
              )}
              <>
                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-xs">Banter Title (Optional)</span></label>
                  <input type="text" placeholder="Your catchy banter headline..." className={`input input-sm input-bordered w-full ${error && error.includes("Title") ? 'input-error' : ''}`} value={customTitleText} onChange={(e) => {setCustomTitleText(e.target.value); if(error) setError(null);}} maxLength={MAX_CUSTOM_TITLE_LENGTH + 10} disabled={isSubmitting || isSuggestingName || !canSubmit} aria-label="Banter title"/>
                  <label className="label pt-0.5"><span className="label-text-alt text-right w-full">{customTitleText.length}/{MAX_CUSTOM_TITLE_LENGTH}</span></label>
                </div>
                
                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-xs">Your Banter *</span></label>
                  <textarea className={`textarea textarea-bordered w-full h-28 text-sm ${error && (error.includes("Banter") || error.includes("empty")) ? 'textarea-error' : ''}`} placeholder={`What's on your mind, ${placeholderUser}? Spill the tea...`} value={text} onChange={(e) => {setText(e.target.value); if(error) setError(null);}} maxLength={MAX_POST_LENGTH + 50} disabled={isSubmitting || isSuggestingName || !canSubmit} aria-label="Your new banter text" aria-required="true"></textarea>
                  <label className="label pt-0.5"><span className="label-text-alt text-right w-full">{text.length}/{MAX_POST_LENGTH}</span></label>
                </div>

                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-xs">Image URL (Optional, for memes/GIFs)</span></label>
                  <input type="url" placeholder="https://example.com/image.gif" className={`input input-sm input-bordered w-full ${error && error.includes("URL") ? 'input-error' : ''}`} value={imageUrl} onChange={(e) => {setImageUrl(e.target.value); if(error) setError(null);}} maxLength={MAX_IMAGE_URL_LENGTH + 10} disabled={isSubmitting || isSuggestingName || !canSubmit} aria-label="Image URL"/>
                  <div className="text-xs text-warning mt-1 p-1 bg-warning/10">Note: Image moderation is not yet implemented. Please post responsibly.</div>
                </div>

                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-xs">Your Witty Persona (Optional)</span></label>
                  <div className="join w-full">
                    <div className="input input-sm input-bordered join-item flex-grow flex items-center min-h-[2.25rem] text-xs">
                      {isSuggestingName ? <LoadingSpinner size="xs" /> : suggestedWittyName || <span className="opacity-60">Click 'Suggest' or leave blank</span>}
                    </div>
                    <button onClick={handleSuggestWittyName} className="btn btn-outline btn-neutral btn-sm join-item" disabled={isSuggestingName || isSubmitting || !canSubmit}>{isSuggestingName ? <LoadingSpinner size="xs" /> : <><i className="fas fa-wand-magic-sparkles mr-1"></i> Suggest</>}</button>
                  </div>
                </div>

                <div className="form-control">
                  <label className="label py-1"><span className="label-text text-xs">Tags (Optional, comma-separated)</span></label>
                  <input type="text" placeholder="e.g., funny, work-life, daily-fails" className={`input input-sm input-bordered w-full ${error && error.includes("Tags") ? 'input-error' : ''}`} value={tagsInput} onChange={(e) => {setTagsInput(e.target.value); if(error) setError(null);}} maxLength={MAX_TAGS_LENGTH + 10} disabled={isSubmitting || isSuggestingName || !canSubmit} aria-label="Tags for your banter"/>
                  <label className="label pt-0.5"><span className="label-text-alt">Max 5 tags, 20 chars/tag.</span></label>
                </div>

                {availablePostFlairs.length > 0 && (
                  <div className="form-control">
                    <label className="label py-1"><span className="label-text text-xs">Post Flair (Optional)</span></label>
                    <select 
                      className="select select-sm select-bordered w-full"
                      value={selectedPostFlairId || ""}
                      onChange={(e) => setSelectedPostFlairId(e.target.value || null)}
                      disabled={isSubmitting || isSuggestingName || !canSubmit}
                      aria-label="Select a post flair"
                    >
                      <option value="">None</option>
                      {availablePostFlairs.map(flair => (
                        <option key={flair.id} value={flair.id} title={flair.description}>
                          {flair.name} (Requires {flair.unlockAtPoints} pts)
                        </option>
                      ))}
                    </select>
                    {selectedPostFlairId && POST_FLAIRS.find(f=>f.id === selectedPostFlairId) && (
                         <p className="text-xs text-base-content/70 mt-1 pl-1">{POST_FLAIRS.find(f=>f.id === selectedPostFlairId)?.description}</p>
                    )}
                  </div>
                )}
              </>
              
              {error && !banMessage && <p className="text-error text-xs mt-2" role="alert"><i className="fas fa-exclamation-circle mr-1"></i>{error}</p>}
            </div>

            <div className="modal-action p-4 border-t border-base-300">
                <form method="dialog" className="inline-block">
                    <button className="btn btn-ghost btn-sm" disabled={isSubmitting || isSuggestingName} onClick={onClose}>Cancel</button>
                </form>
                <button onClick={handleSubmit} className="btn btn-primary btn-sm"
                  disabled={isSubmitting || isSuggestingName || !canSubmit || !text.trim() || text.length > MAX_POST_LENGTH || (customTitleText.trim().length > 0 && customTitleText.trim().length > MAX_CUSTOM_TITLE_LENGTH) || tagsInput.length > MAX_TAGS_LENGTH || imageUrl.length > MAX_IMAGE_URL_LENGTH}
                >
                  {isSubmitting ? <LoadingSpinner size="xs" /> : "Post Banter"}
                </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose}>close</button></form>
    </dialog>
  );
};

export default CreatePostModal;
