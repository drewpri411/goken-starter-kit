# Goken Starter Kit

A Next.js starter kit showcasing Goken's Text-to-Speech API with both HTTP streaming and WebSocket voice agent capabilities.

## Features

### HTTP Audio Streaming
- Real-time text-to-speech conversion via HTTP POST
- Voice selection (Puck/Sarah)
- Adjustable playback speed (0.5x - 2.0x)
- PCM audio format (24kHz, float32 LE)

### Voice Agent
- Real-time voice input with speech recognition
- Live audio visualization during recording
- Automatic transcript-to-speech via proxy API (no API key on client)
- Voice selection for TTS output

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Goken API key (get yours at [goken.sh](https://goken.sh))

### Installation

1. Clone the repository:
```bash
git clone https://github.com/drewpri411/goken-starter-kit.git
cd goken-starter-kit
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
# Server-only (recommended): key is never sent to the browser. Used by /api/tts/stream.
GOKEN_API_KEY=kk_your_api_key_here
```
The app proxies TTS through the Next.js API, so the key stays on the server. Do **not** use `NEXT_PUBLIC_` for the API key; that would expose it in the client bundle.

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
goken-starter-kit/
├── app/
│   ├── api/
│   │   └── tts/
│   │       └── stream/
│   │           └── route.ts     # TTS proxy (keeps API key on server)
│   ├── page.tsx                 # Main page
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
├── components/
│   ├── playground/
│   │   └── goken-starter-kit.tsx  # Main demo component
│   └── ui/
│       ├── http-audio-streaming.tsx  # HTTP TTS (uses /api/tts/stream)
│       └── voice-agent.tsx           # Voice agent (uses /api/tts/stream)
├── lib/
│   └── utils.ts                 # Utility functions
└── .env.local                   # GOKEN_API_KEY (create this)
```

## API Endpoints

The app uses a **Next.js API proxy** so the Goken API key never leaves the server.

### Proxy (used by the app)
- **Endpoint**: `POST /api/tts/stream`
- **Headers**: `Content-Type: application/json` (no API key; key is read from `GOKEN_API_KEY` on the server)
- **Body**:
```json
{
  "text": "Your text here",
  "voice": "am_puck",
  "speed": 1.0
}
```
- **Response**: Binary PCM audio (float32 LE, 24 kHz)

## Available Voices

- **Puck** (am_puck) - Male voice
- **Sarah** (af_sarah) - Female voice

## Technologies Used

- [Next.js 15](https://nextjs.org/) - React framework
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide React](https://lucide.dev/) - Icons
- Web Speech API - Speech recognition
- Web Audio API - Audio playback

## Development

### Build for production
```bash
npm run build
```

### Start production server
```bash
npm start
```

## License

MIT

## Support

For API support and documentation, visit [goken.sh](https://goken.sh)
