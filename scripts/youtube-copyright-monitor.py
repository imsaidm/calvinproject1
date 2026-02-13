#!/usr/bin/env python3
"""
YouTube Copyright Monitor — Post-Upload Content ID Checker

Checks uploaded YouTube videos for copyright claims using the YouTube Data API v3.
Can be run manually or via cron for automated monitoring.

Requirements:
    pip install google-api-python-client python-dotenv

Usage:
    # Check a single video
    python youtube-copyright-monitor.py --video-id VIDEO_ID

    # Check multiple videos
    python youtube-copyright-monitor.py --video-ids VIDEO_ID1,VIDEO_ID2

    # Check all videos from a channel
    python youtube-copyright-monitor.py --channel

Environment Variables:
    YOUTUBE_API_KEY — Your YouTube Data API v3 key (from Google Cloud Console)
    YOUTUBE_CHANNEL_ID — (Optional) Your YouTube channel ID for --channel mode
"""

import os
import sys
import json
import argparse
from datetime import datetime

try:
    from googleapiclient.discovery import build
    from dotenv import load_dotenv
except ImportError:
    print("❌ Missing dependencies. Install with:")
    print("   pip install google-api-python-client python-dotenv")
    sys.exit(1)

load_dotenv()

API_KEY = os.getenv("YOUTUBE_API_KEY")
CHANNEL_ID = os.getenv("YOUTUBE_CHANNEL_ID")


def get_youtube_service():
    """Build the YouTube Data API service."""
    if not API_KEY:
        print("❌ YOUTUBE_API_KEY not set. Get one from https://console.cloud.google.com")
        print("   1. Go to APIs & Services > Credentials")
        print("   2. Create an API Key")
        print("   3. Enable 'YouTube Data API v3'")
        print("   4. Add YOUTUBE_API_KEY=your_key to .env file")
        sys.exit(1)
    return build("youtube", "v3", developerKey=API_KEY)


def check_video_copyright(youtube, video_id):
    """
    Check a single video for copyright claims.
    Returns a dict with copyright status and details.
    """
    try:
        request = youtube.videos().list(
            part="contentDetails,status,snippet",
            id=video_id
        )
        response = request.execute()

        if not response.get("items"):
            return {
                "videoId": video_id,
                "found": False,
                "error": "Video not found or is private"
            }

        video = response["items"][0]
        snippet = video.get("snippet", {})
        content_details = video.get("contentDetails", {})
        status = video.get("status", {})

        # licensedContent = True means Content ID has claimed this video
        licensed = content_details.get("licensedContent", False)

        # Check upload status for additional info
        upload_status = status.get("uploadStatus", "unknown")
        privacy = status.get("privacyStatus", "unknown")
        rejection_reason = status.get("rejectionReason", None)

        result = {
            "videoId": video_id,
            "found": True,
            "title": snippet.get("title", "Unknown"),
            "publishedAt": snippet.get("publishedAt", "Unknown"),
            "privacy": privacy,
            "uploadStatus": upload_status,
            "licensedContent": licensed,
            "copyrightClaimed": licensed,
            "rejectionReason": rejection_reason,
            "checkedAt": datetime.now().isoformat(),
        }

        # Determine safety status
        if licensed:
            result["status"] = "⚠️ CLAIMED"
            result["message"] = "This video has been claimed by a Content ID partner. Revenue may be shared or the video may be blocked in some regions."
            result["recommendations"] = [
                "Check YouTube Studio for specific claim details",
                "Consider replacing the flagged music track",
                "File a dispute if you believe the claim is incorrect",
                "Use verified royalty-free music from our library"
            ]
        elif rejection_reason:
            result["status"] = "❌ REJECTED"
            result["message"] = f"Video was rejected: {rejection_reason}"
            result["recommendations"] = [
                "Review YouTube's copyright policies",
                "Re-upload with copyright-safe assets"
            ]
        else:
            result["status"] = "✅ SAFE"
            result["message"] = "No copyright claims detected. Safe for monetization."
            result["recommendations"] = []

        return result

    except Exception as e:
        return {
            "videoId": video_id,
            "found": False,
            "error": str(e)
        }


def get_channel_videos(youtube, max_results=50):
    """Get recent video IDs from the channel."""
    if not CHANNEL_ID:
        print("❌ YOUTUBE_CHANNEL_ID not set in .env")
        sys.exit(1)

    request = youtube.search().list(
        part="id",
        channelId=CHANNEL_ID,
        type="video",
        order="date",
        maxResults=max_results
    )
    response = request.execute()

    return [item["id"]["videoId"] for item in response.get("items", [])]


def print_report(results):
    """Print a formatted copyright report."""
    print("\n" + "=" * 60)
    print("📋 YouTube Copyright Report")
    print(f"   Checked at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    safe_count = sum(1 for r in results if r.get("status") == "✅ SAFE")
    claimed_count = sum(1 for r in results if r.get("copyrightClaimed"))
    error_count = sum(1 for r in results if not r.get("found"))

    print(f"\n   Total: {len(results)} | ✅ Safe: {safe_count} | ⚠️ Claimed: {claimed_count} | ❌ Errors: {error_count}\n")

    for result in results:
        if not result.get("found"):
            print(f"   ❌ {result['videoId']} — {result.get('error', 'Unknown error')}")
            continue

        status_icon = result.get("status", "?")
        title = result.get("title", "Unknown")[:50]
        print(f"   {status_icon} {result['videoId']} — {title}")

        if result.get("copyrightClaimed"):
            print(f"      └─ {result['message']}")
            for rec in result.get("recommendations", []):
                print(f"         • {rec}")

    print("\n" + "=" * 60)

    # Save report to JSON
    report_file = f"copyright-report-{datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    with open(report_file, "w") as f:
        json.dump({
            "generatedAt": datetime.now().isoformat(),
            "summary": {
                "total": len(results),
                "safe": safe_count,
                "claimed": claimed_count,
                "errors": error_count
            },
            "results": results
        }, f, indent=2)
    print(f"📄 Report saved: {report_file}")


def main():
    parser = argparse.ArgumentParser(description="YouTube Copyright Monitor")
    parser.add_argument("--video-id", help="Check a single video ID")
    parser.add_argument("--video-ids", help="Comma-separated video IDs")
    parser.add_argument("--channel", action="store_true", help="Check recent channel videos")
    parser.add_argument("--max", type=int, default=50, help="Max videos for channel mode")
    args = parser.parse_args()

    youtube = get_youtube_service()
    video_ids = []

    if args.video_id:
        video_ids = [args.video_id]
    elif args.video_ids:
        video_ids = [v.strip() for v in args.video_ids.split(",")]
    elif args.channel:
        print("📡 Fetching recent channel videos...")
        video_ids = get_channel_videos(youtube, args.max)
        print(f"   Found {len(video_ids)} videos")
    else:
        parser.print_help()
        print("\n💡 Examples:")
        print("   python youtube-copyright-monitor.py --video-id dQw4w9WgXcQ")
        print("   python youtube-copyright-monitor.py --channel --max 20")
        sys.exit(0)

    print(f"\n🔍 Checking {len(video_ids)} video(s) for copyright claims...")
    results = [check_video_copyright(youtube, vid) for vid in video_ids]
    print_report(results)


if __name__ == "__main__":
    main()
