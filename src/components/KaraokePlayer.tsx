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
  const midNotchRef = useRef<BiquadFilterNode | null>(null);
  const midHighCutRef = useRef<BiquadFilterNode | null>(null);

  // ト書き ([Verse], [Chorus], (Bridge) 等) の完全除去
  const cleanLyrics = lyrics.map((line) => {
    let cleanText = line.text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim();
    return { ...line, text: cleanText };
  }).filter((line) => line.text.length > 0);

  // Mid/Side (M/S) ステレオ分離 ＆ ピンポイント・ボーカルカット DSP Engine
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
          
          const splitter = ctx.createChannelSplitter(2);
          const merger = ctx.createChannelMerger(2);

          // 1. Mid (センター = L + R) 抽出ノード
          const midSum = ctx.createGain();
          midSum.gain.value = 0.5;

          // 2. Side (左右伴奏成分 = L - R) 抽出ノード
          const sideL = ctx.createGain();
          sideL.gain.value = 0.5;
          const sideR = ctx.createGain();
          sideR.gain.value = -0.5;

          // 3. Mid (ボーカル) ピンポイント強烈ノッチフィルター
          const midNotch = ctx.createBiquadFilter();
          midNotch.type = 'notch';
          midNotch.frequency.value = 1200; // ボーカルメイン周波数
          midNotch.Q.value = 2.2;

          const midHighCut = ctx.createBiquadFilter();
          midHighCut.type = 'peaking';
          midHighCut.frequency.value = 2800; // 子音・サ行帯域
          midHighCut.Q.value = 2.0;
          midHighCut.gain.value = -24;

          // 4. Side (伴奏広がり) 補強イコライザー (重低音 & 煌めきブーストで痩せ防止)
          const sideLowBoost = ctx.createBiquadFilter();
          sideLowBoost.type = 'lowshelf';
          sideLowBoost.frequency.value = 120;
          sideLowBoost.gain.value = 4;

          const sideHighBoost = ctx.createBiquadFilter();
          sideHighBoost.type = 'highshelf';
          sideHighBoost.frequency.value = 7000;
          sideHighBoost.gain.value = 4;

          midNotchRef.current = midNotch;
          midHighCutRef.current = midHighCut;

          // --- ノードパイプライン構築 ---
          sourceNodeRef.current.connect(splitter);

          // Mid (センター) 抽出
          splitter.connect(midSum, 0);
          splitter.connect(midSum, 1);

          // Mid からボーカル周波数のみピンポイントノッチカット
          midSum.connect(midNotch);
          midNotch.connect(midHighCut);

          // Side (左右伴奏) 抽出 ＆ 伴奏ブースト
          splitter.connect(sideL, 0);
          splitter.connect(sideR, 1);
          sideL.connect(sideLowBoost);
          sideR.connect(sideLowBoost);
          sideLowBoost.connect(sideHighBoost);

          // 再合成 (L = Mid_clean + Side_boost, R = Mid_clean - Side_boost)
          midHighCut.connect(merger, 0, 0);
          midHighCut.connect(merger, 0, 1);

          sideHighBoost.connect(merger, 0, 0); // Lチャンネル
          // Rチャンネルへ反転出力してステレオ定位構築
          const sideInvertR = ctx.createGain();
          sideInvertR.gain.value = -1.0;
          sideHighBoost.connect(sideInvertR);
          sideInvertR.connect(merger, 0, 1); // Rチャンネル

          merger.connect(ctx.destination);
        }

        if (midNotchRef.current && midHighCutRef.current) {
          if (isVocalCut) {
            midHighCutRef.current.gain.value = -24;
          } else {
            midHighCutRef.current.gain.value = 0;
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

  // アクティブな歌詞フレーズと次行フレーズの追従検出
  const activeIndex = cleanLyrics.findIndex(
    (line) => currentTime >= line.startTime && currentTime <= line.endTime
  );

  let currentLine = activeIndex >= 0 ? cleanLyrics[activeIndex] : null;
  let nextLine = activeIndex >= 0 && activeIndex + 1 < cleanLyrics.length ? cleanLyrics[activeIndex + 1] : null;

  if (!currentLine && cleanLyrics.length > 0) {
    const upcomingIdx = cleanLyrics.findIndex((line) => line.startTime > currentTime);
    if (upcomingIdx >= 0) {
      nextLine = cleanLyrics[upcomingIdx];
    } else {
      currentLine = cleanLyrics[cleanLyrics.length - 1];
    }
  }

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
      backgroundColor: '#0f172a',
      color: '#ffffff',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
    }}>
      {/* 背景カバー画像 ＆ ネオンエフェクト */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {bgImageUrl ? (
          <img
            src={bgImageUrl}
            alt="Song Cover"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              filter: 'blur(30px) brightness(0.4)',
              transform: 'scale(1.1)'
            }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'radial-gradient(circle at center, #1e1b4b 0%, #0f172a 100%)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(15, 23, 42, 0.6) 0%, rgba(15, 23, 42, 0.95) 100%)' }} />
      </div>

      {/* ヘッダーエリア */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(15, 23, 42, 0.7)'
      }}>
        <button
          type="button"
          onClick={onReset}
          style={{
            background: 'none',
            border: 'none',
            color: '#cbd5e1',
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

        <div style={{ textAlign: 'center', maxWidth: '55%' }}>
          <h1 style={{ fontSize: '15px', fontWeight: 'bold', color: '#ffffff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title || 'AMU KARA'}
          </h1>
        </div>

        {/* ボーカル消去リアルタイム切り替えボタン */}
        <button
          type="button"
          onClick={() => setIsVocalCut(!isVocalCut)}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 'bold',
            border: 'none',
            cursor: 'pointer',
            background: isVocalCut ? 'linear-gradient(90deg, #ec4899, #a855f7)' : '#475569',
            color: '#ffffff',
            boxShadow: isVocalCut ? '0 0 12px rgba(236, 72, 153, 0.5)' : 'none'
          }}
        >
          {isVocalCut ? '🎤 ボーカル消去: ON' : '🎤 原曲: OFF'}
        </button>
      </header>

      {/* メインカラオケ追従テロップ表示エリア */}
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
              width: '110px',
              height: '110px',
              borderRadius: '20px',
              objectFit: 'cover',
              boxShadow: '0 10px 30px rgba(236, 72, 153, 0.3)',
              marginBottom: '32px',
              border: '2px solid rgba(255, 255, 255, 0.2)'
            }}
          />
        )}

        {/* プロ仕様・カラオケ追従テロップコンテナ */}
        <div style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(236, 72, 153, 0.3)',
          borderRadius: '24px',
          padding: '28px 20px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          boxSizing: 'border-box'
        }}>
          {/* 現在追従メインテロップ */}
          <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {currentLine ? (
              <p style={{
                fontSize: '26px',
                fontWeight: '900',
                margin: 0,
                lineHeight: '1.4',
                background: 'linear-gradient(90deg, #f472b6, #38bdf8, #ffffff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 2px 10px rgba(236, 72, 153, 0.5))',
                transform: 'scale(1.05)',
                transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}>
                {currentLine.text}
              </p>
            ) : (
              <p style={{ fontSize: '18px', color: '#64748b', margin: 0, fontStyle: 'italic' }}>
                🎵 演奏中...
              </p>
            )}
          </div>

          {/* 次行予告サブテロップ */}
          {nextLine && (
            <div style={{
              borderTop: '1px dashed rgba(255, 255, 255, 0.15)',
              paddingTop: '12px',
              width: '80%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}>
              <span style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 'bold' }}>NEXT▶</span>
              <p style={{
                fontSize: '15px',
                fontWeight: '600',
                color: '#94a3b8',
                margin: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}>
                {nextLine.text}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* プレイヤーコントロールエリア */}
      <footer style={{
        position: 'relative',
        zIndex: 10,
        padding: '20px 24px 32px 24px',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
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
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* コントロールボタン群 (キー変更 & 再生/停止) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 8px' }}>
          
          {/* キーチェンジャー */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(30, 41, 59, 0.8)', padding: '6px 12px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#cbd5e1' }}>キー:</span>
            <button
              type="button"
              onClick={() => setKeyOffset((k) => Math.max(-6, k - 1))}
              style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: '#334155', color: '#ffffff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
            >
              -
            </button>
            <span style={{ fontSize: '13px', fontWeight: 'bold', color: keyOffset === 0 ? '#ffffff' : '#f472b6', minWidth: '24px', textAlign: 'center' }}>
              {keyOffset > 0 ? `+${keyOffset}` : keyOffset}
            </span>
            <button
              type="button"
              onClick={() => setKeyOffset((k) => Math.min(6, k + 1))}
              style={{ width: '28px', height: '28px', borderRadius: '50%', border: 'none', background: '#334155', color: '#ffffff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer' }}
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
              boxShadow: '0 8px 25px rgba(236, 72, 153, 0.5)',
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
