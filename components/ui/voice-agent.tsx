"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Mic, Square } from "lucide-react";

type Voice = "am_puck" | "af_sarah";

const VOICES = [
    { id: "am_puck" as Voice, name: "Puck", gender: "Male" },
    { id: "af_sarah" as Voice, name: "Sarah", gender: "Female" },
];

const TTS_API_URL = "/api/tts/stream";
const SAMPLE_RATE = 24000;

interface VoiceAgentProps {
    className?: string;
    visualizerBars?: number;
}

export function VoiceAgent({
    className,
    visualizerBars = 48,
}: VoiceAgentProps) {
    const [voice, setVoice] = useState<Voice>("am_puck");
    const [transcript, setTranscript] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);

    // Recording State
    const [isRecording, setIsRecording] = useState(false);
    const [time, setTime] = useState(0);
    const [isClient, setIsClient] = useState(false);
    const [audioLevels, setAudioLevels] = useState<number[]>([]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognitionRef = useRef<any>(null);
    const playbackAudioCtxRef = useRef<AudioContext | null>(null);

    // Recording Refs
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    /** Live transcript (final + interim) for sending on stop; avoids stale state */
    const transcriptRef = useRef("");

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

    // TTS via proxy API (no API key on client)
    const sendTextToTTS = useCallback(async (text: string) => {
        setIsProcessing(true);
        try {
            const res = await fetch(TTS_API_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text, voice, speed: 1.0 }),
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({ error: res.statusText }));
                throw new Error(err.error || `TTS failed: ${res.status}`);
            }
            const buffer = await res.arrayBuffer();
            const pcmData = new Float32Array(buffer);
            if (pcmData.length === 0) {
                setIsProcessing(false);
                return;
            }
            if (!playbackAudioCtxRef.current) {
                playbackAudioCtxRef.current = new AudioContext({ sampleRate: SAMPLE_RATE });
            }
            const audioBuffer = playbackAudioCtxRef.current.createBuffer(1, pcmData.length, SAMPLE_RATE);
            audioBuffer.copyToChannel(pcmData, 0);
            const source = playbackAudioCtxRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(playbackAudioCtxRef.current.destination);
            source.start();
        } catch (err) {
            console.error("[VoiceAgent] TTS error:", err);
        } finally {
            setIsProcessing(false);
        }
    }, [voice]);

    // Recording Functions
    const startRecording = useCallback(async () => {
        console.log("[VoiceAgent] Start recording");
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
            transcriptRef.current = "";

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
                    let full = "";
                    for (let i = 0; i < event.results.length; i++) {
                        full += event.results[i][0].transcript;
                        if (event.results[i].isFinal) full += " ";
                    }
                    transcriptRef.current = full;
                    setTranscript(full);
                };

                recognitionRef.current.start();
                console.log("[VoiceAgent] Speech recognition started");
            }
        } catch (error) {
            console.error("[VoiceAgent] Failed to start recording:", error);
        }
    }, [analyzeAudio]);

    const stopRecording = useCallback(() => {
        const textToSend = transcriptRef.current.trim();
        console.log("[VoiceAgent] Stop recording, transcript:", JSON.stringify(textToSend));
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

        // Send the transcript to TTS via proxy API (no API key on client)
        if (textToSend) {
            console.log("[VoiceAgent] Sending transcript to TTS:", textToSend.slice(0, 80) + (textToSend.length > 80 ? "..." : ""));
            sendTextToTTS(textToSend);
        } else {
            console.log("[VoiceAgent] No transcript to send (empty or whitespace)");
        }
    }, [visualizerBars, sendTextToTTS]);

    useEffect(() => {
        return () => {
            if (recognitionRef.current) {
                recognitionRef.current.stop();
            }
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
            if (audioContextRef.current) audioContextRef.current.close();
        };
    }, []);

    if (!isClient) return null;

    return (
        <div className={cn("flex flex-col items-center", className)}>
            {/* Voice Selection */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-md mb-8">
                {VOICES.map((v) => (
                    <button
                        key={v.id}
                        onClick={() => setVoice(v.id)}
                        className={`p-4 text-left border transition-colors ${voice === v.id
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
                API: <code className="bg-white/5 px-2 py-1 rounded">POST /api/tts/stream</code> (key on server)
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
