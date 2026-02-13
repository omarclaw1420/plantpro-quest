/**
 * PlantPro Quest - Confetti System
 * Canvas-based particle effects for celebrations
 */

const Confetti = {
    canvas: null,
    ctx: null,
    particles: [],
    isActive: false,
    animationId: null,

    // Color palette (greens for PlantPro)
    colors: [
        '#238636', // Primary green
        '#2ea043', // Secondary green  
        '#3fb950', // Glow green
        '#56d364', // Light green
        '#f0883e', // XP orange
        '#a371f7', // Level purple
        '#f85149', // Streak red
        '#ffffff'  // White sparkle
    ],

    init() {
        this.canvas = document.getElementById('confetti-canvas');
        if (!this.canvas) return;

        this.ctx = this.canvas.getContext('2d');
        this.resize();
        
        window.addEventListener('resize', () => this.resize());
    },

    resize() {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    createParticle(x, y, type = 'normal') {
        const colors = type === 'achievement' 
            ? ['#a371f7', '#bc8cff', '#f0883e', '#ffd700'] // Purple/gold for achievements
            : this.colors;

        return {
            x: x || Math.random() * this.canvas.width,
            y: y || -10,
            vx: (Math.random() - 0.5) * 10,
            vy: Math.random() * 5 + 2,
            size: Math.random() * 8 + 4,
            color: colors[Math.floor(Math.random() * colors.length)],
            rotation: Math.random() * Math.PI * 2,
            rotationSpeed: (Math.random() - 0.5) * 0.2,
            opacity: 1,
            decay: Math.random() * 0.01 + 0.005,
            type: Math.random() > 0.5 ? 'square' : 'circle'
        };
    },

    burst(x, y, count = 50, type = 'normal') {
        if (!this.canvas) this.init();
        if (!this.canvas) return;

        // Create particles
        for (let i = 0; i < count; i++) {
            this.particles.push(this.createParticle(x, y, type));
        }

        // Start animation if not already running
        if (!this.isActive) {
            this.isActive = true;
            this.animate();
        }
    },

    celebrateTask(x, y) {
        // Burst from the task position
        this.burst(x, y, 30, 'normal');
        
        // Add some delayed particles for effect
        setTimeout(() => {
            this.burst(x, y - 50, 20, 'normal');
        }, 200);
    },

    celebrateAchievement() {
        // Full screen celebration
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        
        // Multiple bursts
        for (let i = 0; i < 5; i++) {
            setTimeout(() => {
                const angle = (Math.PI * 2 / 5) * i;
                const distance = 100;
                const x = centerX + Math.cos(angle) * distance;
                const y = centerY + Math.sin(angle) * distance;
                this.burst(x, y, 40, 'achievement');
            }, i * 100);
        }

        // Center burst
        setTimeout(() => {
            this.burst(centerX, centerY, 60, 'achievement');
        }, 300);
    },

    celebratePhaseComplete() {
        const centerX = this.canvas.width / 2;
        
        // Falling confetti from top
        for (let i = 0; i < 100; i++) {
            setTimeout(() => {
                this.particles.push(this.createParticle(
                    Math.random() * this.canvas.width,
                    -20
                ));
            }, i * 20);
        }

        // Side bursts
        setTimeout(() => this.burst(0, centerX, 50), 0);
        setTimeout(() => this.burst(this.canvas.width, centerX, 50), 200);

        if (!this.isActive) {
            this.isActive = true;
            this.animate();
        }
    },

    animate() {
        if (!this.ctx || !this.canvas) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update and draw particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];

            // Update position
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.1; // Gravity
            p.rotation += p.rotationSpeed;
            p.opacity -= p.decay;

            // Remove dead particles
            if (p.opacity <= 0 || p.y > this.canvas.height + 50) {
                this.particles.splice(i, 1);
                continue;
            }

            // Draw particle
            this.ctx.save();
            this.ctx.globalAlpha = p.opacity;
            this.ctx.translate(p.x, p.y);
            this.ctx.rotate(p.rotation);
            this.ctx.fillStyle = p.color;

            if (p.type === 'circle') {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
                this.ctx.fill();
            } else {
                this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            }

            // Add glow effect
            this.ctx.shadowColor = p.color;
            this.ctx.shadowBlur = 10;
            this.ctx.fill();

            this.ctx.restore();
        }

        // Continue animation if particles remain
        if (this.particles.length > 0) {
            this.animationId = requestAnimationFrame(() => this.animate());
        } else {
            this.isActive = false;
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    },

    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.particles = [];
        this.isActive = false;
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    Confetti.init();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Confetti;
}
