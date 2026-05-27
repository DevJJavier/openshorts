import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Save, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import { getApiUrl } from '../config';

const MIN_DURATION_MS = 200;
const TRACK_HEIGHT = 40;
const HEADER_HEIGHT = 28;
const MAX_CHARS = 20;
const MAX_DURATION_MS = 2000;

// ── helpers ──────────────────────────────────────────────────────────

function msToTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    return `${m}:${String(s % 60).padStart(2, '0')}.${String(ms % 1000).padStart(3, '0')}`;
}

/** Same grouping logic as captions.ts so blocks match Remotion exactly */
function groupIntoBlocks(captions) {
    const blocks = [];
    let current = [];
    let blockStart = 0;

    for (const word of captions) {
        if (current.length === 0) {
            current.push(word);
            blockStart = word.startMs;
            continue;
        }
        const len = current.reduce((s, w) => s + w.text.length + 1, 0);
        const dur = word.endMs - blockStart;
        if (len + word.text.length > MAX_CHARS || dur > MAX_DURATION_MS) {
            const last = current[current.length - 1];
            blocks.push({ words: [...current], startMs: blockStart, endMs: last.endMs, text: current.map(w => w.text).join(' ') });
            current = [word];
            blockStart = word.startMs;
        } else {
            current.push(word);
        }
    }
    if (current.length > 0) {
        const last = current[current.length - 1];
        blocks.push({ words: [...current], startMs: blockStart, endMs: last.endMs, text: current.map(w => w.text).join(' ') });
    }
    return blocks;
}

/**
 * When a block's start/end changes, redistribute word timestamps proportionally
 * so word-level animations (pop, karaoke, word-highlight) still work correctly.
 */
function redistributeWords(words, newStart, newEnd) {
    const origStart = words[0].startMs;
    const origEnd = words[words.length - 1].endMs;
    const origDur = origEnd - origStart || 1;
    const newDur = newEnd - newStart;
    return words.map(w => ({
        ...w,
        startMs: Math.round(newStart + ((w.startMs - origStart) / origDur) * newDur),
        endMs: Math.round(newStart + ((w.endMs - origStart) / origDur) * newDur),
    }));
}

/** Flatten blocks back to word-level captions array */
function flattenBlocks(blocks) {
    return blocks.flatMap(b => b.words);
}

// ── Ruler ─────────────────────────────────────────────────────────────

function Ruler({ durationMs, pxPerMs }) {
    const stepMs = pxPerMs < 0.15 ? 5000 : pxPerMs < 0.4 ? 2000 : pxPerMs < 1 ? 1000 : 500;
    const ticks = [];
    for (let t = 0; t <= durationMs; t += stepMs) ticks.push(t);
    return (
        <div style={{ position: 'relative', width: durationMs * pxPerMs, height: HEADER_HEIGHT }}>
            {ticks.map(t => (
                <div key={t} style={{ position: 'absolute', left: t * pxPerMs, top: 0, height: '100%', borderLeft: '1px solid #3f3f46', paddingLeft: 3 }}>
                    <span style={{ fontSize: 9, color: '#71717a', userSelect: 'none' }}>{msToTime(t)}</span>
                </div>
            ))}
        </div>
    );
}

// ── Draggable block ───────────────────────────────────────────────────

function DraggableBlock({ block, idx, pxPerMs, durationMs, color, onUpdate, isSelected, onSelect }) {
    const drag = useRef(null);

    const handlePointerDown = (e, type) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { type, startX: e.clientX, origStart: block.startMs, origEnd: block.endMs };
        onSelect(idx);
    };

    const handlePointerMove = (e) => {
        if (!drag.current) return;
        const dMs = (e.clientX - drag.current.startX) / pxPerMs;
        const { type, origStart, origEnd } = drag.current;
        const dur = origEnd - origStart;
        let ns = origStart, ne = origEnd;

        if (type === 'move') {
            ns = Math.round(Math.max(0, Math.min(durationMs - dur, origStart + dMs)));
            ne = ns + dur;
        } else if (type === 'left') {
            ns = Math.round(Math.max(0, Math.min(origEnd - MIN_DURATION_MS, origStart + dMs)));
        } else if (type === 'right') {
            ne = Math.round(Math.max(origStart + MIN_DURATION_MS, Math.min(durationMs, origEnd + dMs)));
        }
        onUpdate(idx, ns, ne);
    };

    const handlePointerUp = (e) => {
        drag.current = null;
        e.currentTarget.releasePointerCapture(e.pointerId);
    };

    const left = block.startMs * pxPerMs;
    const width = Math.max(8, (block.endMs - block.startMs) * pxPerMs);

    return (
        <div
            onPointerDown={(e) => handlePointerDown(e, 'move')}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            title={`"${block.text}"\n${msToTime(block.startMs)} → ${msToTime(block.endMs)}\n${(block.endMs - block.startMs)}ms`}
            style={{
                position: 'absolute', left, top: 6, width, height: TRACK_HEIGHT,
                background: isSelected ? color : color + '99',
                border: `2px solid ${isSelected ? '#fff' : color}`,
                borderRadius: 5, cursor: 'grab', display: 'flex', alignItems: 'center',
                overflow: 'hidden', userSelect: 'none', touchAction: 'none', boxSizing: 'border-box',
                transition: 'border-color 0.1s',
            }}
        >
            {/* Left handle */}
            <div
                onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'left'); }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{ width: 7, height: '100%', cursor: 'ew-resize', background: color, flexShrink: 0, opacity: 0.9 }}
            />
            <span style={{ flex: 1, fontSize: 10, fontWeight: 700, color: '#fff', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', padding: '0 3px', pointerEvents: 'none' }}>
                {block.text}
            </span>
            {/* Right handle */}
            <div
                onPointerDown={(e) => { e.stopPropagation(); handlePointerDown(e, 'right'); }}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{ width: 7, height: '100%', cursor: 'ew-resize', background: color, flexShrink: 0, opacity: 0.9 }}
            />
        </div>
    );
}

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6'];

