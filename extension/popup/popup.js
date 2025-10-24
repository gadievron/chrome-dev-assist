/**
 * Chrome Dev Assist - Popup Script
 * Simple status display
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Check extension status
  try {
    const status = await chrome.storage.local.get('status');

    if (status && status.status) {
      const statusEl = document.getElementById('status');
      const messageEl = document.getElementById('statusMessage');

      if (status.status.running) {
        statusEl.className = 'status ready';
        messageEl.textContent = `Extension is running and ready to receive commands. Last update: ${new Date(status.status.lastUpdate).toLocaleTimeString()}`;
      }
    }
  } catch (err) {
    console.error('Failed to get status:', err);
  }
});
