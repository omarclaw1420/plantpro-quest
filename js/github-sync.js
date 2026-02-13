/**
 * GitHub Sync Module for PlantPro Quest
 * Handles GitHub API integration for cloud sync
 */

const GitHubSync = (() => {
  const CONFIG = {
    repo: 'omarclaw1420/plantpro-quest',
    filePath: 'data/plantpro-progress.json',
    branch: 'main',
    apiBase: 'https://api.github.com/repos'
  };

  // Unicode-safe base64 encoding functions
  // btoa/atob only handle Latin1, so we need these for Unicode (emojis, Arabic, etc.)
  function utf8_to_b64(str) {
    return window.btoa(unescape(encodeURIComponent(str)));
  }

  function b64_to_utf8(str) {
    return decodeURIComponent(escape(window.atob(str)));
  }

  // Private state
  let _token = null;
  let _isSyncing = false;
  let _lastSyncTime = null;
  let _lastError = null;
  let _pendingChanges = false;
  let _githubSha = null;

  const STATUS = {
    DISCONNECTED: 'disconnected',
    SYNCED: 'synced',
    PENDING: 'pending',
    SYNCING: 'syncing',
    ERROR: 'error'
  };

  /**
   * Initialize from URL params or localStorage
   */
  function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('token');
    
    if (urlToken !== null) {
      if (urlToken) {
        localStorage.setItem('plantpro_github_token', urlToken);
        _token = urlToken;
      } else {
        localStorage.removeItem('plantpro_github_token');
        _token = null;
      }
      // Clean URL without reload
      const cleanUrl = window.location.pathname + window.location.hash;
      history.replaceState(null, '', cleanUrl);
    } else {
      _token = localStorage.getItem('plantpro_github_token');
    }
  }

  /**
   * Check if GitHub is configured with a token
   */
  function isConfigured() {
    return !!_token;
  }

  /**
   * Get current token
   */
  function getToken() {
    return _token;
  }

  /**
   * Set new token
   */
  function setToken(token) {
    _token = token;
    if (token) {
      localStorage.setItem('plantpro_github_token', token);
    } else {
      localStorage.removeItem('plantpro_github_token');
    }
    _lastError = null;
  }

  /**
   * Clear token
   */
  function clearToken() {
    _token = null;
    localStorage.removeItem('plantpro_github_token');
    _githubSha = null;
    _lastSyncTime = null;
    _lastError = null;
    _pendingChanges = false;
  }

  /**
   * Fetch progress from GitHub
   */
  async function fetchProgress() {
    if (!_token) throw new Error('No GitHub token configured');

    const url = `${CONFIG.apiBase}/${CONFIG.repo}/contents/${CONFIG.filePath}?ref=${CONFIG.branch}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `token ${_token}`,
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (response.status === 404) {
      // File doesn't exist yet - return null to indicate new user
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    const content = b64_to_utf8(data.content); // Base64 decode with Unicode support
    const progress = JSON.parse(content);

    return {
      content: progress,
      sha: data.sha,
      lastModified: data.commit?.sha || null
    };
  }

  /**
   * Save progress to GitHub
   */
  async function saveProgress(progressData, existingSha = null) {
    if (!_token) throw new Error('No GitHub token configured');

    const url = `${CONFIG.apiBase}/${CONFIG.repo}/contents/${CONFIG.filePath}`;

    // Add metadata
    const payload = {
      ...progressData,
      _meta: {
        lastModified: Date.now(),
        device: navigator.userAgent.slice(0, 100),
        version: '1.0'
      }
    };

    const body = {
      message: `Update progress: ${new Date().toISOString()}`,
      content: utf8_to_b64(JSON.stringify(payload, null, 2)),
      branch: CONFIG.branch
    };

    // Include SHA if updating existing file
    if (existingSha) {
      body.sha = existingSha;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${_token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      // Handle 409 conflict (file changed since last fetch)
      if (response.status === 409) {
        throw new Error('CONFLICT: Remote file changed. Retry with merge.');
      }
      const errorText = await response.text();
      throw new Error(`GitHub API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return {
      sha: data.content.sha,
      commitSha: data.commit.sha
    };
  }

  /**
   * Get current sync status
   */
  function getStatus() {
    return {
      state: _isSyncing ? STATUS.SYNCING : 
             _lastError ? STATUS.ERROR :
             _pendingChanges ? STATUS.PENDING :
             _token ? STATUS.SYNCED : STATUS.DISCONNECTED,
      lastSyncTime: _lastSyncTime,
      lastError: _lastError,
      hasToken: !!_token,
      githubSha: _githubSha
    };
  }

  /**
   * Mark that there are pending changes
   */
  function markPending() {
    _pendingChanges = true;
  }

  /**
   * Mark sync as complete
   */
  function markSynced() {
    _pendingChanges = false;
    _lastSyncTime = Date.now();
    _lastError = null;
  }

  /**
   * Set error state
   */
  function setError(error) {
    _lastError = error?.message || String(error);
    _isSyncing = false;
  }

  /**
   * Set syncing state
   */
  function setSyncing(syncing) {
    _isSyncing = syncing;
  }

  /**
   * Set GitHub SHA for updates
   */
  function setGithubSha(sha) {
    _githubSha = sha;
  }

  /**
   * Get stored GitHub SHA
   */
  function getGithubSha() {
    return _githubSha;
  }

  // Public API
  return {
    init,
    isConfigured,
    getToken,
    setToken,
    clearToken,
    fetchProgress,
    saveProgress,
    getStatus,
    markPending,
    markSynced,
    setError,
    setSyncing,
    setGithubSha,
    getGithubSha,
    STATUS
  };
})();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GitHubSync;
}
