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
  const [keyOffset, setKeyOffset] = useState(0); // キー変更 (-6 ～ +6 半音)

  // キー変更（ピッチ変更）適用
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

  // 現在アクティブな歌詞行の取得
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
    <div className="relative w-full min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between overflow-hidden font-sans selection:bg-pink-500 selection:text-white">
      {/* 背景カバー画像 (うっすらライトボカシ) */}
      <div className="absolute inset-0 pointer-events-none">
        {bgImageUrl ? (
          <img
            src={bgImageUrl}
            alt="Song Cover"
            className="w-full h-full object-cover filter blur-lg opacity-25 scale-110 transition-opacity duration-1000"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-pink-50/50 via-slate-50 to-cyan-50/50" />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/90 via-white/80 to-slate-50/95" />
      </div>

      {/* AIカラーライン (上部アクセント) */}
      <div className="relative z-20 h-1.5 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 shadow-sm" />

      {/* 白地ヘッダー */}
      <header className="relative z-10 p-3 flex justify-between items-center bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <button
          onClick={onReset}
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700 border border-slate-300 backdrop-blur-md active:scale-95 transition shadow-sm"
        >
          ← 戻る
        </button>
        <div className="flex flex-col items-center">
          <img
            src="/logo_cropped.png"
            alt="AMU KARA Logo"
            className="h-10 w-auto rounded-lg shadow-sm"
          />
          {title && (
            <div className="flex items-center gap-1.5 mt-0.5 max-w-[220px]">
              {bgImageUrl && (
                <img
                  src={bgImageUrl}
                  alt="Cover"
                  className="w-4 h-4 rounded-full object-cover border border-pink-400 shrink-0"
                />
              )}
              <p className="text-[10px] text-pink-600 font-bold truncate">{title}</p>
            </div>
          )}
        </div>
        <div className="w-16" /> {/* スペーサー */}
      </header>

      {/* メイン歌詞表示エリア (白地に映えるネオンカラー文字) */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center px-6 text-center py-8">
        {lyrics.length === 0 ? (
          <div className="p-6 bg-white/80 border border-slate-200 rounded-3xl backdrop-blur-md shadow-sm">
            <p className="text-slate-500 text-xs font-bold">歌詞データを取り込み中です...</p>
          </div>
        ) : (
          <div className="space-y-6 max-w-xl w-full">
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
                  className={`transition-all duration-300 transform ${
                    isActive ? 'scale-105 font-black opacity-100' : 'scale-95 opacity-30 blur-[0.2px]'
                  }`}
                >
                  <div className="relative inline-block text-xl sm:text-2xl tracking-wider leading-relaxed text-center">
                    {/* 背景文字 (未再生時: 薄いスレートグレー) */}
                    <span className="text-slate-400 select-none">{line.text}</span>

                    {/* カラオケワイプ色付き文字 (再生時: 鮮やかなAIカラーグラデーション) */}
                    <span
                      className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-pink-600 via-purple-600 to-cyan-500 overflow-hidden select-none pointer-events-none drop-shadow-[0_2px_8px_rgba(236,72,153,0.3)]"
                      style={{
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

      {/* ボトムプレイヤー & キーコントロールエリア (白地 ＋ AIカラーライン) */}
      <footer className="relative z-10 p-5 bg-white/95 backdrop-blur-xl border-t border-slate-200/90 space-y-4 shadow-xl">
        {/* キー（ピッチ）調整コントローラー */}
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-2xl p-3 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">🎹 キー変更:</span>
            <span className={`text-xs font-black px-2.5 py-0.5 rounded-full shadow-sm ${keyOffset === 0 ? 'bg-slate-200 text-slate-700' : keyOffset > 0 ? 'bg-gradient-to-r from-pink-500 to-purple-600 text-white' : 'bg-gradient-to-r from-purple-600 to-cyan-500 text-white'}`}>
              {keyOffset > 0 ? `+${keyOffset}` : keyOffset}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setKeyOffset((prev) => Math.max(-6, prev - 1))}
              className="w-8 h-8 rounded-xl bg-white active:bg-slate-100 border border-slate-300 text-xs font-bold text-cyan-600 flex items-center justify-center shadow-sm"
            >
              ♭ -1
            </button>
            <button
              onClick={() => setKeyOffset(0)}
              className="px-3 h-8 rounded-xl bg-white active:bg-slate-100 border border-slate-300 text-[11px] font-bold text-slate-600 shadow-sm"
            >
              原曲キー
            </button>
            <button
              onClick={() => setKeyOffset((prev) => Math.min(6, prev + 1))}
              className="w-8 h-8 rounded-xl bg-white active:bg-slate-100 border border-slate-300 text-xs font-bold text-pink-600 flex items-center justify-center shadow-sm"
            >
              ♯ +1
            </button>
          </div>
        </div>

        {/* シークバー & 時間表示 */}
        <div className="space-y-1">
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
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-pink-500 shadow-inner"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono font-bold">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* スタイリッシュなAIグラデーション再生ボタン */}
        <div className="flex justify-center pt-1">
          <button
            onClick={togglePlay}
            className="group relative w-16 h-16 rounded-full bg-gradient-to-r from-pink-500 via-purple-600 to-cyan-400 p-0.5 shadow-xl shadow-pink-500/25 active:scale-95 transition transform hover:scale-105"
          >
            <div className="w-full h-full rounded-full bg-white flex items-center justify-center group-hover:bg-opacity-90 transition">
              {isPlaying ? (
                /* スタイリッシュ一時停止アイコン */
                <svg className="w-6 h-6 text-pink-600 fill-current" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                /* スタイリッシュ再生アイコン */
                <svg className="w-6 h-6 text-pink-600 fill-current ml-1" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </div>
          </button>
        </div>

        {/* Audio Element */}
        <audio
          ref={audioRef}
          src={audioUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
        />
      </footer>

      {/* AIアクセントライン (下部) */}
      <div className="relative z-20 h-1.5 bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 shadow-sm" />
    </div>
  );
}
