# PromoVideoHub — AI Video Generation Platform

## Overview
PromoVideoHub is a fully automated AI-powered video generation engine. Users provide a title, topic, visual style, and duration — the system handles everything else: scriptwriting, voiceover, visuals, subtitles, and background music — delivering a ready-to-upload MP4 video.

---

## Core Features

### 🤖 AI Video Generation Pipeline
- **AI Script Generation** — Claude (Anthropic) writes a 3-segment narration script with image search queries
- **AI Voiceover** — WaveSpeed TTS generates natural-sounding voice narration (OpenAI fallback)
- **Auto Visuals** — Stock photos and videos sourced from Pexels API, matched to script content
- **Auto Subtitles** — Whisper-powered (Groq API) speech-to-text sync for accurate subtitles
- **Background Music** — 22-track royalty-free library with randomized selection per style
- **Final Render** — Remotion composes everything into a polished MP4 video

### 🎨 8 Visual Styles
| Style | Description |
|---|---|
| Documentary | News-style, informational |
| Cyberpunk | Futuristic, neon, tech-heavy |
| Minimalist | Clean, professional |
| Cinematic 8k | High-impact, cinematic feel |
| Animated / Cartoon | Fun, explainer-style |
| Nature Documentary | Wildlife, environment |
| Tech Review | Product reviews, gadgets |
| Horror / Dark | Mystery, thriller |

### 📋 Web Dashboard
- **Auto Fill** — One-click AI-generated video ideas (title, topic, style, duration, music)
- **Manual Input** — Full control over all video parameters
- **Music Picker** — Preview and select background music, filtered by style
- **Job Queue** — Multi-user support with real-time status tracking (queued → rendering → completed)
- **Video Library** — Browse, preview, download, and delete generated videos
- **Copyright Checker** — Pre-submit copyright safety warnings for YouTube monetization
- **Password-Protected Access** — Simple login system for authorized users

### 🔌 REST API (15 Endpoints)
- Video generation, queue management, job tracking
- Music library with style-based filtering and preview streaming
- Copyright checking and reporting
- AI-powered auto-fill for random video ideas
- Health check and system status

---

## Tech Stack
| Component | Technology |
|---|---|
| Video Rendering | Remotion (React-based) |
| AI Script | Claude Haiku (Anthropic API) |
| AI Voice | WaveSpeed TTS + OpenAI fallback |
| Subtitles | Whisper via Groq API |
| Visuals | Pexels API (images + videos) |
| Backend | Node.js + Express + TypeScript |
| Frontend | React + Vite + Framer Motion |
| Audio Processing | FFmpeg |
| Deployment | Docker (2 containers) |

---

## Deployment
- **Dockerized** — Two containers: `video-engine` (backend) + `web-dashboard` (frontend)
- **VPS Ready** — Deployed on Hostinger VPS with Nginx Proxy Manager
- **Domain** — Accessible at `promovideohub.com`
