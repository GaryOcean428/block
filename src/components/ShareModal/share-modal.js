/**
 * Share Modal initialization script
 * This script initializes the share functionality for the trading platform
 */

// Safely initialize share functionality
document.addEventListener('DOMContentLoaded', () => {
  // Get the share modal elements
  const shareButton = document.querySelector('#share-button');
  const shareModal = document.querySelector('#share-modal');

  // Only attach listeners if elements exist
  if (shareButton && shareModal) {
    shareButton.addEventListener('click', () => {
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
  }
});
