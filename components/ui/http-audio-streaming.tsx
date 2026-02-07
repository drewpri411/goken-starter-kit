"use client";

import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

type Voice = "am_puck" | "af_sarah";

const VOICES = [
    { id: "am_puck" as Voice, name: "Puck", gender: "Male" },
    { id: "af_sarah" as Voice, name: "Sarah", gender: "Female" },
];

const API_URL = "https://smirksteveyt--goken-web-app.modal.run/stream";

interface HTTPAudioStreamingProps {
    apiKey?: string;
    className?: string;
}

export function HTTPAudioStreaming({
    apiKey,
    className,
}: HTTPAudioStreamingProps) {
    const [voice, setVoice] = useState<Voice>("am_puck");
    const [text, setText] = useState(
        "Our apis are deployed using kubectl, run a ReLU model for inference, and expose CRUD endpoints in O(n) that return a char*. You can use them in C#, or any other language you prefer."
    );
    const [speed, setSpeed] = useState(1.0);
    const [isLoading, setIsLoading] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const audioCtxRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);

    const stopAudio = () => {
        sourceRef.current?.stop();
        sourceRef.current = null;
        setIsPlaying(false);
    };

    const generateAudio = async () => {
        if (!text.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            if (!audioCtxRef.current) {
                audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
            }

            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-API-Key": apiKey || process.env.NEXT_PUBLIC_GOKEN_API_KEY || "",
                },
                body: JSON.stringify({ text, voice, speed }),
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const buffer = await response.arrayBuffer();
            const pcmData = new Float32Array(buffer);
            const audioBuffer = audioCtxRef.current.createBuffer(1, pcmData.length, 24000);
            audioBuffer.copyToChannel(pcmData, 0);

            stopAudio();
            const source = audioCtxRef.current.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioCtxRef.current.destination);
            source.onended = () => setIsPlaying(false);
            sourceRef.current = source;

            setIsPlaying(true);
            source.start();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to generate audio");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={cn("flex flex-col items-center", className)}>
            {/* Voice Selection */}
            <div className="grid grid-cols-2 gap-3 w-full max-w-md mb-6">
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

            {/* Speed Control */}
            <div className="w-full max-w-md mb-6">
                <div className="flex justify-between text-sm mb-2">
                    <span className="opacity-60">Speed</span>
                    <span className="font-mono">{speed.toFixed(1)}x</span>
                </div>
                <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speed}
                    onChange={(e) => setSpeed(parseFloat(e.target.value))}
                    className="w-full accent-white"
                />
            </div>

            {/* Text Input */}
            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to synthesize..."
                rows={6}
                className="w-full max-w-md p-4 bg-white/5 border border-white/15 text-white resize-none mb-4 focus:outline-none focus:border-white/30 overflow-x-hidden overflow-y-auto"
            />

            {/* Error */}
            {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

            {/* Generate Button */}
            <button
                onClick={isPlaying ? stopAudio : generateAudio}
                disabled={isLoading || (!isPlaying && !text.trim())}
                className="px-12 py-3 border border-white/30 text-xs tracking-widest hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
                {isLoading ? "GENERATING..." : isPlaying ? "STOP" : "GENERATE"}
            </button>

            {/* API Info */}
            <p className="mt-10 text-xs opacity-30">
                API Endpoint: <code className="bg-white/5 px-2 py-1 rounded">POST /stream</code>
            </p>
        </div>
    );
}
