import os
import sys
from datetime import datetime, timedelta
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = [
    'https://www.googleapis.com/auth/youtube.readonly',
    'https://www.googleapis.com/auth/yt-analytics.readonly',
]

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TOKEN_PATH = os.path.join(SCRIPT_DIR, 'token.json')
CREDS_PATH = os.path.join(SCRIPT_DIR, 'credentials.json')
ANALYTICS_DIR = SCRIPT_DIR


def authenticate():
    creds = None
    if os.path.exists(TOKEN_PATH):
        creds = Credentials.from_authorized_user_file(TOKEN_PATH, SCOPES)
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDS_PATH):
                print(f"ERROR: credentials.json not found at {CREDS_PATH}")
                print("Follow SETUP.md to download your credentials file.")
                sys.exit(1)
            flow = InstalledAppFlow.from_client_secrets_file(CREDS_PATH, SCOPES)
            creds = flow.run_local_server(port=0)
        with open(TOKEN_PATH, 'w') as f:
            f.write(creds.to_json())
    return creds


def get_channel_info(youtube):
    r = youtube.channels().list(part='id,snippet,statistics', mine=True).execute()
    item = r['items'][0]
    return {
        'id': item['id'],
        'name': item['snippet']['title'],
        'total_views': int(item['statistics'].get('viewCount', 0)),
        'total_subscribers': item['statistics'].get('subscriberCount', 'Hidden'),
        'total_videos': int(item['statistics'].get('videoCount', 0)),
    }


def get_metrics(yta, channel_id, start_date, end_date):
    try:
        r = yta.reports().query(
            ids=f'channel=={channel_id}',
            startDate=start_date,
            endDate=end_date,
            metrics='views,estimatedMinutesWatched,averageViewDuration,subscribersGained,subscribersLost,likes,shares',
        ).execute()
        row = r.get('rows', [[0] * 7])[0]
        return {
            'views': int(row[0]),
            'watch_time_hours': round(float(row[1]) / 60, 2),
            'avg_view_duration_sec': float(row[2]),
            'subscribers_gained': int(row[3]),
            'subscribers_lost': int(row[4]),
            'likes': int(row[5]),
            'shares': int(row[6]),
        }
    except Exception as e:
        print(f"Warning: could not fetch metrics — {e}")
        return {}


def get_traffic_sources(yta, channel_id, start_date, end_date):
    try:
        r = yta.reports().query(
            ids=f'channel=={channel_id}',
            startDate=start_date,
            endDate=end_date,
            metrics='views',
            dimensions='insightTrafficSourceType',
            sort='-views',
        ).execute()
        sources = []
        for row in r.get('rows', []):
            sources.append({'source': row[0], 'views': int(row[1])})
        return sources
    except Exception as e:
        print(f"Warning: could not fetch traffic sources — {e}")
        return []


def get_top_videos(yta, channel_id, start_date, end_date, limit=10):
    try:
        r = yta.reports().query(
            ids=f'channel=={channel_id}',
            startDate=start_date,
            endDate=end_date,
            metrics='views,estimatedMinutesWatched,averageViewDuration,likes',
            dimensions='video',
            sort='-views',
            maxResults=limit,
        ).execute()
        return r.get('rows', [])
    except Exception as e:
        print(f"Warning: could not fetch top videos — {e}")
        return []


def get_video_details(youtube, video_ids):
    if not video_ids:
        return {}
    r = youtube.videos().list(part='snippet,contentDetails', id=','.join(video_ids)).execute()
    result = {}
    for item in r.get('items', []):
        duration_iso = item['contentDetails'].get('duration', 'PT0S')
        result[item['id']] = {
            'title': item['snippet']['title'],
            'duration': parse_iso_duration(duration_iso),
        }
    return result


