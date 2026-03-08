# Architecture Overview

The app is a **stem splitter and mixer** with a beginner-friendly default page and an optional **Advanced DAW** page. Stem separation runs **CPU-only** (no GPU).

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Browser                           │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │              React Frontend (Port 5173)                     │ │
│  │                                                              │ │
│  │  Components:                                                │ │
│  │  • StemSplitter.tsx  - Upload & split UI                   │ │
│  │  • Timeline.tsx      - Waveform display                    │ │
│  │  • MixerPanel.tsx    - Volume, pan, EQ controls            │ │
│  │  • TransportBar.tsx  - Play/pause/export                   │ │
│  │                                                              │ │
│  │  Audio Engine:                                              │ │
│  │  • Web Audio API     - Real-time playback & effects        │ │
│  │  • OfflineAudioContext - WAV export rendering              │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              │ HTTP/Fetch API                     │
│                              ▼                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Node.js API Server (Port 3001)                │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Express.js Routes                        │ │
│  │                                                              │ │
│  │  /api/stems/split                                           │ │
│  │  • Receives file upload (multer)                            │ │
│  │  • Forwards to Python service                               │ │
│  │  • Returns job ID & stem URLs                               │ │
│  │                                                              │ │
│  │  /api/stems/download/:jobId/:stemName                       │ │
│  │  • Proxies stem downloads from Python                       │ │
│  │  • Streams file to browser                                  │ │
│  │                                                              │ │
│  │  /api/stems/health                                          │ │
│  │  • Checks Python service status                             │ │
│  │  • Returns system health                                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              │ HTTP                               │
│                              ▼                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  Python AI Service (Port 5000)                   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      Flask API                              │ │
│  │                                                              │ │
│  │  POST /split                                                │ │
│  │  • Receives audio file                                      │ │
│  │  • Loads into PyTorch tensor                                │ │
│  │  • Applies Demucs model                                     │ │
│  │  • Saves 4 stem files                                       │ │
│  │  • Returns job ID & paths                                   │ │
│  │                                                              │ │
│  │  GET /download/:jobId/:stemName                             │ │
│  │  • Serves stem WAV file                                     │ │
│  │                                                              │ │
│  │  DELETE /cleanup/:jobId                                     │ │
│  │  • Removes processed files                                  │ │
│  └────────────────────────────────────────────────────────────┘ │
│                              │                                    │
│                              ▼                                    │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                    Demucs AI Model                          │ │
│  │                                                              │ │
│  │  Model: htdemucs (Hybrid Transformer Demucs)               │ │
│  │  • 4-stem separation                                        │ │
│  │  • State-of-the-art quality                                 │ │
│  │  • CPU-only processing (no GPU)                              │ │
│  │                                                              │ │
│  │  Output Stems:                                              │ │
│  │  1. Drums    - All percussion                               │ │
│  │  2. Bass     - Bass instruments                             │ │
│  │  3. Vocals   - All vocals                                   │ │
│  │  4. Other    - Everything else                              │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                         File System                              │
│                                                                   │
│  server/uploads/          - Temporary uploaded files             │
│  server/stems_output/     - Generated stem files                 │
│  └── {job_id}/                                                   │
│      ├── drums.wav                                               │
│      ├── bass.wav                                                │
│      ├── vocals.wav                                              │
│      └── other.wav                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Upload & Split

```
User selects file
    │
    ▼
Frontend: StemSplitter.tsx
    │ FormData with audio file
    ▼
Node API: POST /api/stems/split
    │ Multer saves to uploads/
    │ Forward file to Python
    ▼
Python: POST /split
    │ Load audio with torchaudio
    │ Resample to 44.1kHz
    │ Convert to stereo
    ▼
Demucs Model
    │ Process through neural network
    │ Separate into 4 sources
    ▼
Python: Save stems
    │ Write 4 WAV files
    │ Return job_id & paths
    ▼
Node API: Return to frontend
    │ Convert paths to download URLs
    ▼
Frontend: Display stems
```

### 2. Download Stems

```
User clicks download
    │
    ▼
Frontend: Fetch stem URL
    │
    ▼
Node API: GET /api/stems/download/:jobId/:stemName
    │ Proxy request to Python
    ▼
Python: GET /download/:jobId/:stemName
    │ Read WAV file from disk
    │ Stream to Node API
    ▼
Node API: Stream to browser
    │
    ▼
Frontend: Receive file
    │ Browser triggers download
    ▼
User has stem file
```

### 3. Load to Tracks

```
User clicks "Load to Tracks"
    │
    ▼
Frontend: For each stem
    │ Fetch stem file
    │ Decode with Web Audio API
    ▼
AudioEngine: Register buffer
    │ Store in audioBufferRegistry
    ▼
DAW Store: Create track
    │ Add track with stem name
    │ Add clip with audio buffer
    ▼
Timeline: Display waveform
    │ Render audio visualization
    ▼
User can play & mix
```

### 4. Mix & Export

```
User adjusts mixer controls
    │
    ▼
AudioEngine: Update track nodes
    │ Set gain, pan, EQ values
    │ Apply effects in real-time
    ▼
User clicks export
    │
    ▼
MixdownExporter: renderOffline()
    │ Create OfflineAudioContext
    │ Schedule all audio buffers
    │ Apply track settings
    │ Render to buffer
    ▼
audioBufferToWavBlob()
    │ Convert to WAV format
    │ Create Blob
    ▼
triggerDownload()
    │ Create download link
    │ Trigger browser download
    ▼
User has final mix
```

