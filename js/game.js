/**
 * PlantPro Quest - Game Logic
 * Handles XP, levels, streaks, and achievements
 */

const GameSystem = {
    // Level configuration
    levels: [
        { name: "Seed", xpNeeded: 0 },
        { name: "Sprout", xpNeeded: 200 },
        { name: "Seedling", xpNeeded: 500 },
        { name: "Young Plant", xpNeeded: 1000 },
        { name: "Growing Plant", xpNeeded: 2000 },
        { name: "Mature Plant", xpNeeded: 3500 },
        { name: "Flowering", xpNeeded: 5000 },
        { name: "Harvest Ready", xpNeeded: 7500 }
    ],

    // Achievement definitions
    achievements: [
        { id: "first-steps", name: "First Steps", desc: "Complete your first task", icon: "🌱" },
        { id: "lab-rat", name: "Lab Rat", desc: "Complete Phase 0", icon: "🔬" },
        { id: "builder", name: "Builder", desc: "Complete Phase 1", icon: "🔧" },
        { id: "coder", name: "Coder", desc: "Complete Phase 2", icon: "💻" },
        { id: "speed-demon", name: "Speed Demon", desc: "Complete 3 tasks in one day", icon: "⚡" },
        { id: "on-fire", name: "On Fire", desc: "3-day streak", icon: "🔥" },
        { id: "unstoppable", name: "Unstoppable", desc: "7-day streak", icon: "💪" },
        { id: "plantpro-master", name: "PlantPro Master", desc: "Complete all tasks", icon: "🏆" }
    ],

    // Calculate level from XP
    getLevel(xp) {
        let level = 1;
        for (let i = this.levels.length - 1; i >= 0; i--) {
            if (xp >= this.levels[i].xpNeeded) {
                level = i + 1;
                break;
            }
        }
        return {
            level,
            name: this.levels[level - 1].name,
            currentXP: xp,
            xpForThisLevel: this.levels[level - 1].xpNeeded,
            xpForNextLevel: this.levels[level]?.xpNeeded || Infinity,
            xpToNext: this.levels[level] ? this.levels[level].xpNeeded - xp : 0,
            progress: this.levels[level] 
                ? ((xp - this.levels[level - 1].xpNeeded) / (this.levels[level].xpNeeded - this.levels[level - 1].xpNeeded)) * 100
                : 100
        };
    },

    // Calculate streak
    calculateStreak(lastActive, currentStreak) {
        const today = new Date().toDateString();
        const last = new Date(lastActive).toDateString();
        
        if (today === last) {
            return currentStreak;
        }
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (last === yesterday.toDateString()) {
            return currentStreak; // Will be incremented on activity
        }
        
        return 0; // Streak broken
    },

    // Check achievements
    checkAchievements(data) {
        const unlocked = [];
        const tasksCompleted = data.phases.flatMap(p => p.tasks).filter(t => t.completed).length;
        const phasesCompleted = data.phases.filter(p => p.tasks.every(t => t.completed)).length;
        const todayTasks = data.history?.filter(h => 
            new Date(h.date).toDateString() === new Date().toDateString()
        ).length || 0;

        // Check each achievement
        if (tasksCompleted >= 1 && !data.player.achievements.includes('first-steps')) {
            unlocked.push('first-steps');
        }
        if (data.phases[0]?.tasks.every(t => t.completed) && !data.player.achievements.includes('lab-rat')) {
            unlocked.push('lab-rat');
        }
        if (data.phases[1]?.tasks.every(t => t.completed) && !data.player.achievements.includes('builder')) {
            unlocked.push('builder');
        }
        if (data.phases[2]?.tasks.every(t => t.completed) && !data.player.achievements.includes('coder')) {
            unlocked.push('coder');
        }
        if (todayTasks >= 3 && !data.player.achievements.includes('speed-demon')) {
            unlocked.push('speed-demon');
        }
        if (data.player.streak >= 3 && !data.player.achievements.includes('on-fire')) {
            unlocked.push('on-fire');
        }
        if (data.player.streak >= 7 && !data.player.achievements.includes('unstoppable')) {
            unlocked.push('unstoppable');
        }
        if (phasesCompleted === 3 && !data.player.achievements.includes('plantpro-master')) {
            unlocked.push('plantpro-master');
        }

        return unlocked;
    },

    // Calculate XP for an action
    calculateXP(action, streak = 0) {
        const baseXP = {
            'task-complete': 50,
            'phase-complete': 100,
            'all-complete': 500,
            'daily-checkin': 10
        }[action] || 0;

        // Streak multiplier: +5% per day, max 50%
        const multiplier = 1 + Math.min(streak * 0.05, 0.5);
        return Math.floor(baseXP * multiplier);
    },

    // Get total stats
    getStats(data) {
        const allTasks = data.phases.flatMap(p => p.tasks);
        const completed = allTasks.filter(t => t.completed).length;
        const total = allTasks.length;
        
        return {
            tasksCompleted: completed,
            tasksTotal: total,
            percentage: Math.round((completed / total) * 100),
            phasesCompleted: data.phases.filter(p => p.tasks.every(t => t.completed)).length,
            phasesTotal: data.phases.length
        };
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameSystem;
}
