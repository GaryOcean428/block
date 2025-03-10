/**
 * Share Modal initialization script
 * This script initializes the share functionality for the trading platform
 */

// Safer initialization function that will wait for DOM elements to be available
function initializeShareModal() {
  try {
    // Get the share modal elements
    const shareButton = document.querySelector('#share-button');
    const shareModal = document.querySelector('#share-modal');
    const copyLinkButton = document.querySelector('#copy-link-button');

    // Log the status for debugging
    console.log('Share modal element check:', {
      shareButton: !!shareButton,
      shareModal: !!shareModal,
      copyLinkButton: !!copyLinkButton,
    });

    // Only proceed if required elements exist
    if (shareButton && shareModal) {
      console.log('Share modal elements found, initializing event listeners');

      // Add click event to share button
      shareButton.addEventListener('click', e => {
        e.preventDefault();
        shareModal.classList.remove('hidden');
      });

      // Close modal when clicking outside
      document.addEventListener('click', event => {
        if (event.target.closest('#share-modal') || event.target.closest('#share-button')) {
          return;
        }
        shareModal.classList.add('hidden');
      });

      // Handle copy link button if it exists
      if (copyLinkButton) {
        copyLinkButton.addEventListener('click', () => {
          const link = window.location.href;
          navigator.clipboard
            .writeText(link)
            .then(() => {
              alert('Link copied to clipboard!');
            })
            .catch(err => {
              console.error('Failed to copy link: ', err);
            });
        });
      }

      console.log('Share modal initialization complete');
      return true; // Initialization successful
    } else {
      console.warn('Share modal elements not found in DOM. Will retry later.');
      return false; // Elements not found
    }
  } catch (error) {
    console.error('Error initializing share modal:', error);
    return false; // Error during initialization
  }
}

// Attempt initialization with retries
let initAttempts = 0;
const MAX_ATTEMPTS = 5;

function attemptInitialization() {
  if (initAttempts >= MAX_ATTEMPTS) {
    console.warn('Max attempts reached for share modal initialization. Giving up.');
    return;
  }

  initAttempts++;

  // Check if document is ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // Try to initialize
    const success = initializeShareModal();

    // If unsuccessful, retry with exponential backoff
    if (!success) {
      const delay = Math.min(1000 * Math.pow(1.5, initAttempts), 5000);
      console.log(
        `Retrying share modal initialization in ${delay}ms (attempt ${initAttempts}/${MAX_ATTEMPTS})`
      );
      setTimeout(attemptInitialization, delay);
    }
  } else {
    // Document not ready, wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', attemptInitialization);
  }
}

// Start the initialization process
attemptInitialization();
