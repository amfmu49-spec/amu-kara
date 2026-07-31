'use client';

import React, { useState, useRef, useEffect } from 'react';
import { LyricLine } from '@/lib/srtParser';

interface KaraokePlayerProps {
  audioUrl: string;
  bgImageUrl: string | null;
  lyrics: LyricLine[];
  title?: string;
  onReset: () => void;
}

export default function KaraokePlayer({ audioUrl, bgImageUrl, lyrics, title, onReset }: KaraokePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [blobAudioUrl, setBlobAudioUrl] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [keyOffset, setKeyOffset] = useState(0);
  const [isVocalCut, setIsVocalCut] = useState(true);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  // Refs for dynamic control
  const midGainRef = useRef<GainNode | null>(null);
  const notch1Ref = useRef<BiquadFilterNode | null>(null);
  const notch2Ref = useRef<BiquadFilterNode | null>(null);
  const notch3Ref = useRef<BiquadFilterNode | null>(null);
  const notch4Ref = useRef<BiquadFilterNode | null>(null);
  const sideLGainRef = useRef<GainNode | null>(null);
  const sideRGainRef = useRef<GainNode | null>(null);

  // CORS bypass: Blob変換
  useEffect(() => {
    let isMounted = true;
    let createdUrl = '';
    const loadAudioBlob = async () => {
      if (!audioUrl) return;
      try {
        const res = await fetch(audioUrl);
        const blob = await res.blob();
        if (isMounted) {
          createdUrl = URL.createObjectURL(blob);
          setBlobAudioUrl(createdUrl);
        }
      } catch {
        if (isMounted) setBlobAudioUrl(audioUrl);
      }
    };
    loadAudioBlob();
    return () => {
      isMounted = false;
      if (createdUrl.startsWith('blob:')) URL.revokeObjectURL(createdUrl);
    };
  }, [audioUrl]);

  // ト書き除去
  const cleanLyrics = lyrics
    .map((line) => ({ ...line, text: line.text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim() }))
    .filter((line) => line.text.length > 0);

  /*
   * ============================================================
   *  v3.1.0 — Best-effort browser DSP vocal reduction
   * ============================================================
   *
   *  原理: Mid/Side 分離
   *    Mid = (L + R) / 2   ← ボーカルが集中するセンター
   *    Side = (L - R) / 2  ← 伴奏のステレオ広がり
   *
   *  Mid に対して:
   *    1. 全体ゲインを 0.12 に下げる（-18dB）
   *    2. ボーカル帯域に4段ノッチフィルタを直列接続
   *       - 300Hz  Q=1.5  -20dB  (男性ボーカル基音)
   *       - 1000Hz Q=1.0  -28dB  (ボーカルフォルマント核心)
   *       - 2500Hz Q=1.2  -24dB  (ボーカルプレゼンス)
   *       - 4500Hz Q=1.5  -18dB  (サ行・子音)
   *
   *  Side に対して:
   *    - ゲイン 0.55（イコライザーは一切かけず原音保持）
   *    - Low-Shelf 120Hz +3dB で重低音を補う
   *
   *  再合成:
   *    L_out = Mid_processed + Side_processed
   *    R_out = Mid_processed - Side_processed
   *
   *  ※ コンプレッサーは不使用（浮つき防止）
   *  ※ Side にノッチは不使用（音質劣化防止）
   * ============================================================
   */
  const handleUserUnlockAndPlay = async () => {
    try {
      if (!audioCtxRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      if (!sourceNodeRef.current && audioRef.current) {
        sourceNodeRef.current = ctx.createMediaElementSource(audioRef.current);

        const splitter = ctx.createChannelSplitter(2);
        const merger = ctx.createChannelMerger(2);

        // ---- Mid channel ----
        const midGain = ctx.createGain();
        midGain.gain.value = 0.12; // -18dB（ボーカルを大幅に押し下げる）

        const n1 = ctx.createBiquadFilter();
        n1.type = 'peaking'; n1.frequency.value = 300; n1.Q.value = 1.5; n1.gain.value = -20;

        const n2 = ctx.createBiquadFilter();
        n2.type = 'peaking'; n2.frequency.value = 1000; n2.Q.value = 1.0; n2.gain.value = -28;

        const n3 = ctx.createBiquadFilter();
        n3.type = 'peaking'; n3.frequency.value = 2500; n3.Q.value = 1.2; n3.gain.value = -24;

        const n4 = ctx.createBiquadFilter();
        n4.type = 'peaking'; n4.frequency.value = 4500; n4.Q.value = 1.5; n4.gain.value = -18;

        midGainRef.current = midGain;
        notch1Ref.current = n1;
        notch2Ref.current = n2;
        notch3Ref.current = n3;
        notch4Ref.current = n4;

        // ---- Side channel ----
        const sideL = ctx.createGain();
        sideL.gain.value = 0.55;
        const sideR = ctx.createGain();
        sideR.gain.value = -0.55; // 逆位相

        // Side の重低音補強
        const sideLowBoost = ctx.createBiquadFilter();
        sideLowBoost.type = 'lowshelf';
        sideLowBoost.frequency.value = 120;
        sideLowBoost.gain.value = 3.0;

        sideLGainRef.current = sideL;
        sideRGainRef.current = sideR;

        // ---- ノード接続 ----
        sourceNodeRef.current.connect(splitter);

        // Mid: Splitter(L,R) -> midGain -> n1 -> n2 -> n3 -> n4 -> merger(L,R)
        splitter.connect(midGain, 0);
        splitter.connect(midGain, 1);
        midGain.connect(n1);
        n1.connect(n2);
        n2.connect(n3);
        n3.connect(n4);
        n4.connect(merger, 0, 0);
        n4.connect(merger, 0, 1);

        // Side: Splitter -> sideL(0) / sideR(1) -> lowBoost -> merger
        //   sideL + sideR の和が Side 信号
        //   merger(0,0) に足すと L_out = Mid + Side
        //   merger(0,1) に足すと R_out = Mid + Side だが、
        //   sideR は逆位相なので R_out = Mid - Side になる
        splitter.connect(sideL, 0);
        splitter.connect(sideR, 1);
        sideL.connect(sideLowBoost);
        sideR.connect(sideLowBoost);

        // Side -> L channel
        sideLowBoost.connect(merger, 0, 0);
        // Side -> R channel (逆位相で再合成)
        const sideInvert = ctx.createGain();
        sideInvert.gain.value = -1.0;
        sideLowBoost.connect(sideInvert);
        sideInvert.connect(merger, 0, 1);

        merger.connect(ctx.destination);
      }

      setIsAudioUnlocked(true);
      if (audioRef.current) {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn('Audio unlock error:', e);
    }
  };

  // ボーカル消去 ON/OFF の動的切り替え
  useEffect(() => {
    if (!midGainRef.current) return;
    if (isVocalCut) {
      midGainRef.current.gain.value = 0.12;
      if (notch1Ref.current) notch1Ref.current.gain.value = -20;
      if (notch2Ref.current) notch2Ref.current.gain.value = -28;
      if (notch3Ref.current) notch3Ref.current.gain.value = -24;
      if (notch4Ref.current) notch4Ref.current.gain.value = -18;
      if (sideLGainRef.current) sideLGainRef.current.gain.value = 0.55;
      if (sideRGainRef.current) sideRGainRef.current.gain.value = -0.55;
    } else {
      midGainRef.current.gain.value = 0.5;
      if (notch1Ref.current) notch1Ref.current.gain.value = 0;
      if (notch2Ref.current) notch2Ref.current.gain.value = 0;
      if (notch3Ref.current) notch3Ref.current.gain.value = 0;
      if (notch4Ref.current) notch4Ref.current.gain.value = 0;
      if (sideLGainRef.current) sideLGainRef.current.gain.value = 0.5;
      if (sideRGainRef.current) sideRGainRef.current.gain.value = 0.5;
    }
  }, [isVocalCut]);

  // キーチェンジ
  useEffect(() => {
    if (!audioRef.current) return;
    const pitchRatio = Math.pow(2, keyOffset / 12);
    audioRef.current.playbackRate = pitchRatio;
    const el = audioRef.current as HTMLAudioElement & { preservesPitch?: boolean; mozPreservesPitch?: boolean; webkitPreservesPitch?: boolean };
    if ('preservesPitch' in el) el.preservesPitch = false;
    if ('mozPreservesPitch' in el) el.mozPreservesPitch = false;
    if ('webkitPreservesPitch' in el) el.webkitPreservesPitch = false;
  }, [keyOffset]);

  const handleTimeUpdate = () => { if (audioRef.current) setCurrentTime(audioRef.current.currentTime); };
  const handleLoadedMetadata = () => { if (audioRef.current) setDuration(audioRef.current.duration); };

  const togglePlay = async () => {
    if (!isAudioUnlocked) { await handleUserUnlockAndPlay(); return; }
    if (!audioRef.current) return;
    if (audioCtxRef.current?.state === 'suspended') await audioCtxRef.current.resume();
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { await audioRef.current.play(); setIsPlaying(true); }
  };

  // 歌詞追従
  const activeIndex = cleanLyrics.findIndex((l) => currentTime >= l.startTime && currentTime <= l.endTime);
  let currentLine = activeIndex >= 0 ? cleanLyrics[activeIndex] : null;
  let nextLine = activeIndex >= 0 && activeIndex + 1 < cleanLyrics.length ? cleanLyrics[activeIndex + 1] : null;
  if (!currentLine && cleanLyrics.length > 0) {
    const ui = cleanLyrics.findIndex((l) => l.startTime > currentTime);
    if (ui >= 0) nextLine = cleanLyrics[ui]; else currentLine = cleanLyrics[cleanLyrics.length - 1];
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', backgroundColor: '#0f172a', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* BG */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {bgImageUrl ? <img src={bgImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(30px) brightness(0.4)', transform: 'scale(1.1)' }} /> : <div style={{ width: '100%', height: '100%', background: 'radial-gradient(circle at center, #1e1b4b 0%, #0f172a 100%)' }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15,23,42,0.6) 0%, rgba(15,23,42,0.95) 100%)' }} />
      </div>

      {/* Header */}
      <header style={{ position: 'relative', zIndex: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', backgroundColor: 'rgba(15,23,42,0.7)' }}>
        <button type="button" onClick={onReset} style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>← 戻る</button>
        <div style={{ textAlign: 'center', maxWidth: '55%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title || 'AMU KARA'}</h1>
          <span style={{ fontSize: '9px', background: '#ec4899', color: '#fff', padding: '1px 6px', borderRadius: '8px', fontWeight: 'bold', marginTop: '2px' }}>v3.1.0</span>
        </div>
        <button type="button" onClick={() => setIsVocalCut(!isVocalCut)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: isVocalCut ? 'linear-gradient(90deg,#ec4899,#a855f7)' : '#475569', color: '#fff', boxShadow: isVocalCut ? '0 0 12px rgba(236,72,153,0.5)' : 'none' }}>
          {isVocalCut ? '🎤 ボーカル抑制: ON' : '🎤 原曲: OFF'}
        </button>
      </header>

      {/* Lyrics */}
      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 20px', textAlign: 'center' }}>
        {bgImageUrl && <img src={bgImageUrl} alt="" style={{ width: '110px', height: '110px', borderRadius: '20px', objectFit: 'cover', boxShadow: '0 10px 30px rgba(236,72,153,0.3)', marginBottom: '32px', border: '2px solid rgba(255,255,255,0.2)' }} />}
        <div style={{ width: '100%', maxWidth: '560px', backgroundColor: 'rgba(15,23,42,0.75)', border: '1px solid rgba(236,72,153,0.3)', borderRadius: '24px', padding: '28px 20px', backdropFilter: 'blur(16px)', boxShadow: '0 20px 50px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxSizing: 'border-box' }}>
          <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {currentLine ? (
              <p style={{ fontSize: '26px', fontWeight: '900', margin: 0, lineHeight: '1.4', background: 'linear-gradient(90deg,#f472b6,#38bdf8,#fff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 2px 10px rgba(236,72,153,0.5))', transform: 'scale(1.05)', transition: 'all 0.2s cubic-bezier(0.175,0.885,0.32,1.275)' }}>{currentLine.text}</p>
            ) : (
              <p style={{ fontSize: '18px', color: '#64748b', margin: 0, fontStyle: 'italic' }}>🎵 演奏中...</p>
            )}
          </div>
          {nextLine && (
            <div style={{ borderTop: '1px dashed rgba(255,255,255,0.15)', paddingTop: '12px', width: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold' }}>NEXT▶</span>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#94a3b8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextLine.text}</p>
            </div>
          )}
        </div>
        {!isAudioUnlocked && (
          <button type="button" onClick={handleUserUnlockAndPlay} style={{ marginTop: '24px', padding: '16px 32px', background: 'linear-gradient(90deg,#ec4899,#a855f7)', color: '#fff', fontSize: '16px', fontWeight: 'bold', border: 'none', borderRadius: '30px', cursor: 'pointer', boxShadow: '0 8px 25px rgba(236,72,153,0.5)' }}>
            🎤 タップしてカラオケスタート！
          </button>
        )}
      </div>

      {/* Controls */}
      <footer style={{ position: 'relative', zIndex: 10, padding: '20px 24px 32px', backgroundColor: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <input type="range" min={0} max={duration || 100} value={currentTime} onChange={(e) => { const t = parseFloat(e.target.value); setCurrentTime(t); if (audioRef.current) audioRef.current.currentTime = t; }} style={{ width: '100%', accentColor: '#ec4899', cursor: 'pointer' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>
            <span>{fmt(currentTime)}</span><span>{fmt(duration)}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(30,41,59,0.8)', padding: '6px 12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#cbd5e1' }}>キー:</span>
            <button type="button" onClick={() => setKeyOffset((k) => Math.max(-6, k - 1))} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: '#334155', color: '#fff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>-</button>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: keyOffset === 0 ? '#fff' : '#f472b6', minWidth: '24px', textAlign: 'center' }}>{keyOffset > 0 ? `+${keyOffset}` : keyOffset}</span>
            <button type="button" onClick={() => setKeyOffset((k) => Math.min(6, k + 1))} style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: '#334155', color: '#fff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}>+</button>
          </div>
          <button type="button" onClick={togglePlay} style={{ width: '64px', height: '64px', borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#ec4899 0%,#a855f7 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 8px 25px rgba(236,72,153,0.5)', transition: 'transform 0.2s ease' }}>
            {isPlaying ? (<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="2" /><rect x="14" y="4" width="4" height="16" rx="2" /></svg>) : (<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '4px' }}><path d="M8 5v14l11-7z" /></svg>)}
          </button>
          <div style={{ width: '80px' }} />
        </div>
      </footer>

      <audio ref={audioRef} src={blobAudioUrl || audioUrl} crossOrigin="anonymous" onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} />
    </div>
  );
}