def parse_iso_duration(iso):
    import re
    m = re.match(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', iso)
    if not m:
        return 0
    h, mn, s = (int(x) if x else 0 for x in m.groups())
    return h * 3600 + mn * 60 + s


def get_all_uploads(youtube):
    r = youtube.channels().list(part='contentDetails', mine=True).execute()
    playlist_id = r['items'][0]['contentDetails']['relatedPlaylists']['uploads']
    videos = []
    next_page = None
    while True:
        pl = youtube.playlistItems().list(
            part='snippet',
            playlistId=playlist_id,
            maxResults=50,
            pageToken=next_page,
        ).execute()
        for item in pl['items']:
            snippet = item['snippet']
            videos.append({
                'id': snippet['resourceId']['videoId'],
                'title': snippet['title'],
                'published': snippet['publishedAt'][:10],
            })
        next_page = pl.get('nextPageToken')
        if not next_page:
            break
    return videos


def fmt_duration(seconds):
    m = int(seconds // 60)
    s = int(seconds % 60)
    return f"{m}m {s}s"


def build_report(channel, metrics_7d, metrics_28d, top_videos, traffic, uploads, today_str):
    lines = []
    a = lines.append

    a(f"# YouTube Analytics Report — I Could Be Wrong")
    a(f"**Generated:** {today_str}  ")
    a(f"**Channel:** {channel['name']}  ")
    a(f"**Total videos:** {channel['total_videos']} | **Total views (all time):** {channel['total_views']:,} | **Subscribers:** {channel['total_subscribers']}")
    a("")
    a("---")
    a("")
    a("## Last 7 Days")
    a("")
    a("| Metric | Value |")
    a("|---|---|")
    a(f"| Views | {metrics_7d.get('views', 0):,} |")
    a(f"| Watch Time | {metrics_7d.get('watch_time_hours', 0)} hours |")
    a(f"| Avg View Duration | {fmt_duration(metrics_7d.get('avg_view_duration_sec', 0))} |")
    a(f"| Subscribers Gained | {metrics_7d.get('subscribers_gained', 0):+} |")
    a(f"| Subscribers Lost | {metrics_7d.get('subscribers_lost', 0)} |")
    a(f"| Likes | {metrics_7d.get('likes', 0):,} |")
    a(f"| Shares | {metrics_7d.get('shares', 0):,} |")
    a("")
    a("---")
    a("")
    a("## Last 28 Days")
    a("")
    a("| Metric | Value |")
    a("|---|---|")
    a(f"| Views | {metrics_28d.get('views', 0):,} |")
    a(f"| Watch Time | {metrics_28d.get('watch_time_hours', 0)} hours |")
    a(f"| Avg View Duration | {fmt_duration(metrics_28d.get('avg_view_duration_sec', 0))} |")
    a(f"| Subscribers Gained | {metrics_28d.get('subscribers_gained', 0):+} |")
    a(f"| Subscribers Lost | {metrics_28d.get('subscribers_lost', 0)} |")
    a(f"| Likes | {metrics_28d.get('likes', 0):,} |")
    a(f"| Shares | {metrics_28d.get('shares', 0):,} |")
    a("")
    a("---")
    a("")
    a("## Top Videos — Last 28 Days")
    a("")
    a("| Title | Duration | Views | Watch Time | Avg Duration | Likes |")
    a("|---|---|---|---|---|---|")
    for row in top_videos:
        dur = fmt_duration(row.get('duration', 0))
        a(f"| {row.get('title', row['id'])} | {dur} | {int(row['views']):,} | {round(float(row['watch_time']) / 60, 1)}h | {fmt_duration(float(row['avg_duration']))} | {int(row['likes']):,} |")
    a("")
    a("---")
    a("")
    a("## Traffic Sources — Last 28 Days")
    a("")
    a("| Source | Views |")
    a("|---|---|")
    for s in traffic:
        a(f"| {s['source']} | {s['views']:,} |")
    a("")
    a("---")
    a("")
    a("## All Uploads")
    a("")
    a("| Title | Published |")
    a("|---|---|")
    for v in uploads:
        a(f"| {v['title']} | {v['published']} |")
    a("")
    a("---")
    a("")
    a("*To analyse: open Claude Code and say \"analyse my latest analytics report\"*")

    return "\n".join(lines)


def main():
    today = datetime.now()
    today_str = today.strftime('%Y-%m-%d')
    date_7d = (today - timedelta(days=7)).strftime('%Y-%m-%d')
    date_28d = (today - timedelta(days=28)).strftime('%Y-%m-%d')

    print("Authenticating...")
    creds = authenticate()
    youtube = build('youtube', 'v3', credentials=creds)
    yta = build('youtubeAnalytics', 'v2', credentials=creds)

    print("Fetching channel info...")
    channel = get_channel_info(youtube)
    print(f"Channel: {channel['name']}")

    print("Fetching 7-day metrics...")
    metrics_7d = get_metrics(yta, channel['id'], date_7d, today_str)

    print("Fetching 28-day metrics...")
    metrics_28d = get_metrics(yta, channel['id'], date_28d, today_str)

    print("Fetching top videos...")
    raw_top = get_top_videos(yta, channel['id'], date_28d, today_str)
    video_ids = [row[0] for row in raw_top]
    details = get_video_details(youtube, video_ids)
    top_videos = [
        {
            'id': row[0],
            'title': details.get(row[0], {}).get('title', row[0]),
            'duration': details.get(row[0], {}).get('duration', 0),
            'views': row[1],
            'watch_time': row[2],
            'avg_duration': row[3],
            'likes': row[4],
        }
        for row in raw_top
    ]

    print("Fetching traffic sources...")
    traffic = get_traffic_sources(yta, channel['id'], date_28d, today_str)

    print("Fetching all uploads...")
    uploads = get_all_uploads(youtube)

    print("Building report...")
    report = build_report(channel, metrics_7d, metrics_28d, top_videos, traffic, uploads, today_str)

    filename = f"{today_str}_youtube_report.md"
    output_path = os.path.join(ANALYTICS_DIR, filename)
    with open(output_path, 'w') as f:
        f.write(report)

    print(f"\nDone. Report saved to:")
    print(f"  {output_path}")
    print(f"\nOpen Claude Code and say 'analyse my latest analytics report'")


if __name__ == '__main__':
    main()
