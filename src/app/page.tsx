'use client';

import type { DragEvent, ChangeEvent } from 'react';
import { useState, useRef, useCallback, useEffect } from 'react';

function formatTime(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export default function Home() {
    const [videoSrc, setVideoSrc] = useState<string | null>(null);
    const [videoName, setVideoName] = useState<string>('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isDragging, setIsDragging] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = useCallback((file: File) => {
        if (file && file.type.startsWith('video/')) {
            setVideoSrc(URL.createObjectURL(file));
            setVideoName(file.name);
            setIsPlaying(false);
            setCurrentTime(0);
        }
    }, []);

    const handleDrop = useCallback(
        (e: DragEvent) => {
            e.preventDefault();
            const file = e.dataTransfer.files[0];

            if (file) {
                handleFileSelect(file);
            }
        },
        [handleFileSelect]
    );

    const handleDragOver = useCallback((e: DragEvent) => {
        e.preventDefault();
    }, []);

    const handleInputChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];

            if (file) {
                handleFileSelect(file);
            }
        },
        [handleFileSelect]
    );

    const togglePlay = useCallback(() => {
        if (!videoRef.current) {
            return;
        }

        if (isPlaying) {
            videoRef.current.pause();
        } else {
            videoRef.current.play();
        }

        setIsPlaying(!isPlaying);
    }, [isPlaying]);

    const skip = useCallback((seconds: number) => {
        if (!videoRef.current) {
            return;
        }

        videoRef.current.currentTime = Math.max(0, Math.min(videoRef.current.duration, videoRef.current.currentTime + seconds));
    }, []);

    const handleTimelineChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
        if (!videoRef.current) {
            return;
        }

        const time = parseFloat(e.target.value);

        videoRef.current.currentTime = time;
        setCurrentTime(time);
    }, []);

    const handleTimelineMouseDown = useCallback(() => {
        setIsDragging(true);
    }, []);

    const handleTimelineMouseUp = useCallback(() => {
        setIsDragging(false);
    }, []);

    useEffect(() => {
        const video = videoRef.current;

        if (!video) {
            return;
        }

        const handleTimeUpdate = () => {
            if (!isDragging) {
                setCurrentTime(video.currentTime);
            }
        };

        const handleLoadedMetadata = () => {
            setDuration(video.duration);
        };

        const handleDurationChange = () => {
            if (video.duration && !isNaN(video.duration)) {
                setDuration(video.duration);
            }
        };

        const handleEnded = () => {
            setIsPlaying(false);
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('durationchange', handleDurationChange);
        video.addEventListener('ended', handleEnded);

        if (video.duration && !isNaN(video.duration)) {
            setDuration(video.duration);
        }

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('loadedmetadata', handleLoadedMetadata);
            video.removeEventListener('durationchange', handleDurationChange);
            video.removeEventListener('ended', handleEnded);
        };
    }, [isDragging, videoSrc]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!videoSrc) {
                return;
            }

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlay();

                    break;

                case 'ArrowLeft':
                    e.preventDefault();
                    skip(-5);

                    break;

                case 'ArrowRight':
                    e.preventDefault();
                    skip(5);

                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [videoSrc, togglePlay, skip]);

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-[#09090b]">
            {/* Header */}
            <header className="flex h-12 shrink-0 items-center justify-between border-b border-white/5 bg-[#09090b] px-5">
                <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500">
                        <svg
                            className="h-4 w-4 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                            />
                        </svg>
                    </div>
                    <span className="text-sm font-medium text-white/90">Subtitles Editor</span>
                </div>
                {videoName && <span className="text-xs text-white/40 truncate max-w-md">{videoName}</span>}
            </header>

            <main className="flex flex-1 flex-col overflow-hidden">
                {!videoSrc ? (
                    /* Upload zone */
                    <div
                        className="flex flex-1 items-center justify-center p-6"
                        onDrop={handleDrop}
                        onDragOver={handleDragOver}
                    >
                        <div className="group relative flex flex-col items-center justify-center gap-5 rounded-2xl border border-white/10 bg-white/[0.02] p-14 backdrop-blur-sm transition-all hover:border-violet-500/50 hover:bg-white/[0.04]">
                            <div className="absolute inset-0 -z-10 rounded-2xl bg-gradient-to-r from-violet-500/10 via-fuchsia-500/10 to-violet-500/10 opacity-0 blur-xl transition-opacity group-hover:opacity-100" />

                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 ring-1 ring-white/10">
                                <svg
                                    className="h-8 w-8 text-violet-400"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={1.5}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                                    />
                                </svg>
                            </div>
                            <div className="text-center">
                                <p className="text-base font-medium text-white/90">Importer une vidéo</p>
                                <p className="mt-1.5 text-sm text-white/40">Glissez-déposez ou cliquez pour sélectionner</p>
                            </div>
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-2 text-sm font-medium text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:brightness-110"
                            >
                                Parcourir
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="video/*"
                                onChange={handleInputChange}
                                className="hidden"
                            />
                        </div>
                    </div>
                ) : (
                    /* Video editor */
                    <div className="flex flex-1 flex-col overflow-hidden">
                        <div className="flex flex-1 items-center justify-center bg-black/50 p-3 min-h-0">
                            <video
                                ref={videoRef}
                                src={videoSrc}
                                className="max-h-full max-w-full rounded-lg object-contain"
                                style={{ maxHeight: 'calc(100vh - 220px)' }}
                                onClick={togglePlay}
                            />
                        </div>

                        {/* Controls panel */}
                        <div className="shrink-0 border-t border-white/5 bg-[#0c0c0e] px-6 py-4">
                            {/* Timeline */}
                            <div className="mb-5">
                                <div className="group relative flex h-6 cursor-pointer items-center">
                                    {/* Track */}
                                    <div className="absolute inset-x-0 h-1.5 rounded-full bg-white/10" />

                                    {/* Progress */}
                                    <div
                                        className="absolute h-1.5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500"
                                        style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                                    />

                                    {/* Thumb */}
                                    <div
                                        className="pointer-events-none absolute h-4 w-4 -translate-x-1/2 rounded-full bg-white shadow-lg shadow-black/50"
                                        style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                                    />

                                    {/* Slider input */}
                                    <input
                                        type="range"
                                        min={0}
                                        max={duration || 1}
                                        step={0.01}
                                        value={currentTime}
                                        onChange={handleTimelineChange}
                                        onMouseDown={handleTimelineMouseDown}
                                        onMouseUp={handleTimelineMouseUp}
                                        onTouchStart={handleTimelineMouseDown}
                                        onTouchEnd={handleTimelineMouseUp}
                                        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                                    />
                                </div>

                                {/* Time display */}
                                <div className="mt-2 flex justify-between text-[11px] font-medium text-white/30 font-mono">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>

                            {/* Control buttons */}
                            <div className="flex items-center justify-center gap-3">
                                {/* Previous 5s */}
                                <button
                                    onClick={() => skip(-5)}
                                    className="group flex h-10 items-center gap-1.5 rounded-full bg-white/5 px-4 text-white/60 transition-all hover:bg-white/10 hover:text-white"
                                    title="Reculer de 5 secondes"
                                >
                                    <svg
                                        className="h-4 w-4"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
                                    </svg>
                                    <span className="text-xs font-medium">5s</span>
                                </button>

                                {/* Play/Pause */}
                                <button
                                    onClick={togglePlay}
                                    className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30 transition-all hover:shadow-violet-500/50 hover:brightness-110"
                                    title={isPlaying ? 'Pause' : 'Lecture'}
                                >
                                    {isPlaying ? (
                                        <svg
                                            className="h-5 w-5"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                                        </svg>
                                    ) : (
                                        <svg
                                            className="h-5 w-5 ml-0.5"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    )}
                                </button>

                                {/* Next 5s */}
                                <button
                                    onClick={() => skip(5)}
                                    className="group flex h-10 items-center gap-1.5 rounded-full bg-white/5 px-4 text-white/60 transition-all hover:bg-white/10 hover:text-white"
                                    title="Avancer de 5 secondes"
                                >
                                    <span className="text-xs font-medium">5s</span>
                                    <svg
                                        className="h-4 w-4"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
                                    </svg>
                                </button>
                            </div>

                            {/* Keyboard shortcuts hint */}
                            <div className="mt-4 flex justify-center gap-6 text-[10px] text-white/20">
                                <span className="flex items-center gap-1.5">
                                    <kbd className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-white/40">Space</kbd>
                                    <span>Play</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <kbd className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-white/40">&larr;</kbd>
                                    <span>-5s</span>
                                </span>
                                <span className="flex items-center gap-1.5">
                                    <kbd className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-white/40">&rarr;</kbd>
                                    <span>+5s</span>
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
