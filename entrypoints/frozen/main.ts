// Frozen tab placeholder page
// This page is shown in place of frozen tabs and handles restoration on click

const params = new URLSearchParams(window.location.search);
const originalUrl = params.get('url') || '';
const title = params.get('title') || 'Frozen Tab';
const favicon = params.get('favicon') || '';
const tabId = parseInt(params.get('tabId') || '0', 10);
const scrollX = parseInt(params.get('scrollX') || '0', 10);
const scrollY = parseInt(params.get('scrollY') || '0', 10);

// Set document title to match original tab (with frozen indicator)
document.title = `❄️ ${title}`;

// Set favicon to match original tab
if (favicon) {
  const link = document.createElement('link');
  link.rel = 'icon';
  link.href = favicon;
  document.head.appendChild(link);
}

// Update UI with tab info
const titleEl = document.getElementById('tabTitle');
const urlEl = document.getElementById('tabUrl');

if (titleEl) titleEl.textContent = title;
if (urlEl) urlEl.textContent = originalUrl;

// Click anywhere to thaw (restore) the tab
document.addEventListener('click', async () => {
  try {
    // Send message to background script to thaw this tab
    await chrome.runtime.sendMessage({
      action: 'thawTab',
      tabId: tabId,
      originalUrl: originalUrl,
      scrollX: scrollX,
      scrollY: scrollY,
    });
  } catch (error) {
    console.error('Failed to thaw tab:', error);
    // Fallback: navigate directly
    window.location.href = originalUrl;
  }
});

// Also thaw on Enter key press
document.addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    try {
      await chrome.runtime.sendMessage({
        action: 'thawTab',
        tabId: tabId,
        originalUrl: originalUrl,
        scrollX: scrollX,
        scrollY: scrollY,
      });
    } catch (error) {
      console.error('Failed to thaw tab:', error);
      window.location.href = originalUrl;
    }
  }
});
