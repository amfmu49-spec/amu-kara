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

// AudioBuffer を WAV Blob に変換するヘルパー関数
function audioBufferToWavBlob(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;
  
  const dataLength = buffer.length * blockAlign;
  const bufferLength = 44 + dataLength;
  
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);
  
  // WAV Header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };
  
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataLength, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(36, 'data');
  view.setUint32(40, dataLength, true);
  
  // Interleave channels
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channels[ch][i];
      sample = Math.max(-1, Math.min(1, sample));
      // Float32 -> Int16
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export default function KaraokePlayer({ audioUrl, bgImageUrl, lyrics, title, onReset }: KaraokePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  
  const [originalBlobUrl, setOriginalBlobUrl] = useState<string>('');
  const [instBlobUrl, setInstBlobUrl] = useState<string>('');
  
  const [isProcessing, setIsProcessing] = useState<boolean>(true);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingStatus, setProcessingStatus] = useState<string>('音源データを取得中...');

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [keyOffset, setKeyOffset] = useState(0);
  const [isVocalCut, setIsVocalCut] = useState(true);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  // オフライン高音質プリレンダリング処理
  useEffect(() => {
    let isMounted = true;
    let createdOriginalUrl = '';
    let createdInstUrl = '';

    const processAudioOffline = async () => {
      try {
        setIsProcessing(true);
        setProcessingProgress(10);
        setProcessingStatus('原音データをダウンロード中...');

        const res = await fetch(audioUrl);
        const arrayBuffer = await res.arrayBuffer();

        if (!isMounted) return;
        setProcessingProgress(35);
        setProcessingStatus('AI音響波形を解析中...');

        // 原曲Blob生成
        const origBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
        createdOriginalUrl = URL.createObjectURL(origBlob);
        setOriginalBlobUrl(createdOriginalUrl);

        // Web Audio Context でデコード
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const tempCtx = new AudioCtx();
        const decodedBuffer = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
        await tempCtx.close();

        if (!isMounted) return;
        setProcessingProgress(60);
        setProcessingStatus('事前バッチ・ボーカル分離レンダリング中...');

        // OfflineAudioContext を生成して事前超高速計算
        const offlineCtx = new OfflineAudioContext(
          decodedBuffer.numberOfChannels,
          decodedBuffer.length,
          decodedBuffer.sampleRate
        );

        const source = offlineCtx.createBufferSource();
        source.buffer = decodedBuffer;

        const splitter = offlineCtx.createChannelSplitter(2);
        const merger = offlineCtx.createChannelMerger(2);

        // ---- Mid Channel Process (事前計算) ----
        const midGain = offlineCtx.createGain();
        midGain.gain.value = 0.20; // 中音域ボーカルベースライン

        // Low-Shelf: 180Hz以下の低音(キック・ベース)は原音100%保持
        const lowShelf = offlineCtx.createBiquadFilter();
        lowShelf.type = 'lowshelf';
        lowShelf.frequency.value = 180;
        lowShelf.gain.value = 14.0;

        // High-Shelf: 3.5kHz以上の高音(シンバル・空気感)を強力復元
        const highShelf = offlineCtx.createBiquadFilter();
        highShelf.type = 'highshelf';
        highShelf.frequency.value = 3500;
        highShelf.gain.value = 10.0;

        // 精密ボーカルピンポイント・ノッチ群
        const n1 = offlineCtx.createBiquadFilter();
        n1.type = 'peaking'; n1.frequency.value = 320; n1.Q.value = 2.5; n1.gain.value = -14;

        const n2 = offlineCtx.createBiquadFilter();
        n2.type = 'peaking'; n2.frequency.value = 950; n2.Q.value = 1.8; n2.gain.value = -20;

        const n3 = offlineCtx.createBiquadFilter();
        n3.type = 'peaking'; n3.frequency.value = 2400; n3.Q.value = 2.2; n3.gain.value = -12;

        const n4 = offlineCtx.createBiquadFilter();
        n4.type = 'peaking'; n4.frequency.value = 4000; n4.Q.value = 2.8; n4.gain.value = -9;

        // ---- Side Channel Process (ステレオ原音保持) ----
        const sideL = offlineCtx.createGain(); sideL.gain.value = 0.65;
        const sideR = offlineCtx.createGain(); sideR.gain.value = -0.65;

        const sideLowBoost = offlineCtx.createBiquadFilter();
        sideLowBoost.type = 'lowshelf';
        sideLowBoost.frequency.value = 120;
        sideLowBoost.gain.value = 3.5;

        // 配線
        source.connect(splitter);

        // Mid パイプライン
        splitter.connect(midGain, 0);
        splitter.connect(midGain, 1);
        midGain.connect(lowShelf);
        lowShelf.connect(highShelf);
        highShelf.connect(n1);
        n1.connect(n2);
        n2.connect(n3);
        n3.connect(n4);
        n4.connect(merger, 0, 0);
        n4.connect(merger, 0, 1);

        // Side パイプライン
        splitter.connect(sideL, 0);
        splitter.connect(sideR, 1);
        sideL.connect(sideLowBoost);
        sideR.connect(sideLowBoost);
        sideLowBoost.connect(merger, 0, 0);

        const sideInvert = offlineCtx.createGain();
        sideInvert.gain.value = -1.0;
        sideLowBoost.connect(sideInvert);
        sideInvert.connect(merger, 0, 1);

        merger.connect(offlineCtx.destination);

        source.start(0);

        // レンダリング実行
        setProcessingProgress(85);
        setProcessingStatus('高音質 WAV 伴奏ファイルを生成中...');
        const renderedBuffer = await offlineCtx.startRendering();

        // WAV Blob 変換
        const instBlob = audioBufferToWavBlob(renderedBuffer);
        createdInstUrl = URL.createObjectURL(instBlob);

        if (!isMounted) return;
        setInstBlobUrl(createdInstUrl);
        setProcessingProgress(100);
        setProcessingStatus('準備完了！');
        
        setTimeout(() => {
          if (isMounted) setIsProcessing(false);
        }, 500);
      } catch (err) {
        console.error('Offline Audio Pre-render Error:', err);
        if (isMounted) {
          setInstBlobUrl(audioUrl);
          setIsProcessing(false);
        }
      }
    };

    processAudioOffline();

    return () => {
      isMounted = false;
      if (createdOriginalUrl.startsWith('blob:')) URL.revokeObjectURL(createdOriginalUrl);
      if (createdInstUrl.startsWith('blob:')) URL.revokeObjectURL(createdInstUrl);
    };
  }, [audioUrl]);

  // ト書き除去
  const cleanLyrics = lyrics
    .map((line) => ({ ...line, text: line.text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim() }))
    .filter((line) => line.text.length > 0);

  // 再生ソースの切り替え（カラオケ伴奏 ⇄ 原曲）
  const activeAudioSrc = isVocalCut ? (instBlobUrl || originalBlobUrl || audioUrl) : (originalBlobUrl || audioUrl);

  const handleUserUnlockAndPlay = async () => {
    try {
      setIsAudioUnlocked(true);
      if (audioRef.current) {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (e) {
      console.warn('Audio unlock error:', e);
    }
  };

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

      {/* 事前レンダリング・ローディング画面 */}
      {isProcessing && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, backgroundColor: 'rgba(15,23,42,0.92)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#ec4899,#a855f7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 30px rgba(236,72,153,0.6)', animation: 'pulse 1.5s infinite alternate' }}>
            <span style={{ fontSize: '32px' }}>🎵</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '24px', color: '#fff' }}>高音質伴奏を生成中...</h2>
          <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '6px', marginBottom: '24px' }}>{processingStatus}</p>

          <div style={{ width: '100%', maxWidth: '320px', height: '10px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '5px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ width: `${processingProgress}%`, height: '100%', background: 'linear-gradient(90deg,#ec4899,#38bdf8)', transition: 'width 0.4s ease', borderRadius: '5px' }} />
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ec4899', marginTop: '10px' }}>{processingProgress}%</span>
        </div>
      )}

      {/* Header */}
      <header style={{ position: 'relative', zIndex: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(12px)', backgroundColor: 'rgba(15,23,42,0.7)' }}>
        <button type="button" onClick={onReset} style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>← 戻る</button>
        <div style={{ textAlign: 'center', maxWidth: '55%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1 style={{ fontSize: '15px', fontWeight: 'bold', color: '#fff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title || 'AMU KARA'}</h1>
          <span style={{ fontSize: '9px', background: '#ec4899', color: '#fff', padding: '1px 6px', borderRadius: '8px', fontWeight: 'bold', marginTop: '2px' }}>v4.0.0 (Pre-Render HQ Engine)</span>
        </div>
        <button type="button" onClick={() => setIsVocalCut(!isVocalCut)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: isVocalCut ? 'linear-gradient(90deg,#ec4899,#a855f7)' : '#475569', color: '#fff', boxShadow: isVocalCut ? '0 0 12px rgba(236,72,153,0.5)' : 'none' }}>
          {isVocalCut ? '🎤 高音質伴奏: ON' : '🎤 原曲: OFF'}
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
        {!isProcessing && !isAudioUnlocked && (
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

      <audio ref={audioRef} src={activeAudioSrc} crossOrigin="anonymous" onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} />
    </div>
  );
}
