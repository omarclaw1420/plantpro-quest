/**
 * PlantPro Quest - Storage Manager
 * Handles localStorage persistence and GitHub cloud sync
 */

const Storage = {
    STORAGE_KEY: 'plantpro-quest-data',
    SYNC_DEBOUNCE_MS: 3000,
    
    // Sync timeout handle
    _syncTimeout: null,
    _isInitialized: false,

    // Default data structure with all 18 tasks
    getDefaultData() {
        return {
            player: {
                xp: 0,
                streak: 0,
                lastActive: null,
                achievements: [],
                allCompleteBonus: false
            },
            phases: [
                {
                    id: "p0",
                    name: "Test Device #1",
                    icon: "🔬",
                    tasks: [
                        { id: "0.1", name: "Run device for 1 hour, verify pump & sleep mode", completed: false, xp: 50, completedAt: null },
                        { id: "0.2", name: "Place at plant site, verify watering works", completed: false, xp: 50, completedAt: null },
                        { id: "0.3", name: "(Optional) Build water detection/testing unit", completed: false, xp: 50, completedAt: null }
                    ]
                },
                {
                    id: "p1",
                    name: "Build Device #2",
                    icon: "🔧",
                    tasks: [
                        { id: "1.1", name: "Verify pump operation", completed: false, xp: 50, completedAt: null },
                        { id: "1.1.1", name: "Cut wires & reverse pump polarity", completed: false, xp: 50, completedAt: null },
                        { id: "1.1.2", name: "Fill with water, test with battery", completed: false, xp: 50, completedAt: null },
                        { id: "1.2.1", name: "Glue programmed ESP to battery", completed: false, xp: 50, completedAt: null },
                        { id: "1.2.2", name: "Glue cover to second device", completed: false, xp: 50, completedAt: null },
                        { id: "1.2.3", name: "Glue ESP & battery to device", completed: false, xp: 50, completedAt: null },
                        { id: "1.3.1", name: "Run device through network", completed: false, xp: 50, completedAt: null },
                        { id: "1.3.2", name: "Leave for ~1 day, measure water output", completed: false, xp: 50, completedAt: null },
                        { id: "1.3.3", name: "Place at plant, verify correct watering", completed: false, xp: 50, completedAt: null }
                    ]
                },
                {
                    id: "p2",
                    name: "Code & Integration",
                    icon: "💻",
                    tasks: [
                        { id: "2.1", name: "Upload provided code to typical ESP", completed: false, xp: 50, completedAt: null },
                        { id: "2.2", name: "Connect ESP to website", completed: false, xp: 50, completedAt: null },
                        { id: "2.3", name: "Verify website interactiveness with device", completed: false, xp: 50, completedAt: null },
                        { id: "2.4", name: "Verify timer accuracy", completed: false, xp: 50, completedAt: null },
                        { id: "2.5", name: "Upload code to actual device", completed: false, xp: 50, completedAt: null },
                        { id: "2.6", name: "Verify same as 2.3 & 2.4", completed: false, xp: 50, completedAt: null }
                    ]
                }
            ],
            history: [],
            settings: {
                soundEnabled: false,
                confettiEnabled: true,
                recoveryKitchenSync: false,
                githubSync: false,
                theme: 'dark'
            },
            _localTimestamp: Date.now()
        };
    },

    /**
     * Initialize storage and GitHub sync
     */
    async init() {
        if (this._isInitialized) return;
        
        // Initialize GitHub sync first
        GitHubSync.init();
        
        // If GitHub configured, try to sync from cloud first
        if (GitHubSync.isConfigured()) {
            try {
                await this.syncFromGitHub();
            } catch (err) {
                console.log('Initial GitHub sync failed, using local data:', err.message);
                // Fall back to local
                this.load();
            }
        } else {
            // Just load from localStorage
            this.load();
        }
        
        this._isInitialized = true;
    },

    /**
     * Load data from localStorage
     */
    load() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                const data = JSON.parse(stored);
                // Merge with defaults to handle new fields
                return this.mergeWithDefaults(data);
            }
        } catch (e) {
            console.error('Error loading data:', e);
        }
        const defaultData = this.getDefaultData();
        this.save(defaultData, false); // Don't trigger sync for default
        return defaultData;
    },

    /**
     * Save data to localStorage and optionally sync to GitHub
     */
    save(data, triggerSync = true) {
        try {
            // Update timestamp
            data._localTimestamp = Date.now();
            
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            
            // Trigger GitHub sync if configured
            if (triggerSync && GitHubSync.isConfigured()) {
                GitHubSync.markPending();
                this._debouncedSync();
                // Notify UI of status change
                if (typeof UI !== 'undefined' && UI.updateSyncStatus) {
                    UI.updateSyncStatus();
                }
            }
            
            return true;
        } catch (e) {
            console.error('Error saving data:', e);
            return false;
        }
    },

    /**
     * Debounced sync to avoid API spam
     */
    _debouncedSync() {
        clearTimeout(this._syncTimeout);
        this._syncTimeout = setTimeout(() => {
            this.pushToGitHub().catch(err => {
                console.error('Background sync failed:', err);
                GitHubSync.setError(err);
                if (typeof UI !== 'undefined' && UI.updateSyncStatus) {
                    UI.updateSyncStatus();
                }
            });
        }, this.SYNC_DEBOUNCE_MS);
    },

    /**
     * Sync from GitHub (pull remote data)
     */
    async syncFromGitHub() {
        if (!GitHubSync.isConfigured()) {
            throw new Error('GitHub not configured');
        }

        GitHubSync.setSyncing(true);
        if (typeof UI !== 'undefined' && UI.updateSyncStatus) {
            UI.updateSyncStatus();
        }

        try {
            const remote = await GitHubSync.fetchProgress();
            
            if (remote === null) {
                // No remote data - push local as initial
                const localData = this.load();
                await this.pushToGitHub(localData);
                return { action: 'pushed', data: localData };
            }
            
            GitHubSync.setGithubSha(remote.sha);
            
            const localData = this.load();
            const remoteTime = remote.content._meta?.lastModified || 0;
            const localTime = localData._localTimestamp || 0;
            
            if (remoteTime > localTime) {
                // Remote is newer - pull it
                const mergedData = this._mergeProgress(remote.content, localData);
                mergedData._localTimestamp = remoteTime;
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(mergedData));
                GitHubSync.markSynced();
                
                if (typeof UI !== 'undefined' && UI.showToast) {
                    UI.showToast('☁️ Progress synced from cloud');
                }
                return { action: 'pulled', data: mergedData };
                
            } else if (localTime > remoteTime) {
                // Local is newer - push it
                await this.pushToGitHub(localData);
                return { action: 'pushed', data: localData };
            } else {
                // Equal - no action needed
                GitHubSync.markSynced();
                return { action: 'unchanged', data: localData };
            }
            
        } catch (err) {
            GitHubSync.setError(err);
            throw err;
        } finally {
            GitHubSync.setSyncing(false);
            if (typeof UI !== 'undefined' && UI.updateSyncStatus) {
                UI.updateSyncStatus();
            }
        }
    },

    /**
     * Push current data to GitHub
     */
    async pushToGitHub(data = null) {
        if (!GitHubSync.isConfigured()) {
            throw new Error('GitHub not configured');
        }

        GitHubSync.setSyncing(true);
        if (typeof UI !== 'undefined' && UI.updateSyncStatus) {
            UI.updateSyncStatus();
        }

        try {
            const dataToPush = data || this.load();
            const sha = GitHubSync.getGithubSha();
            
            const result = await GitHubSync.saveProgress(dataToPush, sha);
            GitHubSync.setGithubSha(result.sha);
            GitHubSync.markSynced();
            
            if (typeof UI !== 'undefined' && UI.updateSyncStatus) {
                UI.updateSyncStatus();
            }
            
            return result;
            
        } catch (err) {
            if (err.message.includes('CONFLICT')) {
                // Remote changed - re-fetch and merge
                console.log('Conflict detected, re-syncing...');
                return await this.syncFromGitHub();
            }
            GitHubSync.setError(err);
            throw err;
        } finally {
            GitHubSync.setSyncing(false);
            if (typeof UI !== 'undefined' && UI.updateSyncStatus) {
                UI.updateSyncStatus();
            }
        }
    },

    /**
     * Manual sync trigger
     */
    async syncNow() {
        if (!GitHubSync.isConfigured()) {
            throw new Error('GitHub not configured');
        }
        
        // Clear any pending debounced sync
        clearTimeout(this._syncTimeout);
        
        // Try to sync from GitHub first
        return await this.syncFromGitHub();
    },

    /**
     * Merge remote and local progress (remote wins for conflicts)
     */
    _mergeProgress(remote, local) {
        const defaults = this.getDefaultData();
        
        // Merge player data - use whichever has more XP
        const player = {
            ...defaults.player,
            ...local.player,
            ...remote.player,
            // Keep highest XP
            xp: Math.max(local.player?.xp || 0, remote.player?.xp || 0),
            // Merge achievements
            achievements: [...new Set([
                ...(local.player?.achievements || []),
                ...(remote.player?.achievements || [])
            ])],
            // Keep longest streak
            streak: Math.max(local.player?.streak || 0, remote.player?.streak || 0)
        };

        // Merge phases - use remote completion status, but ensure structure matches local
        const phases = local.phases.map((localPhase, index) => {
            const remotePhase = remote.phases?.[index];
            if (!remotePhase) return localPhase;
            
            const mergedTasks = localPhase.tasks.map((localTask, taskIndex) => {
                const remoteTask = remotePhase.tasks?.[taskIndex];
                if (!remoteTask) return localTask;
                
                // If either is completed, mark as completed
                const completed = localTask.completed || remoteTask.completed;
                return {
                    ...localTask,
                    completed,
                    completedAt: remoteTask.completedAt || localTask.completedAt || null
                };
            });
            
            return { ...localPhase, tasks: mergedTasks };
        });

        // Merge history - combine and sort by date
        const history = [...(local.history || []), ...(remote.history || [])]
            .filter((item, index, self) => 
                index === self.findIndex(t => t.taskId === item.taskId && t.date === item.date)
            )
            .sort((a, b) => new Date(b.date) - new Date(a.date))
            .slice(0, 50); // Keep last 50

        // Merge settings - local preferences take precedence
        const settings = {
            ...defaults.settings,
            ...remote.settings,
            ...local.settings
        };

        return {
            player,
            phases,
            history,
            settings,
            _localTimestamp: remote._meta?.lastModified || Date.now()
        };
    },

    // Merge stored data with defaults
    mergeWithDefaults(data) {
        const defaults = this.getDefaultData();
        
        // Ensure all phases and tasks exist
        const mergedPhases = defaults.phases.map((defaultPhase, index) => {
            const storedPhase = data.phases?.[index];
            if (storedPhase) {
                // Merge tasks to ensure any new tasks are included
                const mergedTasks = defaultPhase.tasks.map((defaultTask, taskIndex) => {
                    const storedTask = storedPhase.tasks?.[taskIndex];
                    return storedTask ? { ...defaultTask, ...storedTask } : defaultTask;
                });
                return { ...defaultPhase, ...storedPhase, tasks: mergedTasks };
            }
            return defaultPhase;
        });

        return {
            player: { ...defaults.player, ...data.player },
            phases: mergedPhases,
            history: data.history || [],
            settings: { ...defaults.settings, ...data.settings },
            _localTimestamp: data._localTimestamp || Date.now()
        };
    },

    // Export data as JSON
    export() {
        const data = this.load();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `plantpro-quest-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Reset all progress
    async reset() {
        if (confirm('⚠️ Are you sure? This will reset ALL progress, XP, and achievements!')) {
            localStorage.removeItem(this.STORAGE_KEY);
            
            // If GitHub sync is enabled, also clear remote
            if (GitHubSync.isConfigured()) {
                try {
                    const defaultData = this.getDefaultData();
                    await this.pushToGitHub(defaultData);
                } catch (err) {
                    console.error('Failed to reset remote data:', err);
                }
            }
            
            return true;
        }
        return false;
    },

    // Update a task
    completeTask(taskId) {
        const data = this.load();
        let task = null;
        let phase = null;

        // Find the task
        for (const p of data.phases) {
            const t = p.tasks.find(t => t.id === taskId);
            if (t) {
                task = t;
                phase = p;
                break;
            }
        }

        if (!task || task.completed) return null;

        // Mark complete
        task.completed = true;
        task.completedAt = new Date().toISOString();

        // Calculate XP with streak bonus
        const streakBonus = Math.min(data.player.streak * 0.05, 0.5);
        const xpEarned = Math.floor(task.xp * (1 + streakBonus));
        data.player.xp += xpEarned;

        // Update streak
        const today = new Date().toDateString();
        const lastActive = data.player.lastActive ? new Date(data.player.lastActive).toDateString() : null;
        
        if (lastActive !== today) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            if (lastActive === yesterday.toDateString()) {
                data.player.streak += 1;
            } else {
                data.player.streak = 1;
            }
            data.player.lastActive = new Date().toISOString();
        }

        // Add to history
        data.history.unshift({
            date: new Date().toISOString(),
            taskId: task.id,
            taskName: task.name,
            xpEarned: xpEarned,
            phaseId: phase.id
        });

        // Check for new achievements
        const newAchievements = GameSystem.checkAchievements(data);

        // Add new achievements
        for (const achId of newAchievements) {
            if (!data.player.achievements.includes(achId)) {
                data.player.achievements.push(achId);
            }
        }

        // Check for phase completion
        const phaseCompleted = phase.tasks.every(t => t.completed);
        if (phaseCompleted) {
            data.player.xp += 100; // Phase bonus
        }

        // Check for all completion
        const allCompleted = data.phases.every(p => p.tasks.every(t => t.completed));
        if (allCompleted && !data.player.allCompleteBonus) {
            data.player.xp += 500;
            data.player.allCompleteBonus = true;
        }

        this.save(data);

        return {
            data,
            xpEarned,
            newAchievements,
            phaseCompleted,
            allCompleted
        };
    },

    // Uncomplete a task (for undo)
    uncompleteTask(taskId) {
        const data = this.load();
        
        for (const p of data.phases) {
            const t = p.tasks.find(t => t.id === taskId);
            if (t) {
                t.completed = false;
                t.completedAt = null;
                break;
            }
        }

        // Remove from history
        data.history = data.history.filter(h => h.taskId !== taskId);

        this.save(data);
        return data;
    },

    // Recovery Kitchen Integration
    async syncToRecoveryKitchen(task) {
        const data = this.load();
        if (!data.settings.recoveryKitchenSync) return;

        try {
            // Check if Recovery Kitchen API is available
            if (window.RecoveryKitchen?.addEntry) {
                await window.RecoveryKitchen.addEntry({
                    type: 'main-course',
                    name: `🌱 PlantPro: ${task.name}`,
                    description: `Completed task ${task.id}`,
                    timestamp: new Date().toISOString(),
                    metadata: {
                        project: 'PlantPro',
                        taskId: task.id,
                        xpEarned: task.xp
                    }
                });
            }
        } catch (e) {
            console.error('Recovery Kitchen sync failed:', e);
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
