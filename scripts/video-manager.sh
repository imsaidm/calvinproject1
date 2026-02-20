#!/bin/bash
# PromoVideoHub Video Manager Script
# Used by OpenClaw to query and manage videos from Telegram
# Usage: /root/video-manager.sh [command]
# Commands: count, list, status, link <filename>

ENGINE_URL="http://localhost:8124"
PUBLIC_URL="https://api.promovideohub.com"
CMD="${1:-list}"

case "$CMD" in

  count)
    FILES=$(curl -s "$ENGINE_URL/" | grep -o '"pending":[0-9]*' | head -1)
    VIDEOS=$(curl -s "$ENGINE_URL/library" 2>/dev/null | grep -c '\.mp4' || echo 0)
    QUEUE=$(curl -s "$ENGINE_URL/api/queue/status" 2>/dev/null)
    echo "📊 PromoVideoHub Stats:"
    echo "Total videos: $VIDEOS"
    echo "Queue: $QUEUE"
    ;;

  list)
    echo "📁 Video Library:"
    curl -s "$ENGINE_URL/library" 2>/dev/null | grep -oP '<h3[^>]*>\K[^<]+' | while read -r name; do
      echo "  🎬 $name"
    done
    TOTAL=$(curl -s "$ENGINE_URL/library" 2>/dev/null | grep -c '<h3')
    echo ""
    echo "Total: $TOTAL videos"
    echo "🌐 Full library: $PUBLIC_URL/library"
    ;;

  status)
    QUEUE=$(curl -s "$ENGINE_URL/api/queue/status" 2>/dev/null)
    HEALTH=$(curl -s "$ENGINE_URL/" 2>/dev/null)
    echo "⚙️ Engine Status:"
    echo "$HEALTH" | sed 's/,/\n/g' | sed 's/[{}"]//g'
    echo ""
    echo "📊 Queue:"
    echo "$QUEUE" | sed 's/,/\n/g' | sed 's/[{}"]//g'
    ;;

  link)
    FILENAME="$2"
    if [ -z "$FILENAME" ]; then
      echo "Usage: video-manager.sh link <filename>"
      echo "Use 'video-manager.sh list' to see available videos"
    else
      # Add .mp4 if not present
      case "$FILENAME" in
        *.mp4) ;;
        *) FILENAME="${FILENAME}.mp4" ;;
      esac
      ENCODED=$(echo "$FILENAME" | sed 's/ /%20/g')
      echo "🔗 Video link:"
      echo "$PUBLIC_URL/videos/$ENCODED"
    fi
    ;;

  *)
    echo "Usage: video-manager.sh [count|list|status|link <filename>]"
    ;;
esac
