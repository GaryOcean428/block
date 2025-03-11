/**
 * Share Modal initialization script
 * This script initializes the share functionality for the trading platform
 */

// Safer initialization function that will wait for DOM elements to be available
function initializeShareModal() {
  try {
    // Safe element retrieval with null checks
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
    if (!shareButton || !shareModal) {
      console.warn('Share modal elements not found in DOM. Will retry later.');
      return false; // Elements not found
    }

    console.log('Share modal elements found, initializing event listeners');

    // Safe event listener adding with null check
    if (shareButton) {
      shareButton.addEventListener('click', e => {
        e.preventDefault();
        if (shareModal) {
          shareModal.classList.remove('hidden');
        }
      });
    }

    // Close modal when clicking outside - safely
    if (shareModal) {
      document.addEventListener('click', event => {
        if (
          !shareModal ||
          event.target.closest('#share-modal') ||
          event.target.closest('#share-button')
        ) {
          return;
        }
        shareModal.classList.add('hidden');
      });
    }

    // Handle copy link button if it exists - safely
    if (copyLinkButton) {
      copyLinkButton.addEventListener('click', () => {
        try {
          const link = window.location.href;
          navigator.clipboard
            .writeText(link)
            .then(() => {
              alert('Link copied to clipboard!');
            })
            .catch(err => {
              console.error('Failed to copy link: ', err);
            });
        } catch (error) {
          console.error('Error in copy link handler:', error);
        }
      });
    }

    console.log('Share modal initialization complete');
    return true; // Initialization successful
  } catch (error) {
    console.error('Error initializing share modal:', error);
    return false; // Error during initialization
  }
}

// In a React application, we need to wait for the app to render the components
// before we can initialize the share modal.

// Wait for DOM content to be loaded before trying to access elements
document.addEventListener('DOMContentLoaded', function () {
  console.log('DOM content loaded, preparing share modal');
});

// This will be initialized by the React component when it mounts
window.initShareModal = function () {
  console.log('Share modal initialization requested by React component');
  // Attempt initialization with retries
  let initAttempts = 0;
  const MAX_ATTEMPTS = 5;

  function attemptInitialization() {
    if (initAttempts >= MAX_ATTEMPTS) {
      console.warn('Max attempts reached for share modal initialization. Giving up.');
      return;
    }

    initAttempts++;

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
  }

  // Start the initialization process with a longer delay
  setTimeout(attemptInitialization, 1000); // Give React more time to render
};
