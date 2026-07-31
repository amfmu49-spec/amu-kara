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
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [keyOffset, setKeyOffset] = useState(0);
  const [isVocalCut, setIsVocalCut] = useState(true);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const splitterNodeRef = useRef<ChannelSplitterNode | null>(null);
  const gainLNodeRef = useRef<GainNode | null>(null);
  const gainRNodeRef = useRef<GainNode | null>(null);
  const mergerNodeRef = useRef<ChannelMergerNode | null>(null);

  // ト書き ([Verse], [Chorus] 等) の完全フィルター処理
  const cleanLyrics = lyrics.map((line) => {
    let cleanText = line.text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
    return { ...line, text: cleanText };
  }).filter((line) => line.text.length > 0);

  // Web Audio API によるスマホ単体・リアルタイムボーカル消去 (L - R 位相キャンセル)
  useEffect(() => {
    if (!audioRef.current) return;

    const setupAudioContext = () => {
      try {
        if (!audioCtxRef.current) {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioCtxRef.current = new AudioCtx();
        }

        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') {
          ctx.resume();
        }

        if (!sourceNodeRef.current && audioRef.current) {
          sourceNodeRef.current = ctx.createMediaElementSource(audioRef.current);
          
          // ステレオ分離
          const splitter = ctx.createChannelSplitter(2);
          const gainL = ctx.createGain();
          const gainR = ctx.createGain();
          const merger = ctx.createChannelMerger(2);

          sourceNodeRef.current.connect(splitter);

          // L - R 相殺回路
          splitter.connect(gainL, 0);
          splitter.connect(gainR, 1);

          splitterNodeRef.current = splitter;
          gainLNodeRef.current = gainL;
          gainRNodeRef.current = gainR;
          mergerNodeRef.current = merger;

          merger.connect(ctx.destination);
        }

        if (gainLNodeRef.current && gainRNodeRef.current && mergerNodeRef.current && splitterNodeRef.current) {
          sourceNodeRef.current?.disconnect();

          if (isVocalCut) {
            // ボーカル消去 ON: Lチャンネルに (+1.0), Rチャンネルに (-1.0) を設定して逆相合成
            gainLNodeRef.current.gain.value = 1.0;
            gainRNodeRef.current.gain.value = -1.0;

            splitterNodeRef.current.connect(gainLNodeRef.current, 0);
            splitterNodeRef.current.connect(gainRNodeRef.current, 1);

            gainLNodeRef.current.connect(mergerNodeRef.current, 0, 0);
            gainLNodeRef.current.connect(mergerNodeRef.current, 0, 1);
            gainRNodeRef.current.connect(mergerNodeRef.current, 0, 0);
            gainRNodeRef.current.connect(mergerNodeRef.current, 0, 1);
          } else {
            // ボーカル消去 OFF: 通常ステレオ出力
            sourceNodeRef.current?.connect(ctx.destination);
          }
        }
      } catch (e) {
        console.warn('Web Audio API setup fallback:', e);
      }
    };

    setupAudioContext();
  }, [isVocalCut]);

  useEffect(() => {
    if (audioRef.current) {
      const pitchRatio = Math.pow(2, keyOffset / 12);
      audioRef.current.playbackRate = pitchRatio;
      
      const audioEl = audioRef.current as HTMLAudioElement & { preservesPitch?: boolean; mozPreservesPitch?: boolean; webkitPreservesPitch?: boolean };
      if ('preservesPitch' in audioEl) audioEl.preservesPitch = false;
      if ('mozPreservesPitch' in audioEl) audioEl.mozPreservesPitch = false;
      if ('webkitPreservesPitch' in audioEl) audioEl.webkitPreservesPitch = false;
    }
  }, [keyOffset]);

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const activeLine = cleanLyrics.find(
    (line) => currentTime >= line.startTime && currentTime <= line.endTime
  );

  const activeIndex = cleanLyrics.findIndex((line) => line.id === activeLine?.id);
  const startIdx = Math.max(0, activeIndex - 1);
  const displayLines = cleanLyrics.slice(startIdx, startIdx + 3);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      color: '#0f172a',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* 背景カバー画像 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {bgImageUrl ? (
          <img
            src={bgImageUrl}
            alt="Song Cover"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(24px)',
              opacity: 0.2,
              transform: 'scale(1.1)'
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #fce7f3 0%, #f8fafc 50%, #e0f2fe 100%)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 40%, rgba(248, 250, 252, 0.8) 100%)' }} />
      </div>

      {/* ヘッダーエリア */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
        backdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255, 255, 255, 0.6)'
      }}>
        <button
          type="button"
          onClick={onReset}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          ← 戻る
        </button>

        <div style={{ textAlign: 'center', maxWidth: '60%' }}>
          <h1 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title || 'AMU KARA'}
          </h1>
        </div>

        {/* ボーカル消去リアルタイム切り替えボタン */}
        <button
          type="button"
          onClick={() => setIsVocalCut(!isVocalCut)}
          style={{
            padding: '6px 12px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer',
            background: isVocalCut ? 'linear-gradient(90deg, #ec4899, #a855f7)' : '#cbd5e1',
            color: '#ffffff',
            boxShadow: isVocalCut ? '0 2px 8px rgba(236, 72, 153, 0.3)' : 'none'
          }}
        >
          {isVocalCut ? '🎤 ボーカル消去: ON' : '🎤 原曲: OFF'}
        </button>
      </header>

      {/* メインカラオケ歌詞表示エリア */}
      <div style={{
        position: 'relative',
        zIndex: 10,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        textAlign: 'center'
      }}>
        {/* ジャケ写 */}
        {bgImageUrl && (
          <img
            src={bgImageUrl}
            alt="Track Artwork"
            style={{
              width: '120px',
              height: '120px',
              borderRadius: '20px',
              objectFit: 'cover',
              boxShadow: '0 12px 30px rgba(0, 0, 0, 0.15)',
              marginBottom: '28px',
              border: '3px solid #ffffff'
            }}
          />
        )}

        {/* 歌詞スクロール表示 */}
        <div style={{ width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {displayLines.length > 0 ? (
            displayLines.map((line) => {
              const isActive = activeLine?.id === line.id;
              return (
                <p
                  key={line.id}
                  style={{
                    fontSize: isActive ? '22px' : '15px',
                    fontWeight: isActive ? 'bold' : 'normal',
                    color: isActive ? '#ec4899' : '#94a3b8',
                    transition: 'all 0.3s ease',
                    margin: 0,
                    lineHeight: '1.4',
                    textShadow: isActive ? '0 2px 10px rgba(236, 72, 153, 0.2)' : 'none',
                    transform: isActive ? 'scale(1.05)' : 'scale(1.0)'
                  }}
                >
                  {line.text}
                </p>
              );
            })
          ) : (
            <p style={{ fontSize: '16px', color: '#94a3b8', fontStyle: 'italic' }}>
              🎵 演奏中...
            </p>
          )}
        </div>
      </div>

      {/* プレイヤーコントロールエリア */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        padding: '20px 24px 32px 24px',
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        backdropFilter: 'blur(16px)',
        borderTop: '1px solid rgba(226, 232, 240, 0.8)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px'
      }}>
        {/* シークバー ＆ タイム */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              const newTime = parseFloat(e.target.value);
              setCurrentTime(newTime);
              if (audioRef.current) audioRef.current.currentTime = newTime;
            }}
            style={{
              width: '100%',
              accentColor: '#ec4899',
              cursor: 'pointer'
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* コントロールボタン群 (キー変更 & 再生/停止) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
          
          {/* キーチェンジャー */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569' }}>キー:</span>
            <button
              type="button"
              onClick={() => setKeyOffset((k) => Math.max(-6, k - 1))}
              style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: '#ffffff', color: '#0f172a', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
            >
              -
            </button>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: keyOffset === 0 ? '#0f172a' : '#ec4899', minWidth: '24px', textAlign: 'center' }}>
              {keyOffset > 0 ? `+${keyOffset}` : keyOffset}
            </span>
            <button
              type="button"
              onClick={() => setKeyOffset((k) => Math.min(6, k + 1))}
              style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: '#ffffff', color: '#0f172a', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}
            >
              +
            </button>
          </div>

          {/* メインスタイリッシュ再生ボタン */}
          <button
            type="button"
            onClick={togglePlay}
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              border: 'none',
              background: 'linear-gradient(135deg, #ec4899 0%, #a855f7 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(236, 72, 153, 0.4)',
              transition: 'transform 0.2s ease'
            }}
          >
            {isPlaying ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="2" />
                <rect x="14" y="4" width="4" height="16" rx="2" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '4px' }}>
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <div style={{ width: '80px' }} />
        </div>
      </footer>

      <audio
        ref={audioRef}
        src={audioUrl}
        crossOrigin="anonymous"
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        autoPlay
      />
    </div>
  );
}
