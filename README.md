# 🌱 PlantPro Quest

A gamified progress dashboard for Omar's PlantPro hardware project. Turn mundane hardware development tasks into an RPG-style quest system with XP, levels, streaks, achievements, and satisfying visual feedback.

![PlantPro Quest](https://img.shields.io/badge/PlantPro-Quest-green?style=for-the-badge)

## ✨ Features

- **🎮 Gamified Progress**: Complete tasks to earn XP and level up
- **📊 Visual Stats**: Track streaks, XP, levels, and completion percentage
- **🏅 Achievements**: Unlock 8 unique achievements as you progress
- **🎉 Celebrations**: Confetti effects on task/phase/achievement completion
- **📱 Mobile-First**: Responsive design optimized for mobile and desktop
- **💾 Persistent**: All data saved to localStorage
- **🎨 Themes**: Dark, OLED Black, and Forest Green themes
- **🔗 Recovery Kitchen Integration**: Optional sync to Recovery Kitchen

## 🚀 Quick Start

### Local Development

1. Clone or download this repository
2. Open `index.html` in your browser
3. Start completing tasks!

### Deploy to GitHub Pages

1. Create a new repository on GitHub
2. Upload all files to the repository
3. Go to Settings → Pages
4. Select "Deploy from a branch"
5. Choose `main` branch and `/ (root)` folder
6. Your app will be live at `https://USERNAME.github.io/plantpro-quest/`

## 📋 Task Structure

### Phase 0: Test Device #1 🔬 (3 tasks)
| ID | Task Name |
|----|-----------|
| 0.1 | Run device for 1 hour, verify pump & sleep mode |
| 0.2 | Place at plant site, verify watering works |
| 0.3 | (Optional) Build water detection/testing unit |

### Phase 1: Build Device #2 🔧 (9 tasks)
| ID | Task Name |
|----|-----------|
| 1.1 | Verify pump operation |
| 1.1.1 | Cut wires & reverse pump polarity |
| 1.1.2 | Fill with water, test with battery |
| 1.2.1 | Glue programmed ESP to battery |
| 1.2.2 | Glue cover to second device |
| 1.2.3 | Glue ESP & battery to device |
| 1.3.1 | Run device through network |
| 1.3.2 | Leave for ~1 day, measure water output |
| 1.3.3 | Place at plant, verify correct watering |

### Phase 2: Code & Integration 💻 (6 tasks)
| ID | Task Name |
|----|-----------|
| 2.1 | Upload provided code to typical ESP |
| 2.2 | Connect ESP to website |
| 2.3 | Verify website interactiveness with device |
| 2.4 | Verify timer accuracy |
| 2.5 | Upload code to actual device |
| 2.6 | Verify same as 2.3 & 2.4 |

**Total: 18 tasks | Max Base XP: 900 | With Bonuses: 1,200+ XP**

## 🎮 Level System

| Level | Name | XP Required |
|-------|------|-------------|
| 1 | Seed | 0 |
| 2 | Sprout | 200 |
| 3 | Seedling | 500 |
| 4 | Young Plant | 1,000 |
| 5 | Growing Plant | 2,000 |
| 6 | Mature Plant | 3,500 |
| 7 | Flowering | 5,000 |
| 8 | Harvest Ready | 7,500 |

## 🏅 Achievements

| Icon | Name | How to Unlock |
|------|------|---------------|
| 🌱 | First Steps | Complete your first task |
| 🔬 | Lab Rat | Complete Phase 0 |
| 🔧 | Builder | Complete Phase 1 |
| 💻 | Coder | Complete Phase 2 |
| ⚡ | Speed Demon | Complete 3 tasks in one day |
| 🔥 | On Fire | 3-day streak |
| 💪 | Unstoppable | 7-day streak |
| 🏆 | PlantPro Master | Complete all tasks |

## ⚙️ Settings

Click the ⚙️ button to access settings:

- **Sound Effects**: Toggle sound (default: off)
- **Confetti Celebrations**: Toggle visual effects (default: on)
- **Recovery Kitchen Sync**: Log tasks as Main Courses (default: off)
- **Theme**: Choose Dark, OLED Black, or Forest Green

## 📦 Data Management

- **Auto-save**: All progress automatically saves to browser storage
- **Export**: Click "Export Data" to download a JSON backup
- **Reset**: Click "Reset Progress" to start fresh (with confirmation)

## 🔗 Recovery Kitchen Integration

When enabled, completed tasks are logged as Main Course entries in the Recovery Kitchen app. Requires the Recovery Kitchen app to expose a global API:

```javascript
window.RecoveryKitchen = {
  addEntry: async (entry) => { /* ... */ }
};
```

## 🛠️ Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Custom properties, Grid, Flexbox, animations
- **Vanilla JavaScript** - ES6+ modules, no build step
- **Canvas API** - Particle effects for confetti
- **localStorage** - Data persistence

## 📱 Browser Support

- Chrome/Edge 80+
- Firefox 75+
- Safari 13+
- Mobile Safari/Chrome

## 📄 License

MIT License - Feel free to use and modify for your own projects!

---

Built with ❤️ for Omar's PlantPro project. Keep growing! 🌱
