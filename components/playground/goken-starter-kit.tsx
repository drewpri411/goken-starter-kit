"use client";
import { HTTPAudioStreaming } from "@/components/ui/http-audio-streaming";
import { VoiceAgent } from "@/components/ui/voice-agent";

export default function GokenStarterKit() {
    return (
        <div className="min-h-screen bg-black text-white flex flex-col">
            {/* Main Content */}
            <main className="flex-1 flex flex-col px-4 pb-20">
                {/* Header */}
                <div className="flex flex-col items-center justify-center pt-12 pb-8">
                    <h1 className="text-[clamp(28px,5vw,56px)] font-black tracking-tight leading-none mb-3 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent text-center">
                        Goken Starter Kit
                    </h1>
                </div>

                {/* Two Column Layout */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 max-w-7xl mx-auto w-full">
                    {/* Left Column - HTTP Audio Streaming */}
                    <div className="flex flex-col items-center">
                        <h2 className="text-xs tracking-widest uppercase opacity-60 mb-10">
                            HTTP Audio Streaming
                        </h2>
                        <HTTPAudioStreaming />
                    </div>

                    {/* Right Column - Voice Agent */}
                    <div className="flex flex-col items-center">
                        <h2 className="text-xs tracking-widest uppercase opacity-60 mb-10">
                            Voice Agent
                        </h2>
                        <VoiceAgent />
                    </div>
                </div>
            </main>
        </div>
    );
}
