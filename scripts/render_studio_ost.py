#!/usr/bin/env python3
import math
import struct
import wave
import subprocess
import os
import random

SAMPLE_RATE = 44100

def clamp(val, low=-1.0, high=1.0):
    return max(low, min(high, val))

class AudioBuffer:
    def __init__(self, duration_sec):
        self.num_samples = int(duration_sec * SAMPLE_RATE)
        self.left = [0.0] * self.num_samples
        self.right = [0.0] * self.num_samples

    def add_sample(self, idx, l, r):
        if 0 <= idx < self.num_samples:
            self.left[idx] += l
            self.right[idx] += r

    def export_wav(self, filepath):
        max_amp = 0.0001
        for i in range(self.num_samples):
            if abs(self.left[i]) > max_amp:
                max_amp = abs(self.left[i])
            if abs(self.right[i]) > max_amp:
                max_amp = abs(self.right[i])
        
        gain = 0.92 / max_amp if max_amp > 0.92 else 0.95
        
        with wave.open(filepath, "w") as wf:
            wf.setnchannels(2)
            wf.setsampwidth(2)
            wf.setframerate(SAMPLE_RATE)
            frames = bytearray()
            for i in range(self.num_samples):
                l_sample = int(clamp(self.left[i] * gain) * 32767)
                r_sample = int(clamp(self.right[i] * gain) * 32767)
                frames.extend(struct.pack("<hh", l_sample, r_sample))
            wf.writeframes(frames)

def note_to_freq(midi_note):
    return 440.0 * math.pow(2.0, (midi_note - 69) / 12.0)

def synthesize_kick(buffer, start_time, vol=0.85):
    start_idx = int(start_time * SAMPLE_RATE)
    dur = 0.35
    total_samples = int(dur * SAMPLE_RATE)
    for i in range(total_samples):
        t = i / SAMPLE_RATE
        freq = 42.0 + 118.0 * math.exp(-t * 26.0)
        phase = 2.0 * math.pi * (42.0 * t - (118.0 / 26.0) * math.exp(-t * 26.0))
        amp = math.exp(-t * 12.0) * vol
        sample = math.sin(phase) * amp
        if i < int(0.005 * SAMPLE_RATE):
            sample += (random.random() * 2.0 - 1.0) * 0.4 * (1.0 - i / (0.005 * SAMPLE_RATE))
        buffer.add_sample(start_idx + i, sample, sample)

def synthesize_snare(buffer, start_time, vol=0.6):
    start_idx = int(start_time * SAMPLE_RATE)
    dur = 0.25
    total_samples = int(dur * SAMPLE_RATE)
    for i in range(total_samples):
        t = i / SAMPLE_RATE
        noise = (random.random() * 2.0 - 1.0) * math.exp(-t * 18.0)
        tone = math.sin(2.0 * math.pi * 185.0 * t) * math.exp(-t * 24.0) * 0.4
        snap = (random.random() * 2.0 - 1.0) * math.exp(-t * 40.0) * 0.5
        sample = (noise * 0.7 + tone + snap) * vol
        buffer.add_sample(start_idx + i, sample * 0.9, sample * 1.1)

def synthesize_hihat(buffer, start_time, open_hat=False, vol=0.28):
    start_idx = int(start_time * SAMPLE_RATE)
    dur = 0.28 if open_hat else 0.06
    decay = 12.0 if open_hat else 65.0
    total_samples = int(dur * SAMPLE_RATE)
    for i in range(total_samples):
        t = i / SAMPLE_RATE
        noise = (random.random() * 2.0 - 1.0)
        metallic = math.sin(2.0 * math.pi * 7800.0 * t) * 0.25 + math.sin(2.0 * math.pi * 9200.0 * t) * 0.25
        sample = (noise * 0.7 + metallic) * math.exp(-t * decay) * vol
        buffer.add_sample(start_idx + i, sample * 0.8, sample * 1.2)

