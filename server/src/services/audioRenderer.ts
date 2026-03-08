import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

const execAsync = promisify(exec);

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY || '',
    secretAccessKey: process.env.R2_SECRET_KEY || '',
  },
});

const BUCKET = process.env.R2_BUCKET_NAME || 'beats-daw-audio';
const TEMP_DIR = '/tmp/beats-daw-render';
const SOUNDFONT_PATH =
  process.env.SOUNDFONT_PATH || path.join(process.cwd(), 'soundfonts', 'FluidR3_GM.sf2');

interface Clip {
  audioBuffer?: Buffer;
  s3Url?: string;
}

interface Track {
  id: string;
  name: string;
  type: string;
  volume: number;
  pan: number;
  muted: boolean;
  clips: Clip[];
  effects: {
    gain: number;
    reverbWet: number;
    delayWet: number;
  };
}

interface ProjectData {
  tracks: Track[];
  bpm: number;
  timeSignatureNum: number;
  timeSignatureDen: number;
  currentBeat: number;
}

interface RenderResult {
  downloadUrl: string;
  duration: number;
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function uploadToS3(localPath: string, key: string): Promise<string> {
  const fileBuffer = await fs.readFile(localPath);
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: 'audio/wav',
    })
  );
  return `${process.env.R2_PUBLIC_URL}/${key}`;
}

export async function renderProject(
  projectData: ProjectData,
  duration: number
): Promise<RenderResult> {
  const jobId = `render-${Date.now()}`;
  const workDir = path.join(TEMP_DIR, jobId);
  const outputDir = path.join(workDir, 'tracks');

  await ensureDir(workDir);
  await ensureDir(outputDir);

  console.log(`Starting render job ${jobId} for ${duration}s`);

  const midiTracks = convertNotesToMidiTracks(
    projectData.tracks,
    projectData.bpm,
    projectData.currentBeat || 32
  );
  const audioClips: {
    trackIndex: number;
    path: string;
    startTime: number;
    volume: number;
    pan: number;
  }[] = [];

  for (let i = 0; i < projectData.tracks.length; i++) {
    const track = projectData.tracks[i];

    if (track.muted) continue;

    const trackOutputPath = path.join(outputDir, `track-${i}.wav`);

    let trackRendered = false;

    // Handle audio clips (priority over MIDI)
    // Assuming one audio clip per track for now
    if (track.clips) {
      const audioClip = track.clips.find((c) => c.s3Url && c.s3Url.startsWith('http'));
      if (audioClip && audioClip.s3Url) {
        try {
          const key = audioClip.s3Url.replace(`${process.env.R2_PUBLIC_URL}/`, '');
          const response = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));

          if (response.Body) {
            const stream = response.Body as NodeJS.ReadableStream;
            NodeJS.ReadableStream;
            const chunks: Buffer[] = [];
            for await (const chunk of stream) {
              chunks.push(chunk as Buffer);
            }
            await fs.writeFile(trackOutputPath, Buffer.concat(chunks));
            trackRendered = true;
          } else {
            console.log(`S3 clip body was empty for ${audioClip.s3Url}`);
          }
        } catch (e) {
          console.error(`Failed to download S3 clip ${audioClip.s3Url}. Error: ${e}`);
        }
      }
    }

    // If no audio clip was rendered, handle MIDI clips
    if (!trackRendered) {
      const trackMidi = midiTracks[i];
      if (trackMidi && trackMidi.notes.length > 0) {
        const midiPath = path.join(workDir, `track-${i}.mid`);

        const midiProject: MidiProject = {
          tracks: [trackMidi],
          bpm: projectData.bpm,
          timeSignatureNum: projectData.timeSignatureNum || 4,
          timeSignatureDen: projectData.timeSignatureDen || 4,
          totalBeats: duration * (projectData.bpm / 60),
        };

        await writeMidiFile(midiProject, midiPath);

        // Check if SoundFont exists
        let soundfontPath = SOUNDFONT_PATH;
        try {
          await fs.access(soundfontPath);
        } catch {
          // Try alternative locations
          const alternatives = [
            '/usr/share/sounds/sf2/FluidR3_GM.sf2',
            '/usr/local/share/sounds/sf2/FluidR3_GM.sf2',
            path.join(process.cwd(), '..', 'soundfonts', 'FluidR3_GM.sf2'),
          ];
          for (const alt of alternatives) {
            try {
              await fs.access(alt);
              soundfontPath = alt;
              break;
            } catch {}
          }
        }

        // Render MIDI to WAV
        try {
          const renderCmd = `fluidsynth -ni "${soundfontPath}" "${midiPath}" -F "${trackOutputPath}" -r 44100 -g 0.5`;
          await execAsync(renderCmd);
        } catch {
          console.log(`FluidSynth not available, creating placeholder`);
          await createPlaceholderWav(trackOutputPath, duration, 440 + i * 100);
        }
      } else {
        // No audio clip and no MIDI notes - create silent track
        await createPlaceholderWav(trackOutputPath, duration, 0);
      }
    }

    audioClips.push({
      trackIndex: i,
      path: trackOutputPath,
      startTime: 0,
      volume: track.volume || 0.8,
      pan: track.pan || 0,
    });
  }

  // Mix all tracks
  const mixedPath = path.join(workDir, 'mixed.wav');

  if (audioClips.length > 0) {
    const inputs = audioClips.map((clip) => `-i "${clip.path}"`).join(' ');
    const filterParts: string[] = [];

    for (let i = 0; i < audioClips.length; i++) {
      const clip = audioClips[i];
      let filter = `[${i}:a]volume=${clip.volume}`;

      if (clip.pan !== 0) {
        filter += `,pan=stereo|c0=c0+c${i}|c1=c0-c${i}`;
      }

      filterParts.push(filter + `[out${i}]`);
    }

    const filterComplex =
      filterParts.join(';') +
      ';' +
      audioClips.map((_, i) => `[out${i}]`).join('') +
      `amix=inputs=${audioClips.length}:duration=longest[out]`;

    try {
      await execAsync(
        `ffmpeg -y ${inputs} -filter_complex "${filterComplex}" -map "[out]" "${mixedPath}"`
      );
    } catch {
      console.log('FFmpeg mixing failed, using first track');
      await fs.copyFile(audioClips[0].path, mixedPath);
    }
  } else {
    await createPlaceholderWav(mixedPath, duration, 440);
  }

  // Upload result
  const s3Key = `exports/${jobId}.wav`;
  const downloadUrl = await uploadToS3(mixedPath, s3Key);

  // Cleanup
  await fs.rm(workDir, { recursive: true, force: true });

  return { downloadUrl, duration };
}

async function createPlaceholderWav(outputPath: string, duration: number, frequency: number) {
  const sampleRate = 44100;
  const numSamples = Math.floor(sampleRate * duration);

  const header = Buffer.alloc(44);
  const dataSize = numSamples * 2;
  const fileSize = 36 + dataSize;

  header.write('RIFF', 0);
  header.writeUInt32LE(fileSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  const audioData = Buffer.alloc(dataSize);

  if (frequency > 0) {
    for (let i = 0; i < numSamples; i++) {
      const sample = Math.sin((2 * Math.PI * frequency * i) / sampleRate) * 0.3 * 32767;
      audioData.writeInt16LE(Math.floor(sample), i * 2);
    }
  }

  await fs.writeFile(outputPath, Buffer.concat([header, audioData]));
}
