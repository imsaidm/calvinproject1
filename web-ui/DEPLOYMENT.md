# AI Video Engine Web UI - Deployment Guide

## 1. Local Development
To run this project on your local machine:
```bash
npm install
npm run dev
```
Access at: `http://localhost:5173`

## 2. Configuration
Open `.env` (or create it) to configure:
```env
# The URL where your n8n workflow listens for requests
VITE_N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/video-request
```

## 3. Deploying to Hostinger VPS

### Option A: Static Build (Recommended for Nginx/Apache)
1. Run the build command:
   ```bash
   npm run build
   ```
2. This creates a `dist` folder.
3. Upload the contents of the `dist` folder to your web server's public directory (e.g., `/var/www/html` or via File Manager).

### Option B: Docker (If using EasyPanel/Coolify)
1. Create a `Dockerfile`:
   ```dockerfile
   FROM node:18-alpine as build
   WORKDIR /app
   COPY package*.json ./
   RUN npm install
   COPY . .
   RUN npm run build

   FROM nginx:alpine
   COPY --from=build /app/dist /usr/share/nginx/html
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```
2. Build and run the container.

## 4. Updates
To change the password (currently hardcoded for simplicity):
- Edit `src/components/LoginPage.jsx`
- Line 16: `if (password === 'cshvideo2026')`
