# Nyvlo Design System 💎

Nyvlo is a premium full-stack platform focused on WhatsApp automation and AI management. Its design system emphasizes a high-end, professional, and modern aesthetic through glassmorphism, bold typography, and a sophisticated dark-themed palette.

---

## 🎨 Color Palette

### Primary Colors
- **Nyvlo Navy**: `#1D3D6B` - The core brand color, used for primary actions, branding, and gradients.
- **Vibrant Green**: `#59C348` - Used for highlights, success states, and growth indicators.

### Base Colors (Dark Theme)
- **Background**: `hsl(224 71% 4%)` - Deep blue/slate for page backgrounds.
- **Foreground**: `hsl(213 31% 91%)` - Light slate for primary text.
- **Border/Input**: `hsl(217 33% 17%)` - Subtle borders for depth.
- **Surface**: `hsl(224 71% 4%)` - Used for cards and containers.

### Functional Colors
- **Emerald**: Success, active states, financial metrics.
- **Orange/Amber**: Waiting states, trials, secondary highlights.
- **Indigo/Violet**: Automation, AI metrics, special features.

---

## 🔡 Typography

The typography system uses two modern sans-serif fonts to create a premium hierarchical structure.

- **Primary Font**: `Plus Jakarta Sans` - Used for headings and main UI elements.
- **Secondary Font**: `Outfit` - Used for secondary text and modern accents.

### Typography Hierarchy
- **Extra Bold Headlines**: `text-4xl font-black` - Used for page titles and major sections.
- **Section Headers**: `text-xl font-bold` - Used for card titles.
- **Subtitles**: `text-[10px] uppercase font-black tracking-widest` - Used for labels and small captions.

---

## ✨ Design Tokens & Effects

### Glassmorphism
Used for overlays, sidebars, and premium cards to create depth.
```css
.glass {
    backdrop-filter: blur(24px);
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
}
```

### Gradients
- **Brand Gradient**: From Navy (`#1D3D6B`) to Green (`#59C348`).
- **Text Gradient**: White to Slate-400 for a shimmering effect on headings.

---

## 🧩 Core Components

### 1. Stat Cards (`StatCard`)
- **Structure**: Icon (right), Label (top-left), Value (center-left), Trend/Subtext (bottom).
- **Styling**: `rounded-3xl`, `border-slate-200`, `shadow-sm`.
- **Interaction**: Scale up subtly on hover; active state rings.

### 2. Premium Modals
- **Shape**: Extreme rounded corners (`rounded-[2.5rem]`).
- **Overlay**: `backdrop-filter: blur(8px)`.
- **Animation**: `zoomIn` (0.3s) with cubic-bezier for a "bouncy" premium feel.

### 3. Navigation (Sidebar)
- Fixed vertical layout.
- Icon-centric with clear labels.
- Glassmorphism for the background.

### 4. Interactive Elements
- **Buttons**: Large border-radius (`rounded-2xl`), bold text, subtle scale-up on hover.
- **Inputs**: Dark background with low-opacity borders.

---

## 🎬 Animations
- **Floating**: Subtle Y-axis translation for hero or decorative elements (`animate-float`).
- **Fade/Slide In**: used for page transitions and card loading.

---

## 🛠️ Technology Stack
- **Framework**: React 19
- **Styling**: Tailwind CSS 4 + PostCSS
- **Icons**: Lucide React
- **State**: Zustand
