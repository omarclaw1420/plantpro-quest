/**
 * PlantPro Quest - Storage Manager
 * Handles localStorage persistence and data management
 */

const Storage = {
    STORAGE_KEY: 'plantpro-quest-data',
    
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
                theme: 'dark'
            }
        };
    },

    // Load data from localStorage
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
        return this.getDefaultData();
    },

    // Save data to localStorage
    save(data) {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Error saving data:', e);
            return false;
        }
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
            settings: { ...defaults.settings, ...data.settings }
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
    reset() {
        if (confirm('⚠️ Are you sure? This will reset ALL progress, XP, and achievements!')) {
            localStorage.removeItem(this.STORAGE_KEY);
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
