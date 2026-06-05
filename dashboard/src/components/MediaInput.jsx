import React, { useState, useEffect } from 'react';
import { Youtube, Upload, FileVideo, X } from 'lucide-react';
import { getApiUrl } from '../config';

const CONTENT_TYPES = [
    { value: 'general',  label: 'General',  desc: 'Podcasts, vlogs, interviews' },
    { value: 'music',    label: 'Music',    desc: 'Music videos, concerts' },
    { value: 'tutorial', label: 'Tutorial', desc: 'How-tos, educational' },
    { value: 'sports',   label: 'Sports',   desc: 'Action, highlights' },
];

export default function MediaInput({ onProcess, isProcessing }) {
    const [youtubeUrlEnabled, setYoutubeUrlEnabled] = useState(true);
    const [mode, setMode] = useState('url'); // 'url' | 'file'
    const [url, setUrl] = useState('');
    const [file, setFile] = useState(null);
    const [acknowledged, setAcknowledged] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [clipMin, setClipMin] = useState(15);
    const [clipMax, setClipMax] = useState(60);
    const [contentType, setContentType] = useState('general');
    const [language, setLanguage] = useState('auto');

    const LANGUAGES = [
        { value: 'auto', label: 'Auto-detect' },
        { value: 'es',   label: 'Español' },
        { value: 'en',   label: 'English' },
        { value: 'fr',   label: 'Français' },
        { value: 'de',   label: 'Deutsch' },
        { value: 'it',   label: 'Italiano' },
        { value: 'pt',   label: 'Português' },
        { value: 'ja',   label: '日本語' },
        { value: 'ko',   label: '한국어' },
        { value: 'zh',   label: '中文' },
        { value: 'ru',   label: 'Русский' },
        { value: 'ar',   label: 'العربية' },
    ];

    useEffect(() => {
        fetch(getApiUrl('/api/config'))
            .then((r) => r.ok ? r.json() : null)
            .then((cfg) => {
                if (cfg && cfg.youtubeUrlEnabled === false) {
                    setYoutubeUrlEnabled(false);
                    setMode('file');
                }
            })
            .catch(() => {});
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!acknowledged) return;
        const params = { clip_min: clipMin, clip_max: clipMax, content_type: contentType, language };
        if (mode === 'url' && url) {
            onProcess({ type: 'url', payload: url, acknowledged: true, ...params });
        } else if (mode === 'file' && file) {
            onProcess({ type: 'file', payload: file, acknowledged: true, ...params });
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            setMode('file');
        }
    };

    return (
        <div className="bg-surface border border-white/5 rounded-2xl p-6 animate-[fadeIn_0.6s_ease-out]">
            <div className="flex gap-4 mb-6 border-b border-white/5 pb-4">
                {youtubeUrlEnabled && (
                    <button
                        onClick={() => setMode('url')}
                        className={`flex items-center gap-2 pb-2 px-2 transition-all ${mode === 'url'
                            ? 'text-primary border-b-2 border-primary -mb-[17px]'
                            : 'text-zinc-400 hover:text-white'
                            }`}
                    >
                        <Youtube size={18} />
                        YouTube URL
                    </button>
                )}
                <button
                    onClick={() => setMode('file')}
                    className={`flex items-center gap-2 pb-2 px-2 transition-all ${mode === 'file'
                        ? 'text-primary border-b-2 border-primary -mb-[17px]'
                        : 'text-zinc-400 hover:text-white'
                        }`}
                >
                    <Upload size={18} />
                    Upload File
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {mode === 'url' ? (
                    <div className="space-y-4">
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://www.youtube.com/watch?v=..."
                            className="input-field"
                            required
                        />
                    </div>
                ) : (
                    <div
                        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${file ? 'border-primary/50 bg-primary/5' : 'border-zinc-700 hover:border-zinc-500 bg-white/5'
                            }`}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={handleDrop}
                    >
                        {file ? (
                            <div className="flex items-center justify-center gap-3 text-white">
                                <FileVideo className="text-primary" />
                                <span className="font-medium">{file.name}</span>
                                <button
                                    type="button"
                                    onClick={() => setFile(null)}
                                    className="p-1 hover:bg-white/10 rounded-full"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        ) : (
                            <label className="cursor-pointer block">
                                <input
                                    type="file"
                                    accept="video/*"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    className="hidden"
                                />
                                <Upload className="mx-auto mb-3 text-zinc-500" size={24} />
                                <p className="text-zinc-400">Click to upload or drag and drop</p>
                                <p className="text-xs text-zinc-600 mt-1">MP4, MOV up to 500MB</p>
                            </label>
                        )}
                    </div>
                )}

                {/* Advanced Options */}
                <div className="mt-4">
                    <button
                        type="button"
                        onClick={() => setShowAdvanced(v => !v)}
                        className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                        <span className={`transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>▶</span>
                        Advanced options
                    </button>

                    {showAdvanced && (
                        <div className="mt-3 space-y-4 p-4 bg-white/3 border border-white/5 rounded-xl animate-[fadeIn_0.15s_ease-out]">
                            {/* Content type */}
                            <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Content Type</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {CONTENT_TYPES.map(ct => (
                                        <button
                                            key={ct.value}
                                            type="button"
                                            onClick={() => setContentType(ct.value)}
                                            className={`p-2 rounded-lg border text-left transition-all ${
                                                contentType === ct.value
                                                    ? 'bg-primary/15 border-primary text-white'
                                                    : 'bg-white/3 border-white/5 text-zinc-400 hover:bg-white/8'
                                            }`}
                                        >
                                            <div className="text-xs font-semibold">{ct.label}</div>
                                            <div className="text-[10px] text-zinc-500 mt-0.5">{ct.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Clip duration range */}
                            <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3 block">
                                    Clip Duration: <span className="text-white">{clipMin}s – {clipMax}s</span>
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                                            <span>Min</span><span>{clipMin}s</span>
                                        </div>
                                        <input
                                            type="range" min={5} max={55} step={5}
                                            value={clipMin}
                                            onChange={e => {
                                                const v = parseInt(e.target.value);
                                                setClipMin(v);
                                                if (v >= clipMax) setClipMax(v + 5);
                                            }}
                                            className="w-full accent-primary"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between text-[10px] text-zinc-500 mb-1">
                                            <span>Max</span><span>{clipMax}s</span>
                                        </div>
                                        <input
                                            type="range" min={10} max={180} step={5}
                                            value={clipMax}
                                            onChange={e => {
                                                const v = parseInt(e.target.value);
                                                setClipMax(v);
                                                if (v <= clipMin) setClipMin(v - 5);
                                            }}
                                            className="w-full accent-primary"
                                        />
                                    </div>
                                </div>
                                <p className="text-[10px] text-zinc-600 mt-2">For music videos try 30s – 90s · For podcasts 30s – 60s</p>
                            </div>

                            {/* Language */}
                            <div>
                                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 block">Transcription Language</label>
                                <select
                                    value={language}
                                    onChange={e => setLanguage(e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-primary/50"
                                >
                                    {LANGUAGES.map(l => (
                                        <option key={l.value} value={l.value}>{l.label}</option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-zinc-600 mt-1">Force language to skip auto-detection — faster and more accurate for music</p>
                            </div>
                        </div>
                    )}
                </div>

                <label className="flex items-start gap-2 mt-5 text-xs text-zinc-400 cursor-pointer select-none">
                    <input
                        type="checkbox"
                        checked={acknowledged}
                        onChange={(e) => setAcknowledged(e.target.checked)}
                        className="mt-0.5 accent-primary cursor-pointer"
                    />
                    <span>
                        I confirm I own this content or have the rights to process it. I am responsible for any content I submit. See our <a href="/#legal" target="_blank" rel="noopener noreferrer" className="text-primary underline" onClick={(e) => e.stopPropagation()}>Terms & Privacy</a>.
                    </span>
                </label>

                <button
                    type="submit"
                    disabled={isProcessing || !acknowledged || (mode === 'url' && !url) || (mode === 'file' && !file)}
                    className="w-full btn-primary mt-4 flex items-center justify-center gap-2"
                >
                    {isProcessing ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing Video...
                        </>
                    ) : (
                        <>
                            Generate Clips
                        </>
                    )}
                </button>
            </form>
        </div>
    );
}