def synthesize_synth_note(buffer, start_time, midi_note, dur, vol=0.35, pan=0.0, waveform="saw", delay=True):
    freq = note_to_freq(midi_note)
    start_idx = int(start_time * SAMPLE_RATE)
    base_samples = int(dur * SAMPLE_RATE)
    
    pan_l = 0.5 * (1.0 - pan)
    pan_r = 0.5 * (1.0 + pan)

    for i in range(min(base_samples, buffer.num_samples - start_idx)):
        t = i / SAMPLE_RATE
        if t < 0.015:
            env = t / 0.015
        elif t > dur - 0.05:
            env = max(0.0, (dur - t) / 0.05)
        else:
            env = 1.0 - 0.25 * ((t - 0.015) / dur)

        if waveform == "saw":
            s1 = (2.0 * ((freq * t) % 1.0) - 1.0)
            s2 = (2.0 * (((freq * 1.004) * t) % 1.0) - 1.0) * 0.6
            sample = (s1 + s2) * 0.65 * env * vol
        elif waveform == "square":
            s1 = 1.0 if (freq * t) % 1.0 < 0.5 else -1.0
            s2 = 1.0 if ((freq * 1.003) * t) % 1.0 < 0.48 else -1.0
            sample = (s1 + s2 * 0.7) * 0.5 * env * vol
        elif waveform == "pad":
            sample = (math.sin(2.0 * math.pi * freq * t) * 0.6 +
                      math.sin(2.0 * math.pi * (freq * 2.0) * t) * 0.25 +
                      math.sin(2.0 * math.pi * (freq * 1.005) * t) * 0.3) * env * vol
        else:
            sample = math.sin(2.0 * math.pi * freq * t) * env * vol

        buffer.add_sample(start_idx + i, sample * pan_l, sample * pan_r)

        if delay:
            delay_offset = int(0.24 * SAMPLE_RATE)
            delay_idx = start_idx + i + delay_offset
            if delay_idx < buffer.num_samples:
                buffer.add_sample(delay_idx, sample * pan_r * 0.32, sample * pan_l * 0.32)
            delay_idx2 = start_idx + i + delay_offset * 2
            if delay_idx2 < buffer.num_samples:
                buffer.add_sample(delay_idx2, sample * pan_l * 0.16, sample * pan_r * 0.16)

def synthesize_bass_note(buffer, start_time, midi_note, dur, vol=0.55):
    freq = note_to_freq(midi_note)
    start_idx = int(start_time * SAMPLE_RATE)
    total_samples = int(dur * SAMPLE_RATE)
    for i in range(min(total_samples, buffer.num_samples - start_idx)):
        t = i / SAMPLE_RATE
        env = math.exp(-t * 3.5)
        sub = math.sin(2.0 * math.pi * (freq * 0.5) * t) * 0.7
        main_saw = (2.0 * ((freq * t) % 1.0) - 1.0) * 0.5
        sample = (sub + main_saw) * env * vol
        buffer.add_sample(start_idx + i, sample, sample)

