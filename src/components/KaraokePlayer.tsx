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
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const activeLine = lyrics.find(
    (line) => currentTime >= line.startTime && currentTime <= line.endTime
  );

  const activeIndex = lyrics.findIndex((line) => line.id === activeLine?.id);
  const startIdx = Math.max(0, activeIndex - 1);
  const displayLines = lyrics.slice(startIdx, startIdx + 3);

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
              filter: 'blur(20px)',
              opacity: 0.2,
              transform: 'scale(1.1)'
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #fce7f3 0%, #f8fafc 50%, #e0f2fe 100%)' }} />
        )}
      </div>

      {/* AIアクセントライン (上部) */}
      <div style={{ position: 'relative', zIndex: 20, height: '6px', background: 'linear-gradient(90deg, #ec4899, #a855f7, #06b6d4)' }} />

      {/* ヘッダー */}
      <header style={{
        position: 'relative', zIndex: 10, padding: '12px 16px',
        background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(8px)',
        borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
      }}>
        <button
          onClick={onReset}
          style={{
            padding: '6px 14px', borderRadius: '12px', background: '#f1f5f9',
            border: '1px solid #cbd5e1', color: '#334155', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer'
          }}
        >
          ← 戻る
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img
            src="logo_cropped.png"
            alt="AMU KARA Logo"
            style={{ height: '36px', width: 'auto', borderRadius: '8px' }}
          />
          {title && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px', maxWidth: '200px' }}>
              {bgImageUrl && (
                <img
                  src={bgImageUrl}
                  alt="Cover"
                  style={{ width: '16px', height: '16px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #ec4899' }}
                />
              )}
              <p style={{ fontSize: '11px', color: '#db2777', fontWeight: 'bold', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</p>
            </div>
          )}
        </div>
        <div style={{ width: '60px' }} />
      </header>

      {/* メイン歌詞表示エリア */}
      <main style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '24px 16px', textAlign: 'center' }}>
        {lyrics.length === 0 ? (
          <div style={{ padding: '24px', background: 'rgba(255, 255, 255, 0.85)', border: '1px solid #e2e8f0', borderRadius: '24px' }}>
            <p style={{ color: '#64748b', fontSize: '13px', fontWeight: 'bold', margin: 0 }}>歌詞データを取り込み中です...</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '500px', width: '100%' }}>
            {displayLines.map((line) => {
              const isActive = activeLine?.id === line.id;
              
              let wipeProgress = 0;
              if (isActive) {
                const totalDur = line.endTime - line.startTime;
                const elapsed = currentTime - line.startTime;
                wipeProgress = totalDur > 0 ? Math.min(Math.max(elapsed / totalDur, 0), 1) : 1;
              } else if (currentTime > line.endTime) {
                wipeProgress = 1;
              }

              return (
                <div
                  key={line.id}
                  style={{
                    transition: 'all 0.3s ease',
                    transform: isActive ? 'scale(1.05)' : 'scale(0.95)',
                    opacity: isActive ? 1 : 0.35,
                    fontWeight: isActive ? '900' : 'normal'
                  }}
                >
                  <div style={{ position: 'relative', display: 'inline-block', fontSize: '22px', letterSpacing: '0.05em', lineHeight: 1.6, textAlign: 'center' }}>
                    <span style={{ color: '#94a3b8', userSelect: 'none' }}>{line.text}</span>

                    <span
                      style={{
                        position: 'absolute', inset: 0,
                        background: 'linear-gradient(90deg, #db2777, #9333ea, #0284c7)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        overflow: 'hidden',
                        userSelect: 'none',
                        pointerEvents: 'none',
                        clipPath: `inset(0 ${100 - wipeProgress * 100}% 0 0)`
                      }}
                    >
                      {line.text}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* プレイヤー ＆ キーコントローラー */}
      <footer style={{
        position: 'relative', zIndex: 10, padding: '20px',
        background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(16px)',
        borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '16px',
        boxShadow: '0 -10px 25px rgba(0,0,0,0.05)'
      }}>
        {/* キーコントロール */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '10px 14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#334155' }}>🎹 キー変更:</span>
            <span style={{
              fontSize: '12px', fontWeight: '900', padding: '2px 10px', borderRadius: '12px', color: '#ffffff',
              background: keyOffset === 0 ? '#64748b' : keyOffset > 0 ? '#db2777' : '#0284c7'
            }}>
              {keyOffset > 0 ? `+${keyOffset}` : keyOffset}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setKeyOffset((prev) => Math.max(-6, prev - 1))}
              style={{ padding: '6px 10px', borderRadius: '10px', background: '#ffffff', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 'bold', color: '#0284c7', cursor: 'pointer' }}
            >
              ♭ -1
            </button>
            <button
              onClick={() => setKeyOffset(0)}
              style={{ padding: '6px 12px', borderRadius: '10px', background: '#ffffff', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 'bold', color: '#475569', cursor: 'pointer' }}
            >
              原曲キー
            </button>
            <button
              onClick={() => setKeyOffset((prev) => Math.min(6, prev + 1))}
              style={{ padding: '6px 10px', borderRadius: '10px', background: '#ffffff', border: '1px solid #cbd5e1', fontSize: '12px', fontWeight: 'bold', color: '#db2777', cursor: 'pointer' }}
            >
              ♯ +1
            </button>
          </div>
        </div>

        {/* シークバー */}
        <div style={{ width: '100%' }}>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setCurrentTime(val);
              if (audioRef.current) audioRef.current.currentTime = val;
            }}
            style={{ width: '100%', accentColor: '#db2777' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#64748b', fontFamily: 'monospace', marginTop: '2px' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* スタイリッシュ再生ボタン */}
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={togglePlay}
            style={{
              width: '60px', height: '60px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #ec4899, #a855f7, #06b6d4)',
              padding: '2px', border: 'none', cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(236, 72, 153, 0.35)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isPlaying ? (
                <svg style={{ width: '22px', height: '22px', fill: '#db2777' }} viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg style={{ width: '22px', height: '22px', fill: '#db2777', marginLeft: '3px' }} viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>
          </button>
        </div>

        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
      </footer>

      {/* AIアクセントライン (下部) */}
      <div style={{ position: 'relative', zIndex: 20, height: '6px', background: 'linear-gradient(90deg, #a855f7, #ec4899, #06b6d4)' }} />
    </div>
  );
}
