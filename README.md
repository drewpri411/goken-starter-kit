# Goken Starter Kit

A Next.js starter kit showcasing Goken's Text-to-Speech API with both HTTP streaming and WebSocket voice agent capabilities.

## Features

### HTTP Audio Streaming
- Real-time text-to-speech conversion via HTTP POST
- Voice selection (Puck/Sarah)
- Adjustable playback speed (0.5x - 2.0x)
- PCM audio format (24kHz, float32 LE)

### Voice Agent
- WebSocket-based real-time voice interaction
- Speech recognition integration
- Live audio visualization during recording
- Automatic transcript-to-speech conversion
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
NEXT_PUBLIC_GOKEN_API_KEY=kk_your_api_key_here
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
goken-starter-kit/
├── app/
│   ├── page.tsx                 # Main page
│   ├── layout.tsx               # Root layout
│   └── globals.css              # Global styles
├── components/
│   ├── playground/
│   │   └── goken-starter-kit.tsx  # Main demo component
│   └── ui/
│       ├── http-audio-streaming.tsx  # HTTP TTS component
│       └── voice-agent.tsx           # WebSocket voice agent
├── lib/
│   └── utils.ts                 # Utility functions
└── .env.local                   # Environment variables (create this)
```

## API Endpoints

### HTTP Streaming
- **Endpoint**: `POST https://smirksteveyt--goken-web-app.modal.run/stream`
- **Headers**: `X-API-Key: your_api_key`
- **Body**:
```json
{
  "text": "Your text here",
  "voice": "am_puck",
  "speed": 1.0
}
```

### WebSocket Streaming
- **Endpoint**: `wss://smirksteveyt--goken-web-app.modal.run/ws/tts`
- **Auth Flow**:
  1. Connect to WebSocket
  2. Receive `{"event": "auth_required"}`
  3. Send `{"api_key": "kk_xxxxxxxx"}`
  4. Receive `{"event": "ready"}`
- **TTS Request**:
```json
{
  "text": "Your text here",
  "voice": "am_puck",
  "speed": 1.0
}
```

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