def render_track_01_neon_grid():
    bpm = 116.0
    beat_dur = 60.0 / bpm
    total_bars = 16
    total_dur = total_bars * 4.0 * beat_dur
    buf = AudioBuffer(total_dur)

    chord_prog = [
        ([57, 60, 64], 45),
        ([53, 57, 60], 41),
        ([48, 52, 55], 36),
        ([55, 59, 62], 43),
    ]

    arp_patterns = [
        [69, 72, 76, 81, 76, 72, 69, 72],
        [65, 69, 72, 77, 72, 69, 65, 69],
        [60, 64, 67, 72, 67, 64, 60, 64],
        [67, 71, 74, 79, 74, 71, 67, 71],
    ]

    for bar in range(total_bars):
        chord_idx = (bar // 2) % 4
        chord_notes, bass_root = chord_prog[chord_idx]
        bar_start = bar * 4.0 * beat_dur

        for beat in range(4):
            t_beat = bar_start + beat * beat_dur
            synthesize_kick(buf, t_beat, vol=0.8)
            if beat in (1, 3):
                synthesize_snare(buf, t_beat, vol=0.65)
            for sub in range(4):
                t_sub = t_beat + sub * (beat_dur / 4.0)
                synthesize_hihat(buf, t_sub, open_hat=(sub == 2), vol=0.22 if sub == 0 else 0.15)

        for eighth in range(8):
            t_bass = bar_start + eighth * (beat_dur / 2.0)
            note = bass_root + (12 if eighth % 2 == 1 else 0)
            synthesize_bass_note(buf, t_bass, note, beat_dur * 0.45, vol=0.55)

        if bar % 2 == 0:
            for n in chord_notes:
                synthesize_synth_note(buf, bar_start, n, beat_dur * 7.5, vol=0.22, pan=(chord_notes.index(n) - 1) * 0.4, waveform="pad", delay=False)

        arp = arp_patterns[chord_idx]
        for step in range(16):
            t_step = bar_start + step * (beat_dur / 4.0)
            note = arp[step % len(arp)]
            pan = math.sin(step * 0.7) * 0.6
            synthesize_synth_note(buf, t_step, note, beat_dur * 0.22, vol=0.28, pan=pan, waveform="saw", delay=True)

    return buf

def render_track_02_deep_orbit():
    bpm = 92.0
    beat_dur = 60.0 / bpm
    total_bars = 16
    total_dur = total_bars * 4.0 * beat_dur
    buf = AudioBuffer(total_dur)

    chords = [
        ([62, 65, 69, 72, 76], 38),
        ([58, 62, 65, 69, 70], 34),
        ([55, 58, 62, 65, 69], 31),
        ([57, 62, 64, 69],     33),
    ]

    lead_melody = [
        (0.0, 74, 2.5), (3.0, 76, 1.5), (5.0, 77, 3.0), (9.0, 76, 2.0),
        (12.0, 74, 3.5), (16.0, 72, 2.5), (19.0, 70, 2.0), (22.0, 69, 4.0),
        (28.0, 72, 3.0), (32.0, 74, 4.0), (38.0, 77, 3.5), (42.0, 81, 4.0)
    ]

    for bar in range(total_bars):
        c_idx = (bar // 4) % len(chords)
        chord_notes, bass_root = chords[c_idx]
        bar_start = bar * 4.0 * beat_dur

        if bar >= 2:
            synthesize_kick(buf, bar_start, vol=0.6)
            synthesize_kick(buf, bar_start + 2.5 * beat_dur, vol=0.45)
            synthesize_snare(buf, bar_start + 2.0 * beat_dur, vol=0.35)
            for h in range(8):
                t_hat = bar_start + h * (beat_dur / 2.0)
                synthesize_hihat(buf, t_hat, open_hat=(h == 4), vol=0.12)

        if bar % 2 == 0:
            synthesize_bass_note(buf, bar_start, bass_root, beat_dur * 7.8, vol=0.6)

        if bar % 4 == 0:
            for idx, n in enumerate(chord_notes):
                pan = -0.6 + (1.2 / len(chord_notes)) * idx
                synthesize_synth_note(buf, bar_start, n, beat_dur * 15.0, vol=0.18, pan=pan, waveform="pad", delay=True)

    for start_beat, note, dur_beats in lead_melody:
        t_note = start_beat * beat_dur
        if t_note < total_dur:
            synthesize_synth_note(buf, t_note, note, dur_beats * beat_dur, vol=0.32, pan=0.2, waveform="pad", delay=True)

    return buf

def render_track_03_void_cyberpunk():
    bpm = 128.0
    beat_dur = 60.0 / bpm
    total_bars = 16
    total_dur = total_bars * 4.0 * beat_dur
    buf = AudioBuffer(total_dur)

    cyber_lead = [
        (0.0, 64), (1.0, 65), (2.5, 67), (3.5, 68),
        (4.0, 72), (5.5, 71), (6.0, 68), (7.0, 67),
        (8.0, 76), (9.5, 74), (10.0, 72), (11.5, 71),
        (12.0, 68), (13.0, 67), (14.0, 65), (15.0, 64)
    ]

    for bar in range(total_bars):
        bar_start = bar * 4.0 * beat_dur

        for beat in range(4):
            t_beat = bar_start + beat * beat_dur
            synthesize_kick(buf, t_beat, vol=0.92)
            if beat in (1, 3):
                synthesize_snare(buf, t_beat, vol=0.78)
            synthesize_hihat(buf, t_beat + beat_dur * 0.5, open_hat=True, vol=0.28)
            synthesize_hihat(buf, t_beat + beat_dur * 0.25, open_hat=False, vol=0.18)
            synthesize_hihat(buf, t_beat + beat_dur * 0.75, open_hat=False, vol=0.18)

        for sixteenth in range(16):
            t_six = bar_start + sixteenth * (beat_dur / 4.0)
            base_midi = 40 if (sixteenth < 8) else (41 if (bar % 2 == 0) else 38)
            if sixteenth % 2 == 0:
                synthesize_bass_note(buf, t_six, base_midi, beat_dur * 0.22, vol=0.65)
            else:
                synthesize_synth_note(buf, t_six, base_midi + 12, beat_dur * 0.18, vol=0.35, pan=-0.3, waveform="square", delay=False)

        synthesize_synth_note(buf, bar_start, 52, beat_dur * 0.8, vol=0.38, pan=0.4, waveform="saw", delay=True)
        synthesize_synth_note(buf, bar_start, 56, beat_dur * 0.8, vol=0.32, pan=-0.4, waveform="saw", delay=True)

    for beat_pos, note in cyber_lead:
        t_lead = (beat_pos * 2.0) * beat_dur
        if t_lead < total_dur:
            pan = math.sin(beat_pos) * 0.5
            synthesize_synth_note(buf, t_lead, note, beat_dur * 0.8, vol=0.42, pan=pan, waveform="saw", delay=True)

    return buf

def main():
    tracks = [
        ("track-01-neon-grid", "Track 01: Neon Grid", render_track_01_neon_grid),
        ("track-02-deep-orbit", "Track 02: Deep Orbit", render_track_02_deep_orbit),
        ("track-03-void-cyberpunk", "Track 03: Void Cyberpunk", render_track_03_void_cyberpunk),
    ]

    out_dir = "/home/omrano-the-scoprion/Projects/omraneelit.github.io/assets/audio"
    os.makedirs(out_dir, exist_ok=True)

    for filename_base, title, render_func in tracks:
        print(f"Synthesizing {title}...")
        buf = render_func()
        wav_path = f"/tmp/{filename_base}.wav"
        mp3_path = f"{out_dir}/{filename_base}.mp3"
        ogg_path = f"{out_dir}/{filename_base}.ogg"
        
        buf.export_wav(wav_path)
        print(f"Exported WAV to {wav_path}")

        cmd_mp3 = [
            "ffmpeg", "-y", "-i", wav_path,
            "-af", "acompressor=threshold=-12dB:ratio=2.5:attack=5:release=50",
            "-b:a", "192k",
            mp3_path
        ]
        subprocess.run(cmd_mp3, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"Generated MP3: {mp3_path}")

        cmd_ogg = [
            "ffmpeg", "-y", "-i", wav_path,
            "-b:a", "160k",
            ogg_path
        ]
        subprocess.run(cmd_ogg, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"Generated OGG: {ogg_path}")

        if os.path.exists(wav_path):
            os.remove(wav_path)

    print("\nAll 3 studio soundtrack tracks generated successfully!")

if __name__ == "__main__":
    main()
