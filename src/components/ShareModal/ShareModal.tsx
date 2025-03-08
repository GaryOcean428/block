import React, { useEffect, useRef } from 'react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  url?: string;
  title?: string;
}

/**
 * Share Modal Component
 * Provides functionality to share trading charts, positions or analysis
 */
const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  url = window.location.href,
  title = 'Poloniex Trading Platform',
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const shareButtonsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Safe DOM manipulation with null checks
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    // Only add event listeners if modal is open
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleCopyLink = () => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        alert('Link copied to clipboard!');
      })
      .catch(err => {
        console.error('Failed to copy link: ', err);
      });
  };

  // Share via social media or email if Web Share API is available
  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title,
          url: url,
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    } else {
      handleCopyLink();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md"
      >
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Share</h2>

        <div className="mb-4">
          <input
            type="text"
            readOnly
            value={url}
            className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>

        <div ref={shareButtonsRef} className="flex space-x-3 mb-4">
          <button
            onClick={handleCopyLink}
            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md"
          >
            Copy Link
          </button>

          <button
            onClick={handleShare}
            className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md"
          >
            Share
          </button>
        </div>

        <button
          onClick={onClose}
          className="w-full border border-gray-300 hover:bg-gray-100 text-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 py-2 px-4 rounded-md"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ShareModal;
