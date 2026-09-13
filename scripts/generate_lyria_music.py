#!/usr/bin/env python3
"""
Google Gemini Music Generation Script (Lyria 3)
Generates 3 studio soundtrack audio tracks using Google Gemini's Lyria 3 model
(lyria-3-clip-preview / lyria-3-pro-preview) and outputs MP3 and OGG files into assets/audio/.

Usage:
  GEMINI_API_KEY="your-api-key" python3 scripts/generate_lyria_music.py
  OR
  python3 scripts/generate_lyria_music.py --api-key "your-api-key"
"""

import os
import sys
import json
import base64
import argparse
import urllib.request
import urllib.error
import subprocess

TRACKS = [
    {
        "id": "track-01-neon-grid",
        "title": "Track 01: Neon Grid",
        "prompt": "An upbeat retro synthwave electronic track at 116 BPM with driving analog synth bassline, punchy 808 drums, neon arpeggiators, nostalgic chords, and cyberpunk arcade groove. High fidelity stereo instrumental game soundtrack.",
        "duration": "30s"
    },
    {
        "id": "track-02-deep-orbit",
        "title": "Track 02: Deep Orbit",
        "prompt": "A cinematic deep space ambient chillout track at 92 BPM with lush floating Rhodes chords, warm sub-bass pads, subtle lo-fi rim percussion, ethereal cosmic sweeps, and serene sci-fi atmosphere. High fidelity stereo instrumental.",
        "duration": "30s"
    },
    {
        "id": "track-03-void-cyberpunk",
        "title": "Track 03: Void Cyberpunk",
        "prompt": "An aggressive dark electronic action track at 128 BPM with heavy distorted saw bass, pounding industrial beats, sharp hats, dark dystopian brass stabs, and intense cyberpunk adrenaline. Instrumental game soundtrack.",
        "duration": "30s"
    }
]

def generate_track_lyria(api_key, track_meta, out_dir, model="lyria-3-clip-preview"):
    print(f"\n[Lyria 3] Generating: {track_meta['title']}...")
    url = f"https://generativelanguage.googleapis.com/v1beta/interactions?key={api_key}"
    payload = {
        "model": model,
        "input": track_meta["prompt"]
    }
    
    headers = {
        "Content-Type": "application/json",
        "Api-Revision": "2026-05-20"
    }

    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    
    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="ignore")
        print(f"Error calling Lyria 3 API ({e.code}): {err_body}", file=sys.stderr)
        return False

    # Extract audio bytes from steps
    audio_b64 = None
    if "steps" in data:
        for step in data["steps"]:
            if step.get("type") == "model_output":
                for item in step.get("content", []):
                    if item.get("type") == "audio" and "data" in item:
                        audio_b64 = item["data"]
                        break

    if not audio_b64:
        print(f"Failed to find audio data in response: {json.dumps(data)[:200]}...", file=sys.stderr)
        return False

    audio_bytes = base64.b64decode(audio_b64)
    mp3_path = os.path.join(out_dir, f"{track_meta['id']}.mp3")
    ogg_path = os.path.join(out_dir, f"{track_meta['id']}.ogg")

    with open(mp3_path, "wb") as f:
        f.write(audio_bytes)
    print(f"Saved: {mp3_path} ({len(audio_bytes)} bytes)")

    # Also convert to OGG for broad browser support
    try:
        subprocess.run(["ffmpeg", "-y", "-i", mp3_path, "-b:a", "160k", ogg_path],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
        print(f"Converted OGG: {ogg_path}")
    except Exception as e:
        print(f"Note: OGG conversion skipped: {e}")

    return True

def main():
    parser = argparse.ArgumentParser(description="Generate studio tracks using Google Gemini Lyria 3")
    parser.add_argument("--api-key", default=os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY"),
                        help="Google Gemini API Key")
    parser.add_argument("--model", default="lyria-3-clip-preview", help="Lyria model ID (lyria-3-clip-preview or lyria-3-pro-preview)")
    args = parser.parse_args()

    if not args.api_key:
        print("ERROR: Gemini API key not found. Pass --api-key YOUR_KEY or set GEMINI_API_KEY.", file=sys.stderr)
        sys.exit(1)

    out_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "audio")
    os.makedirs(out_dir, exist_ok=True)

    success_count = 0
    for track in TRACKS:
        ok = generate_track_lyria(args.api_key, track, out_dir, model=args.model)
        if ok:
            success_count += 1

    print(f"\nCompleted: {success_count}/{len(TRACKS)} tracks generated with Gemini Lyria 3.")

if __name__ == "__main__":
    main()