// ── Main component ────────────────────────────────────────────────────

export default function SubtitleTimeline({ captions, originalCaptions, durationSec, jobId, clipIndex, onCaptionsChange }) {
    const durationMs = durationSec * 1000;
    const [pxPerMs, setPxPerMs] = useState(0.25);
    // blocks always derived from current captions (adjustedCaptions from parent)
    const [blocks, setBlocks] = useState(() => groupIntoBlocks(captions));
    const [selected, setSelected] = useState(null);
    const [saved, setSaved] = useState(false);

    // Re-derive blocks when captions change (text edit from parent updates this)
    const prevCaptionsRef = useRef(captions);
    useEffect(() => {
        // Only re-group if the text content changed (not just timing from our own drag)
        const prevTexts = prevCaptionsRef.current.map(c => c.text).join(' ');
        const nextTexts = captions.map(c => c.text).join(' ');
        if (prevTexts !== nextTexts) {
            setBlocks(groupIntoBlocks(captions));
            setSelected(null);
        }
        prevCaptionsRef.current = captions;
        setSaved(false);
    }, [captions]);

    const handleUpdate = (idx, newStart, newEnd) => {
        setBlocks(prev => prev.map((b, i) => {
            if (i !== idx) return b;
            return {
                ...b,
                startMs: newStart,
                endMs: newEnd,
                words: redistributeWords(b.words, newStart, newEnd),
            };
        }));
    };

    const handleSave = async () => {
        // Flatten blocks → word-level captions (preserves word timing for animations)
        const payload = flattenBlocks(blocks);
        try {
            await fetch(getApiUrl(`/api/clip/${jobId}/${clipIndex}/transcript`), {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ captions: payload }),
            });
            // Notify parent so Remotion preview updates with new timing
            onCaptionsChange(payload);
            setSaved(true);
            setTimeout(() => setSaved(false), 2000);
        } catch (err) {
            console.error('Failed to save transcript', err);
        }
    };

    const handleReset = () => {
        const base = originalCaptions || captions;
        setBlocks(groupIntoBlocks(base));
        setSaved(false);
        setSelected(null);
        onCaptionsChange(base);
    };

    const btn = (active, color) => ({
        background: color || (active ? '#22c55e' : '#27272a'),
        border: 'none', borderRadius: 6, padding: '4px 8px',
        color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 12,
    });

    // Selected block info
    const sel = selected !== null ? blocks[selected] : null;

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Toolbar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: '#71717a', flex: 1, minWidth: 120 }}>
                    {blocks.length} phrases · drag to adjust timing
                </span>
                <button onClick={() => setPxPerMs(p => Math.min(2, p * 1.5))} style={btn(false)} title="Zoom in"><ZoomIn size={13} /></button>
                <button onClick={() => setPxPerMs(p => Math.max(0.05, p / 1.5))} style={btn(false)} title="Zoom out"><ZoomOut size={13} /></button>
                <button onClick={handleReset} style={btn(false)} title="Reset to Whisper timing"><RotateCcw size={13} /></button>
                <button onClick={handleSave} style={btn(saved, saved ? '#22c55e' : '#6366f1')}>
                    <Save size={13} />{saved ? 'Saved!' : 'Save'}
                </button>
            </div>

            {/* Selected block info */}
            {sel && (
                <div style={{ background: '#18181b', border: '1px solid #3f3f46', borderRadius: 6, padding: '6px 10px', fontSize: 11, color: '#a1a1aa', display: 'flex', gap: 16 }}>
                    <span style={{ color: '#fff', fontWeight: 600 }}>"{sel.text}"</span>
                    <span>{msToTime(sel.startMs)} → {msToTime(sel.endMs)}</span>
                    <span style={{ color: '#71717a' }}>{sel.endMs - sel.startMs}ms · {sel.words.length} words</span>
                </div>
            )}

            {/* Timeline */}
            <div style={{ overflowX: 'auto', overflowY: 'hidden', background: '#09090b', borderRadius: 8, border: '1px solid #27272a' }}>
                <div style={{ minWidth: durationMs * pxPerMs + 32, padding: '0 16px', width: 'max-content' }}>
                    <div style={{ height: HEADER_HEIGHT, borderBottom: '1px solid #27272a' }}>
                        <Ruler durationMs={durationMs} pxPerMs={pxPerMs} />
                    </div>
                    <div style={{ position: 'relative', height: TRACK_HEIGHT + 12, marginTop: 6 }}>
                        <div style={{ position: 'absolute', inset: 0, background: '#18181b', borderRadius: 4 }} />
                        {blocks.map((block, idx) => (
                            <DraggableBlock
                                key={idx}
                                block={block}
                                idx={idx}
                                pxPerMs={pxPerMs}
                                durationMs={durationMs}
                                color={COLORS[idx % COLORS.length]}
                                onUpdate={handleUpdate}
                                isSelected={selected === idx}
                                onSelect={setSelected}
                            />
                        ))}
                    </div>
                </div>
            </div>

            <p style={{ fontSize: 10, color: '#52525b', margin: 0 }}>
                Word-level timing is redistributed proportionally · animations (pop, karaoke, glow) stay active
            </p>
        </div>
    );
}
