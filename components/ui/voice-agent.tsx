"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Mic, Square } from "lucide-react";

type Voice = "am_puck" | "af_sarah";

const VOICES = [
    { id: "am_puck" as Voice, name: "Puck", gender: "Male" },
    { id: "af_sarah" as Voice, name: "Sarah", gender: "Female" },
];

const WS_URL = "wss://goken--goken-web-app.modal.run/ws/tts";

interface VoiceAgentProps {
    apiKey?: string;
    className?: string;
    visualizerBars?: number;
}

export function VoiceAgent({
    apiKey,
    className,
    visualizerBars = 48,
}: VoiceAgentProps) {
    // WebSocket State
    const [wsStatus, setWsStatus] = useState<"disconnected" | "connecting" | "ready" | "error">("disconnected");
    const [wsVoice, setWsVoice] = useState<Voice>("am_puck");
    const [transcript, setTranscript] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [time, setTime] = useState(0);
    const [isClient, setIsClient] = useState(false);
    const [audioLevels, setAudioLevels] = useState<number[]>([]);

    // WebSocket Refs
    const wsRef = useRef<WebSocket | null>(null);
    const wsAudioCtxRef = useRef<AudioContext | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const audioChunksRef = useRef<Float32Array[]>([]);
    const sampleRateRef = useRef<number>(24000);

    // Recording Refs
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        setIsClient(true);
        setAudioLevels(Array(visualizerBars).fill(0));
    }, [visualizerBars]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    // Audio Visualization
    const analyzeAudio = useCallback(() => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        const levels: number[] = [];
        const step = Math.floor(dataArray.length / visualizerBars);
        for (let i = 0; i < visualizerBars; i++) {
            const value = dataArray[i * step] / 255;
            levels.push(value);
        }
        setAudioLevels(levels);

        animationFrameRef.current = requestAnimationFrame(analyzeAudio);
    }, [visualizerBars]);

    // WebSocket Functions
    const playAudioChunks = useCallback(async () => {
        if (audioChunksRef.current.length === 0) return;

        if (!wsAudioCtxRef.current) {
            wsAudioCtxRef.current = new AudioContext({ sampleRate: sampleRateRef.current });
        }

        const totalLength = audioChunksRef.current.reduce((acc, chunk) => acc + chunk.length, 0);
        const audioBuffer = wsAudioCtxRef.current.createBuffer(1, totalLength, sampleRateRef.current);
        const channelData = audioBuffer.getChannelData(0);

        let offset = 0;
        for (const chunk of audioChunksRef.current) {
            channelData.set(chunk, offset);
            offset += chunk.length;
        }

        const source = wsAudioCtxRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(wsAudioCtxRef.current.destination);
        source.start();

        audioChunksRef.current = [];
    }, []);

    const connectWebSocket = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        setWsStatus("connecting");
        wsRef.current = new WebSocket(WS_URL);

        wsRef.current.onopen = () => {
            console.log("WebSocket connected");
        };

        wsRef.current.onmessage = async (event) => {
            if (event.data instanceof Blob) {
                const arrayBuffer = await event.data.arrayBuffer();
                const floatData = new Float32Array(arrayBuffer);
                audioChunksRef.current.push(floatData);
            } else {
                const data = JSON.parse(event.data);

                switch (data.event) {
                    case "auth_required":
                        wsRef.current?.send(JSON.stringify({
                            api_key: apiKey || process.env.NEXT_PUBLIC_GOKEN_API_KEY || ""
                        }));
                        break;
                    case "ready":
                        setWsStatus("ready");
                        break;
                    case "chunk_start":
                        sampleRateRef.current = data.sample_rate || 24000;
                        audioChunksRef.current = [];
                        break;
                    case "done":
                        setIsProcessing(false);
                        playAudioChunks();
                        break;
                    case "error":
                        setWsStatus("error");
                        console.error("WebSocket error:", data.message);
                        break;
                }
            }
        };

        wsRef.current.onerror = () => {
            setWsStatus("error");
        };

        wsRef.current.onclose = () => {
            setWsStatus("disconnected");
        };
    }, [playAudioChunks, apiKey]);

    const sendTextToTTS = useCallback((text: string) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN || wsStatus !== "ready") return;

        setIsProcessing(true);
        wsRef.current.send(JSON.stringify({
            text,
            voice: wsVoice,
            speed: 1.0
        }));
    }, [wsStatus, wsVoice]);

    // Recording Functions
    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Set up audio context for visualization
            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;

            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);

            // Set up media recorder
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.start();

            setIsRecording(true);
            setTime(0);
            setTranscript("");

            // Start timer
            timerRef.current = setInterval(() => {
                setTime((prev) => prev + 1);
            }, 1000);

            // Start audio visualization
            analyzeAudio();

            // Initialize speech recognition
            if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                recognitionRef.current = new SpeechRecognition();
                recognitionRef.current.continuous = true;
                recognitionRef.current.interimResults = true;

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                recognitionRef.current.onresult = (event: any) => {
                    let interimTranscript = '';
                    for (let i = event.resultIndex; i < event.results.length; i++) {
                        if (event.results[i].isFinal) {
                            setTranscript(prev => prev + event.results[i][0].transcript + ' ');
                        } else {
                            interimTranscript += event.results[i][0].transcript;
                        }
                    }
                };

                recognitionRef.current.start();
            }
        } catch (error) {
            console.error("Failed to start recording:", error);
        }
    }, [analyzeAudio]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
            mediaRecorderRef.current = null;
        }

        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }

        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }

        setIsRecording(false);
        setAudioLevels(Array(visualizerBars).fill(0));

        // Send the transcript to TTS
        if (transcript.trim()) {
            sendTextToTTS(transcript);
        }
    }, [visualizerBars, transcript, sendTextToTTS]);

    // Connect WebSocket on mount
    useEffect(() => {
        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, [connectWebSocket]);

    if (!isClient) return null;

    return (
        <div className={cn("flex flex-col items-center", className)}>
            {/* WebSocket Status */}
            <div className="flex items-center gap-2 mb-8">
                <div className={`w-2 h-2 rounded-full ${wsStatus === "ready" ? "bg-green-500" :
                    wsStatus === "connecting" ? "bg-yellow-500 animate-pulse" :
                        wsStatus === "error" ? "bg-red-500" :
                            "bg-white/30"
                    }`} />
                <span className="text-xs opacity-60 uppercase tracking-widest">
                    {wsStatus === "ready" ? "Connected" :
                        wsStatus === "connecting" ? "Connecting..." :
                            wsStatus === "error" ? "Error" :
                                "Disconnected"}
                </span>
                {wsStatus === "disconnected" && (
                    <button
                        onClick={connectWebSocket}
                        className="text-xs underline opacity-60 hover:opacity-100"
                    >
                        Reconnect
                    </button>
                )}
            </div>

            {/* Voice Selection */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-md mb-8">
                {VOICES.map((v) => (
                    <button
                        key={v.id}
                        onClick={() => setWsVoice(v.id)}
                        className={`p-4 text-left border transition-colors ${wsVoice === v.id
                            ? "bg-white/10 border-white/40"
                            : "border-white/10 hover:border-white/20"
                            }`}
                    >
                        <span className="text-lg mr-2">{v.gender === "Male" ? "👨" : "👩"}</span>
                        <span className="font-medium">{v.name}</span>
                        <span className="text-xs opacity-50 ml-2">{v.gender}</span>
                    </button>
                ))}
            </div>

            {/* Voice Input - Recording Button */}
            <div className="w-full flex flex-col items-center gap-4 mb-6">
                <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={cn(
                        "relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300",
                        isRecording
                            ? "bg-red-500/20 border-2 border-red-500"
                            : "bg-white/10 border-2 border-white/30 hover:bg-white/20 hover:border-white/50"
                    )}
                >
                    {isRecording ? (
                        <Square className="w-8 h-8 text-red-500 fill-red-500" />
                    ) : (
                        <Mic className="w-8 h-8 text-white" />
                    )}
                    {isRecording && (
                        <span className="absolute inset-0 rounded-full animate-ping bg-red-500/30" />
                    )}
                </button>

                {/* Timer */}
                {isRecording && (
                    <div className="text-2xl font-mono text-white/80">{formatTime(time)}</div>
                )}

                {/* Audio Visualizer */}
                {isRecording && (
                    <div className="flex items-center justify-center gap-[2px] h-16 w-full max-w-md">
                        {audioLevels.map((level, index) => (
                            <div
                                key={index}
                                className="w-1 bg-gradient-to-t from-white/40 to-white rounded-full transition-all duration-75"
                                style={{
                                    height: `${Math.max(4, level * 64)}px`,
                                }}
                            />
                        ))}
                    </div>
                )}

                {/* Status text */}
                <p className="text-xs opacity-50 uppercase tracking-widest">
                    {isRecording ? "Recording..." : "Click to record"}
                </p>
            </div>

            {/* Transcript Display */}
            {(transcript || isProcessing) && (
                <div className="w-full max-w-md p-4 bg-white/5 border border-white/15 min-h-[100px] mb-4 overflow-x-hidden overflow-y-auto">
                    {transcript || (
                        <span className="text-white/30 italic">Listening...</span>
                    )}
                </div>
            )}

            {/* Processing Status */}
            {isProcessing && (
                <div className="flex items-center gap-2 text-sm opacity-60">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Generating speech...</span>
                </div>
            )}

            {/* API Info */}
            <p className="mt-10 text-xs opacity-30">
                API Endpoint: <code className="bg-white/5 px-2 py-1 rounded">WS /ws/tts</code>
            </p>
        </div>
    );
}

// Type declarations for Web Speech API
declare global {
    interface Window {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        SpeechRecognition: any;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        webkitSpeechRecognition: any;
    }
}
