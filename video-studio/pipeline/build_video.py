import json
import os
import subprocess

def get_audio_duration(audio_path):
    result = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", audio_path
    ], capture_output=True, text=True)
    return float(result.stdout.strip())

def make_scene_clip(image, audio, output, duration):
    subprocess.run([
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", image,
        "-i", audio,
        "-c:v", "libx264",
        "-tune", "stillimage",
        "-c:a", "aac",
        "-b:a", "192k",
        "-pix_fmt", "yuv420p",
        "-t", str(duration),
        "-vf", "scale=1280:720,format=yuv420p",
        output
    ], check=True, capture_output=True)

def main():
    with open("script.json", "r", encoding="utf-8") as f:
        script = json.load(f)
    
    os.makedirs("clips", exist_ok=True)
    scenes = script if isinstance(script, list) else script["scenes"]
    clips = []
    
    print(f"Total {len(scenes)} clips ban rahe hain...\n")
    
    for scene in scenes:
        n = scene["scene"]
        img = f"images/scene_{n}.jpg"
        aud = f"audio/scene_{n}.mp3"
        clip = f"clips/scene_{n}.mp4"
        
        if not os.path.exists(img) or not os.path.exists(aud):
            print(f"❌ Scene {n}: file missing, skip")
            continue
        
        dur = get_audio_duration(aud)
        print(f"Scene {n}: {dur:.1f}s ki clip ban rahi hai...")
        make_scene_clip(img, aud, clip, dur)
        clips.append(clip)
        print(f"  ✅ {clip}")
    
    # Concat list banao
    with open("clips/list.txt", "w") as f:
        for c in clips:
            f.write(f"file '{os.path.basename(c)}'\n")
    
    print("\nSaare clips jodkar final video ban rahi hai...")
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", "list.txt",
        "-c:v", "libx264", "-preset", "ultrafast", "-c:a", "aac",
        "final_video.mp4"
    ], check=True, capture_output=True, cwd="clips")
    
    # Move to current dir
    if os.path.exists("clips/final_video.mp4"):
        os.rename("clips/final_video.mp4", "final_video.mp4")
    
    print("\n✅ VIDEO READY: final_video.mp4")

if __name__ == "__main__":
    main()
