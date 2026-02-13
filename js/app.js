/**
 * PlantPro Quest - Main Application
 * Initializes and runs the gamified dashboard
 */

const App = {
    data: null,
    
    init() {
        // Load data
        this.data = Storage.load();
        
        // Initialize confetti
        Confetti.init();
        
        // Apply theme
        this.applyTheme(this.data.settings.theme);
        
        // Render UI
        this.render();
        
        // Bind events
        this.bindEvents();
        
        // Check for daily streak
        this.checkDailyStreak();
        
        console.log('🌱 PlantPro Quest initialized!');
    },

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    },

    render() {
        this.renderStats();
        this.renderPhases();
        this.renderAchievements();
        this.renderActivity();
    },

    renderStats() {
        const stats = GameSystem.getStats(this.data);
        const level = GameSystem.getLevel(this.data.player.xp);

        // Update stat cards
        document.getElementById('streak-value').textContent = this.data.player.streak;
        document.getElementById('xp-value').textContent = this.data.player.xp.toLocaleString();
        document.getElementById('level-value').textContent = level.level;
        document.getElementById('level-name').textContent = level.name;
        document.getElementById('tasks-completed').textContent = stats.tasksCompleted;
        document.getElementById('tasks-total').textContent = stats.tasksTotal;

        // Update level progress bar
        document.getElementById('level-progress-fill').style.width = `${level.progress}%`;
        document.getElementById('xp-to-next').textContent = 
            level.xpToNext === Infinity 
                ? 'Max Level!' 
                : `${level.xpToNext} XP to next level`;

        // Update overall progress
        document.getElementById('overall-percentage').textContent = `${stats.percentage}%`;
        document.getElementById('overall-progress-fill').style.width = `${stats.percentage}%`;

        // Update phase marks
        document.querySelectorAll('.mark').forEach((mark, index) => {
            const phase = this.data.phases[index];
            if (phase && phase.tasks.every(t => t.completed)) {
                mark.classList.add('completed');
            } else {
                mark.classList.remove('completed');
            }
        });
    },

    renderPhases() {
        const container = document.getElementById('phases-container');
        container.innerHTML = '';

        this.data.phases.forEach((phase, index) => {
            const completed = phase.tasks.filter(t => t.completed).length;
            const total = phase.tasks.length;
            const percent = Math.round((completed / total) * 100);
            const isComplete = completed === total;

            const phaseCard = document.createElement('div');
            phaseCard.className = `phase-card ${isComplete ? 'completed' : ''} ${index === 0 ? 'expanded' : ''}`;
            phaseCard.dataset.phaseId = phase.id;

            phaseCard.innerHTML = `
                <div class="phase-header">
                    <div class="phase-title">
                        <span class="phase-toggle">▼</span>
                        <span class="phase-icon">${phase.icon}</span>
                        <span>${phase.name}</span>
                    </div>
                    <div class="phase-progress">
                        <span class="phase-progress-text">${completed}/${total}</span>
                        <div class="progress-bar phase-progress-bar">
                            <div class="progress-fill" style="width: ${percent}%"></div>
                        </div>
                    </div>
                </div>
                <div class="phase-content">
                    <div class="tasks-list">
                        ${phase.tasks.map(task => `
                            <div class="task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id}">
                                <div class="task-checkbox"></div>
                                <div class="task-content">
                                    <div class="task-id">${task.id}</div>
                                    <div class="task-name">${task.name}</div>
                                </div>
                                <div class="task-xp">+${task.xp} XP</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="phase-reward">
                        ${isComplete 
                            ? `✅ Phase Complete! +100 XP Bonus` 
                            : `🎯 Phase Reward: +100 XP on completion`
                        }
                    </div>
                </div>
            `;

            container.appendChild(phaseCard);
        });
    },

    renderAchievements() {
        const grid = document.getElementById('achievements-grid');
        grid.innerHTML = '';

        GameSystem.achievements.forEach(ach => {
            const unlocked = this.data.player.achievements.includes(ach.id);
            
            const card = document.createElement('div');
            card.className = `achievement-card ${unlocked ? 'unlocked' : ''}`;
            card.innerHTML = `
                <div class="achievement-icon-small">${ach.icon}</div>
                <div class="achievement-name-small">${ach.name}</div>
                <div class="achievement-desc-small">${ach.desc}</div>
            `;
            
            grid.appendChild(card);
        });
    },

    renderActivity() {
        const list = document.getElementById('activity-list');
        
        if (this.data.history.length === 0) {
            list.innerHTML = '<div class="activity-empty">Complete your first task to see activity!</div>';
            return;
        }

        list.innerHTML = this.data.history.slice(0, 10).map(item => {
            const date = new Date(item.date);
            const timeStr = date.toLocaleTimeString('en-US', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
            });
            
            return `
                <div class="activity-item">
                    <div class="activity-icon">✅</div>
                    <div class="activity-content">
                        <div class="activity-text">Completed task ${item.taskId}</div>
                        <div class="activity-time">${timeStr}</div>
                    </div>
                    <div class="activity-xp">+${item.xpEarned} XP</div>
                </div>
            `;
        }).join('');
    },

    bindEvents() {
        // Phase expand/collapse
        document.getElementById('phases-container').addEventListener('click', (e) => {
            const header = e.target.closest('.phase-header');
            if (header) {
                const card = header.closest('.phase-card');
                card.classList.toggle('expanded');
            }
        });

        // Task completion
        document.getElementById('phases-container').addEventListener('click', (e) => {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;

            const taskId = taskItem.dataset.taskId;
            if (taskItem.classList.contains('completed')) {
                // Uncheck
                this.data = Storage.uncompleteTask(taskId);
                this.render();
            } else {
                // Check
                this.completeTask(taskItem, taskId);
            }
        });

        // Settings modal
        document.getElementById('settings-btn').addEventListener('click', () => {
            this.openSettings();
        });

        document.getElementById('close-settings').addEventListener('click', () => {
            this.closeSettings();
        });

        // Achievement modal
        document.getElementById('achievement-ok').addEventListener('click', () => {
            document.getElementById('achievement-modal').classList.remove('active');
        });

        // Export/Reset
        document.getElementById('export-data').addEventListener('click', (e) => {
            e.preventDefault();
            Storage.export();
            this.showToast('💾 Data exported!', 'success');
        });

        document.getElementById('reset-data').addEventListener('click', (e) => {
            e.preventDefault();
            if (Storage.reset()) {
                this.data = Storage.load();
                this.render();
                this.showToast('🔄 Progress reset!', 'success');
            }
        });

        // Close modal on backdrop click
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal && !modal.classList.contains('achievement-modal')) {
                    modal.classList.remove('active');
                }
            });
        });
    },

    completeTask(taskElement, taskId) {
        // Get click position for confetti
        const rect = taskElement.getBoundingClientRect();
        const x = rect.left + rect.width / 2;
        const y = rect.top + rect.height / 2;

        // Complete the task
        const result = Storage.completeTask(taskId);
        if (!result) return;

        this.data = result.data;

        // Visual feedback
        taskElement.classList.add('completed');
        
        // XP float animation
        this.showXPFloat(x, y, result.xpEarned);

        // Confetti
        if (this.data.settings.confettiEnabled) {
            Confetti.celebrateTask(x, y);
        }

        // Re-render stats
        this.renderStats();
        this.renderActivity();

        // Check for phase completion
        if (result.phaseCompleted) {
            setTimeout(() => {
                if (this.data.settings.confettiEnabled) {
                    Confetti.celebratePhaseComplete();
                }
                this.showToast('🎉 Phase Complete! +100 XP Bonus', 'success');
                this.renderPhases();
            }, 500);
        } else {
            // Just update the phase progress
            this.renderPhases();
        }

        // Check for achievements
        if (result.newAchievements.length > 0) {
            result.newAchievements.forEach((achId, index) => {
                setTimeout(() => {
                    this.showAchievement(achId);
                }, 800 + (index * 300));
            });
            this.renderAchievements();
        }

        // Sync to Recovery Kitchen
        const task = this.findTask(taskId);
        if (task) {
            Storage.syncToRecoveryKitchen(task);
        }
    },

    findTask(taskId) {
        for (const phase of this.data.phases) {
            const task = phase.tasks.find(t => t.id === taskId);
            if (task) return { ...task, phaseId: phase.id };
        }
        return null;
    },

    showXPFloat(x, y, amount) {
        const float = document.createElement('div');
        float.className = 'xp-float';
        float.textContent = `+${amount} XP!`;
        float.style.left = `${x}px`;
        float.style.top = `${y}px`;
        document.body.appendChild(float);

        setTimeout(() => float.remove(), 1500);
    },

    showAchievement(achId) {
        const ach = GameSystem.achievements.find(a => a.id === achId);
        if (!ach) return;

        // Show modal for big achievements
        if (['lab-rat', 'builder', 'coder', 'plantpro-master'].includes(achId)) {
            document.getElementById('achievement-icon').textContent = ach.icon;
            document.getElementById('achievement-name').textContent = ach.name;
            document.getElementById('achievement-desc').textContent = ach.desc;
            document.getElementById('achievement-modal').classList.add('active');
            
            if (this.data.settings.confettiEnabled) {
                Confetti.celebrateAchievement();
            }
        } else {
            // Toast for smaller achievements
            this.showToast(`${ach.icon} Achievement Unlocked: ${ach.name}`, 'achievement');
        }
    },

    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    openSettings() {
        const modal = document.getElementById('settings-modal');
        const settings = this.data.settings;

        document.getElementById('sound-enabled').checked = settings.soundEnabled;
        document.getElementById('confetti-enabled').checked = settings.confettiEnabled;
        document.getElementById('recovery-kitchen-sync').checked = settings.recoveryKitchenSync;
        document.getElementById('theme-select').value = settings.theme;

        // Bind setting changes
        document.getElementById('sound-enabled').onchange = (e) => {
            this.data.settings.soundEnabled = e.target.checked;
            Storage.save(this.data);
        };

        document.getElementById('confetti-enabled').onchange = (e) => {
            this.data.settings.confettiEnabled = e.target.checked;
            Storage.save(this.data);
        };

        document.getElementById('recovery-kitchen-sync').onchange = (e) => {
            this.data.settings.recoveryKitchenSync = e.target.checked;
            Storage.save(this.data);
        };

        document.getElementById('theme-select').onchange = (e) => {
            this.data.settings.theme = e.target.value;
            this.applyTheme(e.target.value);
            Storage.save(this.data);
        };

        modal.classList.add('active');
    },

    closeSettings() {
        document.getElementById('settings-modal').classList.remove('active');
    },

    checkDailyStreak() {
        const lastActive = this.data.player.lastActive;
        if (!lastActive) return;

        const today = new Date().toDateString();
        const last = new Date(lastActive).toDateString();

        if (today !== last) {
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);

            if (last !== yesterday.toDateString()) {
                // Streak broken
                if (this.data.player.streak > 0) {
                    this.showToast(`🔥 Streak lost! You were at ${this.data.player.streak} days. Start a new streak today!`, 'success');
                    this.data.player.streak = 0;
                    Storage.save(this.data);
                    this.renderStats();
                }
            }
        }
    }
};

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = App;
}
