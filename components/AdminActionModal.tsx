import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LoadingSpinner from './LoadingSpinner';

export interface AdminActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message?: string | React.ReactNode;
  inputType?: 'text' | 'number';
  inputLabel?: string;
  inputPlaceholder?: string;
  initialInputValue?: string; // For pre-filling
  onConfirm: (inputValue?: string) => void;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  isLoading?: boolean;
  showInput?: boolean; // Explicitly control if input is shown
  targetUsername?: string; // Optional: Display username being acted upon
}

const AdminActionModal: React.FC<AdminActionModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  inputType,
  inputLabel,
  inputPlaceholder,
  initialInputValue = '',
  onConfirm,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonClass = "btn-primary",
  isLoading = false,
  showInput = false,
  targetUsername,
}) => {
  const [inputValue, setInputValue] = useState(initialInputValue);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue(initialInputValue); // Reset input value when modal opens or changes
      dialogRef.current?.showModal();
      // Focus input if shown and not loading
      if (showInput && inputType && inputRef.current && !isLoading) {
        setTimeout(() => inputRef.current?.focus(), 100); // Delay to ensure modal is visible
      }
    } else {
      dialogRef.current?.close();
    }
  }, [isOpen, initialInputValue, showInput, inputType, isLoading]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const handleDialogCloseEvent = () => { if (isOpen) onClose(); };
    dialog?.addEventListener('close', handleDialogCloseEvent);
    return () => dialog?.removeEventListener('close', handleDialogCloseEvent);
  }, [onClose, isOpen]);


  const handleConfirmClick = () => {
    if (showInput && inputType) {
      onConfirm(inputValue);
    } else {
      onConfirm();
    }
  };

  const handleModalClick = (event: React.MouseEvent<HTMLDialogElement, MouseEvent>) => {
    if (event.target === dialogRef.current && !isLoading) {
      onClose();
    }
  };
  
  const effectiveShowInput = showInput && inputType;

  return (
    <dialog id="admin_action_modal" className="modal modal-bottom sm:modal-middle" ref={dialogRef} onClick={handleModalClick}>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="modal-box"
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.2 } }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal-box
          >
            <form method="dialog" className="absolute top-3 right-3 z-10">
              <button className="btn btn-sm btn-circle btn-ghost" onClick={onClose} disabled={isLoading} aria-label="Close modal">✕</button>
            </form>
            <h3 className="font-bold text-lg text-primary">{title}</h3>
            {targetUsername && <p className="text-sm text-base-content/70 mb-2">User: <span className="font-semibold">{targetUsername}</span></p>}
            {message && <div className="py-2 text-sm">{message}</div>}

            {effectiveShowInput && (
              <div className="form-control w-full my-3">
                {inputLabel && <label className="label pb-1"><span className="label-text">{inputLabel}</span></label>}
                {inputType === 'number' ? (
                  <input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type="number"
                    placeholder={inputPlaceholder || ''}
                    className="input input-bordered input-sm w-full"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isLoading}
                    min="0"
                  />
                ) : (
                  <textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    placeholder={inputPlaceholder || ''}
                    className="textarea textarea-bordered textarea-sm w-full h-20"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    disabled={isLoading}
                  />
                )}
              </div>
            )}

            <div className="modal-action mt-4">
              <button className="btn btn-sm btn-ghost" onClick={onClose} disabled={isLoading}>
                {cancelText}
              </button>
              <button
                className={`btn btn-sm ${confirmButtonClass} ${isLoading ? 'loading' : ''}`}
                onClick={handleConfirmClick}
                disabled={isLoading || (effectiveShowInput && inputType==='number' && parseFloat(inputValue) <= 0 && inputLabel?.toLowerCase().includes('duration'))}
              >
                {isLoading ? <LoadingSpinner size="xs" /> : confirmText}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
       {/* Invisible backdrop click catcher when modal is open */}
       {isOpen && <div className="modal-backdrop fixed inset-0 bg-transparent" onClick={() => !isLoading && onClose()}></div>}
    </dialog>
  );
};

export default AdminActionModal;
