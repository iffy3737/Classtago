import os
import subprocess
import json

def get_audio_duration(audio_path):
    result = subprocess.run([
        "ffprobe", "-v", "error", "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1", audio_path
    ], capture_output=True, text=True)
    return float(result.stdout.strip())

def make_scene_clip(image, audio, output, duration):
    # Har clip ko same codec/format me banao (concat ke liye zaroori)
    subprocess.run([
        "ffmpeg", "-y",
        "-loop", "1",
        "-i", image,
        "-i", audio,
        "-c:v", "libx264",
        "-preset", "ultrafast",
        "-tune", "stillimage",
        "-c:a", "aac",
        "-b:a", "192k",
        "-ar", "44100",
        "-ac", "2",
        "-pix_fmt", "yuv420p",
        "-r", "25",
        "-t", str(duration),
        "-vf", "scale=1280:720,format=yuv420p",
        "-shortest",
        output
    ], check=True, capture_output=True)

def main():
    with open("script.json", "r", encoding="utf-8") as f:
        script = json.load(f)
    
    scenes = script if isinstance(script, list) else script["scenes"]
    
    os.makedirs("clips", exist_ok=True)
    clips = []
    
    print(f"Total {len(scenes)} clips ban rahe hain (uniform codec)...\n")
    
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
        clips.append(f"scene_{n}.mp4")
        print(f"  ✅ {clip}")
    
    # Concat list banao
    with open("clips/list.txt", "w") as f:
        for c in clips:
            f.write(f"file '{c}'\n")
    
    print("\nSaare clips jodkar final video ban rahi hai...")
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", "list.txt",
        "-c", "copy",
        "final_video.mp4"
    ], check=True, capture_output=True, cwd="clips")
    
    if os.path.exists("clips/final_video.mp4"):
        os.rename("clips/final_video.mp4", "final_video.mp4")
    
    print("\n✅ VIDEO READY: final_video.mp4")

if __name__ == "__main__":
    main()
