#!/bin/bash
# PromoVideoHub Smart Video Generator
# Used by OpenClaw to generate videos from Telegram
#
# Usage:
#   /root/generate-video.sh random [niche]     — AI picks everything (uses autofill)
#   /root/generate-video.sh "title" "topic"    — You pick title & topic, defaults for rest
#   /root/generate-video.sh "title" "topic" "style" "duration"  — Full control
#
# Niche options for random: ai, tech, science, business, any (default: ai)
# Style options: Documentary, Cyberpunk, Minimalist, Cinematic, ExplainLikeIm5, NatureDocs, TechReview, Horror
# Duration options: 30s, 60s, 90s, 120s, 150s, 180s

API_KEY="cshvideo2026"
ENGINE_URL="http://localhost:8124"

# Error handler - never crash
set -o pipefail
trap 'echo "❌ Script error on line $LINENO. Please try again or check the engine at https://promovideohub.com"; exit 1' ERR

# Check if engine is reachable
HEALTH=$(curl -s --connect-timeout 5 "$ENGINE_URL/" 2>/dev/null)
if [ -z "$HEALTH" ]; then
  echo "❌ Video engine is not reachable. The Docker container might be down."
  echo "Try: docker restart csh-video-engine"
  exit 1
fi

# Check if engine is online
if echo "$HEALTH" | grep -q '"status":"online"'; then
  : # good
else
  echo "⚠️ Video engine is reachable but may not be fully online."
  echo "Status: $HEALTH"
fi

MODE="$1"

# ============================================================
# MODE 1: RANDOM — uses autofill API to let AI pick everything
# ============================================================
if [ "$MODE" = "random" ] || [ "$MODE" = "surprise" ] || [ "$MODE" = "auto" ] || [ -z "$MODE" ]; then
  NICHE="${2:-ai}"
  echo "🎲 Generating random ${NICHE} video idea..."
  
  AUTOFILL=$(curl -s --connect-timeout 10 "$ENGINE_URL/api/autofill?niche=$NICHE" 2>/dev/null)
  
  if [ -z "$AUTOFILL" ] || echo "$AUTOFILL" | grep -q '"error"'; then
    echo "⚠️ Autofill failed, using fallback defaults..."
    TITLE="AI Innovation Spotlight"
    TOPIC="Exploring the latest breakthroughs in artificial intelligence and how they impact everyday life"
    STYLE="Documentary"
    DURATION="60s"
    MUSIC=""
  else
    # Parse JSON response
    TITLE=$(echo "$AUTOFILL" | grep -o '"title":"[^"]*"' | head -1 | cut -d'"' -f4)
    TOPIC=$(echo "$AUTOFILL" | grep -o '"topic":"[^"]*"' | head -1 | cut -d'"' -f4)
    STYLE=$(echo "$AUTOFILL" | grep -o '"style":"[^"]*"' | head -1 | cut -d'"' -f4)
    DURATION=$(echo "$AUTOFILL" | grep -o '"duration":"[^"]*"' | head -1 | cut -d'"' -f4)
    MUSIC=$(echo "$AUTOFILL" | grep -o '"musicTrack":"[^"]*"' | head -1 | cut -d'"' -f4)
    
    # Validate - ensure nothing is empty
    [ -z "$TITLE" ] && TITLE="AI Innovation Spotlight"
    [ -z "$TOPIC" ] && TOPIC="Exploring the latest breakthroughs in AI"
    [ -z "$STYLE" ] && STYLE="Documentary"
    [ -z "$DURATION" ] && DURATION="60s"
  fi
  
  echo "✨ AI picked:"
  echo "  Title: $TITLE"
  echo "  Topic: $TOPIC"
  echo "  Style: $STYLE"
  echo "  Duration: $DURATION"
  [ -n "$MUSIC" ] && echo "  Music: $MUSIC"
  echo ""

# ============================================================
# MODE 2: SPECIFIC — user provides title and/or topic
# ============================================================
else
  TITLE="$1"
  TOPIC="${2:-$1}"
  STYLE="${3:-Documentary}"
  DURATION="${4:-90s}"
  MUSIC="${5:-}"
  
  # Validate style
  case "$STYLE" in
    Documentary|Cyberpunk|Minimalist|Cinematic|ExplainLikeIm5|NatureDocs|TechReview|Horror|Cartoon) ;;
    *) echo "⚠️ Unknown style '$STYLE', using Documentary"; STYLE="Documentary" ;;
  esac
  
  # Validate duration
  case "$DURATION" in
    30s|60s|90s|120s|150s|180s) ;;
    *) echo "⚠️ Unknown duration '$DURATION', using 90s"; DURATION="90s" ;;
  esac
fi

# ============================================================
# TRIGGER VIDEO GENERATION
# ============================================================
echo "🎬 Triggering video generation..."

# Build JSON payload
JSON="{\"title\":\"$TITLE\",\"topic\":\"$TOPIC\",\"style\":\"$STYLE\",\"duration\":\"$DURATION\""
[ -n "$MUSIC" ] && JSON="$JSON,\"musicTrack\":\"$MUSIC\""
JSON="$JSON}"

RESPONSE=$(curl -s -w "\n%{http_code}" --connect-timeout 10 -X POST "$ENGINE_URL/trigger" \
  -H "Content-Type: application/json" \
  -H "x-api-key: $API_KEY" \
  -d "$JSON" 2>/dev/null)

HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "202" ]; then
  JOB_ID=$(echo "$BODY" | grep -o '"jobId":"[^"]*"' | cut -d'"' -f4)
  echo "✅ Video queued successfully!"
  echo "  Job ID: $JOB_ID"
  echo "  Title: $TITLE"
  echo "  Style: $STYLE | Duration: $DURATION"
  echo ""
  echo "📊 Check progress: https://promovideohub.com"
  echo "📚 Video library: https://api.promovideohub.com/library"
elif [ "$HTTP_CODE" = "429" ]; then
  echo "⏳ Rate limited — too many video requests. Please wait a few minutes and try again."
elif [ "$HTTP_CODE" = "400" ]; then
  echo "❌ Bad request: $BODY"
  echo "Make sure title and topic are provided."
else
  echo "❌ Failed (HTTP $HTTP_CODE)"
  echo "Error: $BODY"
  echo ""
  echo "🔧 Try checking the dashboard: https://promovideohub.com"
fi