## Technology Stack Details

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Zustand** - State management
- **Tailwind CSS** - Styling
- **Web Audio API** - Audio playback & effects
- **OfflineAudioContext** - WAV rendering

### Backend (Node)
- **Express** - Web framework
- **Multer** - File upload handling
- **CORS** - Cross-origin requests
- **TypeScript** - Type safety
- **tsx** - TypeScript execution

### Backend (Python)
- **Flask** - Web framework
- **Flask-CORS** - Cross-origin requests
- **Demucs 4.0** - Stem separation model
- **PyTorch 2.1** - Deep learning framework
- **Torchaudio** - Audio processing
- **NumPy** - Numerical operations

## Processing Pipeline

### Audio Processing Steps

1. **Input Validation**
   - Check file format
   - Check file size (< 100MB)
   - Verify audio codec

2. **Audio Loading**
   - Load with torchaudio
   - Get sample rate & channels
   - Load into tensor

3. **Preprocessing**
   - Resample to 44.1kHz (if needed)
   - Convert to stereo (if mono)
   - Normalize audio levels

4. **Stem Separation**
   - Load Demucs model (htdemucs)
   - Move audio to GPU (if available)
   - Apply model inference
   - Get 4 source tensors

5. **Postprocessing**
   - Convert tensors to audio
   - Save as WAV files
   - Calculate file sizes

6. **Cleanup**
   - Delete input file
   - Keep stems for download
   - Auto-cleanup after 1 hour (optional)

## Performance Characteristics

### CPU Processing (t4g.medium)
- Model loading: 5-10 seconds (first time)
- Processing: 2-5 minutes per song
- Memory: 2-4GB peak
- Disk I/O: Moderate

### GPU Processing (g4dn.xlarge)
- Model loading: 2-3 seconds (first time)
- Processing: 30-60 seconds per song
- Memory: 4-8GB peak
- GPU memory: 2-4GB

### Bottlenecks
1. **Model inference** - 80% of processing time
2. **File I/O** - 10% of processing time
3. **Audio resampling** - 5% of processing time
4. **Network transfer** - 5% of processing time

## Scalability Considerations

### Current Architecture (Single Server)
- Handles: 1 request at a time
- Queue: In-memory (lost on restart)
- Storage: Local disk
- Limits: CPU/GPU availability

### Future Enhancements

1. **Add Redis Queue**
   - Async job processing
   - Multiple workers
   - Persistent queue

2. **Add S3 Storage**
   - Offload file storage
   - CDN distribution
   - Automatic cleanup

3. **Add Load Balancer**
   - Multiple Python workers
   - Horizontal scaling
   - Health checks

4. **Add Database**
   - Job tracking
   - User accounts
   - Usage analytics

## Security Considerations

### Current Implementation
- File size limits (100MB)
- File type validation
- CORS enabled (development)
- No authentication

### Production Recommendations
1. Add authentication (JWT)
2. Rate limiting (per user/IP)
3. File scanning (malware)
4. HTTPS only
5. Input sanitization
6. Secure file storage
7. API key management

## Monitoring & Logging

### Current Logging
- Console logs (development)
- Error messages
- Processing status

### Production Recommendations
1. Structured logging (JSON)
2. Log aggregation (CloudWatch)
3. Error tracking (Sentry)
4. Performance monitoring (New Relic)
5. Uptime monitoring (Pingdom)
6. Cost tracking (AWS Cost Explorer)

## Deployment Architecture (EC2)

```
┌─────────────────────────────────────────────────────────────┐
│                      Internet                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   Route 53 (DNS)                             │
│              stems.yourdomain.com                            │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              CloudFront (CDN) - Optional                     │
│              • SSL/TLS termination                           │
│              • Static asset caching                          │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  Application Load Balancer                   │
│              • Health checks                                 │
│              • SSL/TLS termination                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    EC2 Instance                              │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Nginx (Reverse Proxy)                    │   │
│  │  • Port 80/443 → 5173 (Frontend)                     │   │
│  │  • /api → 3001 (Node API)                            │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         PM2 Process Manager                           │   │
│  │  • Node API (port 3001)                              │   │
│  │  • Python Service (port 5000)                        │   │
│  │  • Frontend (port 5173)                              │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         File System                                   │   │
│  │  /var/www/stems/uploads                              │   │
│  │  /var/www/stems/output                               │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              S3 (Optional - Long-term storage)               │
│              • Processed stems                               │
│              • User uploads                                  │
└─────────────────────────────────────────────────────────────┘
```

## Cost Optimization

### Development
- Local machine: $0/month
- Testing: Free

### Production (Low Volume)
- t4g.medium: $24/month
- 100GB storage: $10/month
- Data transfer: $5-10/month
- **Total: ~$40/month**

### Production (High Volume)
- g4dn.xlarge: $380/month
- 500GB storage: $50/month
- Data transfer: $50-100/month
- Load balancer: $20/month
- **Total: ~$500/month**

### Optimization Strategies
1. Use spot instances (70% cheaper)
2. Auto-scaling (scale down when idle)
3. S3 lifecycle policies (delete old files)
4. CloudFront caching (reduce bandwidth)
5. Reserved instances (1-year commit)
