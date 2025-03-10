/**
 * Share Modal initialization script
 * This script initializes the share functionality for the trading platform
 */

// Defer execution until DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
  // Wait for the React app to render completely
  setTimeout(initializeShareModal, 1000);
});

// Function to initialize share modal
function initializeShareModal() {
  try {
    // Get the share modal elements
    const shareButton = document.querySelector('#share-button');
    const shareModal = document.querySelector('#share-modal');

    if (!shareButton || !shareModal) {
      console.warn('Share modal elements not found in DOM. Will retry later.');
      // Retry after a delay if elements aren't found
      setTimeout(initializeShareModal, 1000);
      return;
    }

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

    // Handle copy link button
    const copyLinkButton = document.querySelector('#copy-link-button');
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
  } catch (error) {
    console.error('Error initializing share modal:', error);
  }
}
