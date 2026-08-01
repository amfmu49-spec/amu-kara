'use client';

import React, { useState, useRef, useEffect } from 'react';
import { LyricLine } from '@/lib/srtParser';
import { saveAudioCache, getAudioCache } from '@/lib/audioCache';

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
  
  const channels: Float32Array[] = [];
  for (let i = 0; i < numChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }
  
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = channels[ch][i];
      sample = Math.max(-1, Math.min(1, sample));
      const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(offset, intSample, true);
      offset += 2;
    }
  }
  
  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

export default function KaraokePlayer({ audioUrl, bgImageUrl, lyrics, title, onReset }: KaraokePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
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

  // 5バンド EQ パネル表示切り替え & 自動保存付き 5バンド EQ 値 (-12 ~ +12 dB)
  const [showEqPanel, setShowEqPanel] = useState(false);
  const [eq60, setEq60] = useState(0);
  const [eq250, setEq250] = useState(0);
  const [eq1000, setEq1000] = useState(0);
  const [eq4000, setEq4000] = useState(0);
  const [eq12000, setEq12000] = useState(0);

  // 初回ロード時に EQ 保存設定を復元
  useEffect(() => {
    try {
      const saved = localStorage.getItem('amu_kara_eq_settings_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed.eq60 === 'number') setEq60(parsed.eq60);
        if (typeof parsed.eq250 === 'number') setEq250(parsed.eq250);
        if (typeof parsed.eq1000 === 'number') setEq1000(parsed.eq1000);
        if (typeof parsed.eq4000 === 'number') setEq4000(parsed.eq4000);
        if (typeof parsed.eq12000 === 'number') setEq12000(parsed.eq12000);
      }
    } catch (e) {
      console.warn('Failed to load saved EQ settings:', e);
    }
  }, []);

  // EQ 設定が変更されたら localStorage に自動保存
  const saveEqSettings = (newEq: { eq60?: number; eq250?: number; eq1000?: number; eq4000?: number; eq12000?: number }) => {
    try {
      const updated = {
        eq60: newEq.eq60 !== undefined ? newEq.eq60 : eq60,
        eq250: newEq.eq250 !== undefined ? newEq.eq250 : eq250,
        eq1000: newEq.eq1000 !== undefined ? newEq.eq1000 : eq1000,
        eq4000: newEq.eq4000 !== undefined ? newEq.eq4000 : eq4000,
        eq12000: newEq.eq12000 !== undefined ? newEq.eq12000 : eq12000,
      };
      localStorage.setItem('amu_kara_eq_settings_v1', JSON.stringify(updated));
    } catch (e) {
      console.warn('Failed to save EQ settings:', e);
    }
  };

  // Node Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  
  const f60Ref = useRef<BiquadFilterNode | null>(null);
  const f250Ref = useRef<BiquadFilterNode | null>(null);
  const f1000Ref = useRef<BiquadFilterNode | null>(null);
  const f4000Ref = useRef<BiquadFilterNode | null>(null);
  const f12000Ref = useRef<BiquadFilterNode | null>(null);

  const animFrameIdRef = useRef<number | null>(null);

  // オフライン高音質プリレンダリング処理 ＋ IndexedDB キャッシュ判定
  useEffect(() => {
    let isMounted = true;
    let createdOriginalUrl = '';
    let createdInstUrl = '';

    const processAudioOffline = async () => {
      try {
        setIsProcessing(true);
        setProcessingProgress(15);
        setProcessingStatus('キャッシュを確認中...');

        // 1. IndexedDB キャッシュを判定
        const cachedBlob = await getAudioCache(audioUrl);
        if (cachedBlob && isMounted) {
          setProcessingProgress(90);
          setProcessingStatus('⚡ 保存済みキャッシュから秒速ロード中...');

          // 原曲取得
          const res = await fetch(audioUrl);
          const arrayBuffer = await res.arrayBuffer();
          const origBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
          createdOriginalUrl = URL.createObjectURL(origBlob);
          setOriginalBlobUrl(createdOriginalUrl);

          createdInstUrl = URL.createObjectURL(cachedBlob);
          setInstBlobUrl(createdInstUrl);

          setProcessingProgress(100);
          setProcessingStatus('キャッシュから読み込み完了！');
          setTimeout(() => {
            if (isMounted) setIsProcessing(false);
          }, 300);
          return;
        }

        // 2. キャッシュがない場合、新規ダウンロード ＆ 事前バッチ計算
        setProcessingProgress(25);
        setProcessingStatus('原音データをダウンロード中...');

        const res = await fetch(audioUrl);
        const arrayBuffer = await res.arrayBuffer();

        if (!isMounted) return;
        setProcessingProgress(45);
        setProcessingStatus('AI音響波形を解析中...');

        const origBlob = new Blob([arrayBuffer], { type: 'audio/mp3' });
        createdOriginalUrl = URL.createObjectURL(origBlob);
        setOriginalBlobUrl(createdOriginalUrl);

        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const tempCtx = new AudioCtx();
        const decodedBuffer = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
        await tempCtx.close();

        if (!isMounted) return;
        setProcessingProgress(70);
        setProcessingStatus('事前バッチ・ボーカル分離レンダリング中...');

        const offlineCtx = new OfflineAudioContext(
          decodedBuffer.numberOfChannels,
          decodedBuffer.length,
          decodedBuffer.sampleRate
        );

        const source = offlineCtx.createBufferSource();
        source.buffer = decodedBuffer;

        const splitter = offlineCtx.createChannelSplitter(2);
        const merger = offlineCtx.createChannelMerger(2);

        const midGain = offlineCtx.createGain();
        midGain.gain.value = 0.20;

        const lowShelf = offlineCtx.createBiquadFilter();
        lowShelf.type = 'lowshelf'; lowShelf.frequency.value = 180; lowShelf.gain.value = 14.0;

        const highShelf = offlineCtx.createBiquadFilter();
        highShelf.type = 'highshelf'; highShelf.frequency.value = 3500; highShelf.gain.value = 10.0;

        const n1 = offlineCtx.createBiquadFilter();
        n1.type = 'peaking'; n1.frequency.value = 320; n1.Q.value = 2.5; n1.gain.value = -14;

        const n2 = offlineCtx.createBiquadFilter();
        n2.type = 'peaking'; n2.frequency.value = 950; n2.Q.value = 1.8; n2.gain.value = -20;

        const n3 = offlineCtx.createBiquadFilter();
        n3.type = 'peaking'; n3.frequency.value = 2400; n3.Q.value = 2.2; n3.gain.value = -12;

        const n4 = offlineCtx.createBiquadFilter();
        n4.type = 'peaking'; n4.frequency.value = 4000; n4.Q.value = 2.8; n4.gain.value = -9;

        const sideL = offlineCtx.createGain(); sideL.gain.value = 0.65;
        const sideR = offlineCtx.createGain(); sideR.gain.value = -0.65;

        const sideLowBoost = offlineCtx.createBiquadFilter();
        sideLowBoost.type = 'lowshelf'; sideLowBoost.frequency.value = 120; sideLowBoost.gain.value = 3.5;

        source.connect(splitter);

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

        setProcessingProgress(88);
        setProcessingStatus('高音質 WAV 伴奏ファイルを生成中...');
        const renderedBuffer = await offlineCtx.startRendering();

        const instBlob = audioBufferToWavBlob(renderedBuffer);
        createdInstUrl = URL.createObjectURL(instBlob);

        // 次回の超高速ロード用に IndexedDB に保存
        await saveAudioCache(audioUrl, instBlob);

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

  // リアルタイム 5バンド EQ ＋ クッキリ直角バー分析ビジュアライザー描画
  useEffect(() => {
    if (isProcessing) return;

    const setupAudioNodes = () => {
      try {
        if (!audioCtxRef.current) {
          const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;

        if (!f60Ref.current) {
          const f = ctx.createBiquadFilter(); f.type = 'lowshelf'; f.frequency.value = 60; f.gain.value = eq60; f60Ref.current = f;
        }
        if (!f250Ref.current) {
          const f = ctx.createBiquadFilter(); f.type = 'peaking'; f.frequency.value = 250; f.Q.value = 1.0; f.gain.value = eq250; f250Ref.current = f;
        }
        if (!f1000Ref.current) {
          const f = ctx.createBiquadFilter(); f.type = 'peaking'; f.frequency.value = 1000; f.Q.value = 1.0; f.gain.value = eq1000; f1000Ref.current = f;
        }
        if (!f4000Ref.current) {
          const f = ctx.createBiquadFilter(); f.type = 'peaking'; f.frequency.value = 4000; f.Q.value = 1.0; f.gain.value = eq4000; f4000Ref.current = f;
        }
        if (!f12000Ref.current) {
          const f = ctx.createBiquadFilter(); f.type = 'highshelf'; f.frequency.value = 12000; f.gain.value = eq12000; f12000Ref.current = f;
        }

        if (!analyserRef.current) {
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 64;
          analyser.smoothingTimeConstant = 0.75;
          analyserRef.current = analyser;
        }

        if (!sourceNodeRef.current && audioRef.current) {
          const sourceNode = ctx.createMediaElementSource(audioRef.current);
          sourceNode.connect(f60Ref.current);
          f60Ref.current.connect(f250Ref.current);
          f250Ref.current.connect(f1000Ref.current);
          f1000Ref.current.connect(f4000Ref.current);
          f4000Ref.current.connect(f12000Ref.current);
          f12000Ref.current.connect(analyserRef.current);
          analyserRef.current.connect(ctx.destination);
          sourceNodeRef.current = sourceNode;
        }
      } catch (e) {
        console.warn('Audio nodes setup warning:', e);
      }
    };

    setupAudioNodes();

    // Canvas 描画（直角ソリッド長方形）
    const canvas = canvasRef.current;
    if (!canvas) return;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyserRef.current ? analyserRef.current.frequencyBinCount : 32;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animFrameIdRef.current = requestAnimationFrame(draw);

      if (analyserRef.current && isPlaying) {
        analyserRef.current.getByteFrequencyData(dataArray);
      } else {
        dataArray.fill(0);
      }

      const width = canvas.width;
      const height = canvas.height;

      canvasCtx.clearRect(0, 0, width, height);

      canvasCtx.shadowBlur = 0;
      canvasCtx.shadowOffsetX = 0;
      canvasCtx.shadowOffsetY = 0;

      const barCount = 28;
      const barWidth = (width / barCount) - 3;
      let x = 0;

      for (let i = 0; i < barCount; i++) {
        const barHeightPercent = isPlaying ? (dataArray[i] / 255) : 0.05;
        const barHeight = Math.max(4, barHeightPercent * height * 0.88);

        const gradient = canvasCtx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#db2777');
        gradient.addColorStop(0.5, '#9333ea');
        gradient.addColorStop(1, '#0284c7');

        canvasCtx.fillStyle = gradient;

        const y = height - barHeight;

        // 直角ソリッド長方形バーを描画
        canvasCtx.fillRect(x, y, barWidth, barHeight);

        x += barWidth + 3;
      }
    };

    draw();

    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [isProcessing, isPlaying]);

  useEffect(() => {
    if (f60Ref.current) f60Ref.current.gain.value = eq60;
    if (f250Ref.current) f250Ref.current.gain.value = eq250;
    if (f1000Ref.current) f1000Ref.current.gain.value = eq1000;
    if (f4000Ref.current) f4000Ref.current.gain.value = eq4000;
    if (f12000Ref.current) f12000Ref.current.gain.value = eq12000;
  }, [eq60, eq250, eq1000, eq4000, eq12000]);

  // ト書き除去
  const cleanLyrics = lyrics
    .map((line) => ({ ...line, text: line.text.replace(/\[.*?\]/g, '').replace(/\(.*?\)/g, '').trim() }))
    .filter((line) => line.text.length > 0);

  const activeAudioSrc = isVocalCut ? (instBlobUrl || originalBlobUrl || audioUrl) : (originalBlobUrl || audioUrl);

  const handleToggleVocalCut = () => {
    const cur = audioRef.current ? audioRef.current.currentTime : currentTime;
    const playing = isPlaying;
    setIsVocalCut(!isVocalCut);
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.currentTime = cur;
        if (playing) audioRef.current.play().catch(() => {});
      }
    }, 50);
  };

  const handleUserUnlockAndPlay = async () => {
    try {
      if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
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
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      await audioCtxRef.current.resume();
    }
    if (isPlaying) { audioRef.current.pause(); setIsPlaying(false); }
    else { await audioRef.current.play(); setIsPlaying(true); }
  };

  const activeIndex = cleanLyrics.findIndex((l) => currentTime >= l.startTime && currentTime <= l.endTime);
  let currentLine = activeIndex >= 0 ? cleanLyrics[activeIndex] : null;
  let nextLine = activeIndex >= 0 && activeIndex + 1 < cleanLyrics.length ? cleanLyrics[activeIndex + 1] : null;
  if (!currentLine && cleanLyrics.length > 0) {
    const ui = cleanLyrics.findIndex((l) => l.startTime > currentTime);
    if (ui >= 0) nextLine = cleanLyrics[ui]; else currentLine = cleanLyrics[cleanLyrics.length - 1];
  }

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  return (
    <div style={{ position: 'relative', width: '100%', minHeight: '100vh', backgroundColor: '#f8fafc', color: '#0f172a', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', overflow: 'hidden', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      
      {/* 白基調・AIスタイリッシュ背景 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {bgImageUrl ? (
          <img src={bgImageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'blur(45px) brightness(0.95) opacity(0.25)', transform: 'scale(1.1)' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'radial-gradient(circle at 50% 30%, #f1f5f9 0%, #e2e8f0 100%)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 20%, rgba(236,72,153,0.08) 0%, transparent 40%), radial-gradient(circle at 80% 80%, rgba(56,189,248,0.1) 0%, transparent 40%)' }} />
      </div>

      {/* 事前レンダリング・ローディング画面 (AI White Design) */}
      {isProcessing && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 50, backgroundColor: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(20px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', textAlign: 'center' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg,#ec4899,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 10px 25px rgba(236,72,153,0.3)', animation: 'pulse 1.5s infinite alternate' }}>
            <span style={{ fontSize: '32px' }}>🎵</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginTop: '24px', color: '#0f172a' }}>高音質AI伴奏をロード中...</h2>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '6px', marginBottom: '24px' }}>{processingStatus}</p>

          <div style={{ width: '100%', maxWidth: '320px', height: '10px', backgroundColor: '#e2e8f0', borderRadius: '5px', overflow: 'hidden', border: '1px solid #cbd5e1' }}>
            <div style={{ width: `${processingProgress}%`, height: '100%', background: 'linear-gradient(90deg,#ec4899,#0284c7)', transition: 'width 0.4s ease', borderRadius: '5px' }} />
          </div>
          <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#ec4899', marginTop: '10px' }}>{processingProgress}%</span>
        </div>
      )}

      {/* Header (White AI Style) */}
      <header style={{ position: 'relative', zIndex: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(226,232,240,0.8)', backdropFilter: 'blur(16px)', backgroundColor: 'rgba(255,255,255,0.85)', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        <button type="button" onClick={onReset} style={{ background: 'none', border: 'none', color: '#475569', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>← 戻る</button>
        <div style={{ textAlign: 'center', maxWidth: '45%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <h1 style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title || 'AMU KARA'}</h1>
          <span style={{ fontSize: '9px', background: 'linear-gradient(90deg,#ec4899,#0284c7)', color: '#fff', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold', marginTop: '2px' }}>v7.2.0</span>
        </div>
        
        {/* 原曲 ⇄ 伴奏シームレス聞き比べボタン */}
        <button type="button" onClick={handleToggleVocalCut} style={{ padding: '7px 14px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', border: 'none', cursor: 'pointer', background: isVocalCut ? 'linear-gradient(90deg,#ec4899,#a855f7)' : '#0284c7', color: '#fff', boxShadow: '0 4px 14px rgba(236,72,153,0.3)', transition: 'all 0.2s' }}>
          {isVocalCut ? '🎧 伴奏 (ボーカル切)' : '🎵 原曲 (聞き比べ中)'}
        </button>
      </header>

      {/* Lyrics & Sharp Visualizer Display */}
      <div style={{ position: 'relative', zIndex: 10, flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px 20px', textAlign: 'center' }}>
        {bgImageUrl && <img src={bgImageUrl} alt="" style={{ width: '95px', height: '95px', borderRadius: '20px', objectFit: 'cover', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginBottom: '12px', border: '3px solid #ffffff' }} />}
        
        {/* 直角ソリッドビジュアライザー (Canvas) */}
        <div style={{ width: '100%', maxWidth: '360px', height: '40px', marginBottom: '12px', display: 'flex', justifyContent: 'center', alignItems: 'flex-end', background: '#ffffff', borderRadius: '12px', padding: '4px 10px', border: '2px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
          <canvas ref={canvasRef} width={320} height={32} style={{ display: 'block' }} />
        </div>

        {/* 歌詞カード (AI Glass White Panel) */}
        <div style={{ width: '100%', maxWidth: '560px', backgroundColor: 'rgba(255,255,255,0.85)', border: '2px solid #e2e8f0', borderRadius: '24px', padding: '24px 20px', backdropFilter: 'blur(16px)', boxShadow: '0 10px 35px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', boxSizing: 'border-box' }}>
          <div style={{ minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {currentLine ? (
              <p style={{ fontSize: '26px', fontWeight: '900', margin: 0, lineHeight: '1.4', background: 'linear-gradient(90deg,#db2777,#0284c7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))', transform: 'scale(1.05)', transition: 'all 0.2s cubic-bezier(0.175,0.885,0.32,1.275)' }}>{currentLine.text}</p>
            ) : (
              <p style={{ fontSize: '18px', color: '#94a3b8', margin: 0, fontStyle: 'italic' }}>🎵 演奏中...</p>
            )}
          </div>
          {nextLine && (
            <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '12px', width: '80%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11px', color: '#0284c7', fontWeight: 'bold' }}>NEXT▶</span>
              <p style={{ fontSize: '15px', fontWeight: '600', color: '#64748b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextLine.text}</p>
            </div>
          )}
        </div>

        {!isProcessing && !isAudioUnlocked && (
          <button type="button" onClick={handleUserUnlockAndPlay} style={{ marginTop: '16px', padding: '14px 28px', background: 'linear-gradient(90deg,#ec4899,#a855f7)', color: '#fff', fontSize: '15px', fontWeight: 'bold', border: 'none', borderRadius: '30px', cursor: 'pointer', boxShadow: '0 8px 20px rgba(236,72,153,0.4)' }}>
            🎤 タップしてカラオケスタート！
          </button>
        )}
      </div>

      {/* Controls & 5-Band EQ Panel (White AI Style) */}
      <footer style={{ position: 'relative', zIndex: 10, padding: '14px 16px 20px', backgroundColor: 'rgba(255,255,255,0.9)', backdropFilter: 'blur(20px)', borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 -4px 20px rgba(0,0,0,0.03)' }}>
        
        {/* 5-Band EQ Customizer Panel */}
        {showEqPanel && (
          <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '16px', border: '2px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#db2777' }}>🎛️ 5バンド・イコライザー (自動保存中)</span>
              <button type="button" onClick={() => { 
                setEq60(0); setEq250(0); setEq1000(0); setEq4000(0); setEq12000(0); 
                saveEqSettings({ eq60: 0, eq250: 0, eq1000: 0, eq4000: 0, eq12000: 0 });
              }} style={{ fontSize: '10px', background: '#cbd5e1', color: '#0f172a', border: 'none', padding: '2px 8px', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>リセット</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', fontSize: '10px' }}>
              {/* 60Hz */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#334155' }}>
                  <span>重低音</span>
                  <span style={{ color: '#db2777', fontWeight: 'bold' }}>60Hz</span>
                  <span style={{ fontSize: '9px', color: '#db2777', fontWeight: 'bold' }}>{eq60 > 0 ? `+${eq60}` : eq60}dB</span>
                </div>
                <input type="range" min={-12} max={12} value={eq60} onChange={(e) => { const val = parseInt(e.target.value); setEq60(val); saveEqSettings({ eq60: val }); }} style={{ width: '100%', accentColor: '#db2777' }} />
              </div>

              {/* 250Hz */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#334155' }}>
                  <span>中低音</span>
                  <span style={{ color: '#c026d3', fontWeight: 'bold' }}>250Hz</span>
                  <span style={{ fontSize: '9px', color: '#c026d3', fontWeight: 'bold' }}>{eq250 > 0 ? `+${eq250}` : eq250}dB</span>
                </div>
                <input type="range" min={-12} max={12} value={eq250} onChange={(e) => { const val = parseInt(e.target.value); setEq250(val); saveEqSettings({ eq250: val }); }} style={{ width: '100%', accentColor: '#c026d3' }} />
              </div>

              {/* 1kHz */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#334155' }}>
                  <span>中音</span>
                  <span style={{ color: '#9333ea', fontWeight: 'bold' }}>1kHz</span>
                  <span style={{ fontSize: '9px', color: '#9333ea', fontWeight: 'bold' }}>{eq1000 > 0 ? `+${eq1000}` : eq1000}dB</span>
                </div>
                <input type="range" min={-12} max={12} value={eq1000} onChange={(e) => { const val = parseInt(e.target.value); setEq1000(val); saveEqSettings({ eq1000: val }); }} style={{ width: '100%', accentColor: '#9333ea' }} />
              </div>

              {/* 4kHz */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#334155' }}>
                  <span>中高音</span>
                  <span style={{ color: '#0891b2', fontWeight: 'bold' }}>4kHz</span>
                  <span style={{ fontSize: '9px', color: '#0891b2', fontWeight: 'bold' }}>{eq4000 > 0 ? `+${eq4000}` : eq4000}dB</span>
                </div>
                <input type="range" min={-12} max={12} value={eq4000} onChange={(e) => { const val = parseInt(e.target.value); setEq4000(val); saveEqSettings({ eq4000: val }); }} style={{ width: '100%', accentColor: '#0891b2' }} />
              </div>

              {/* 12kHz */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#334155' }}>
                  <span>超高音</span>
                  <span style={{ color: '#0284c7', fontWeight: 'bold' }}>12kHz</span>
                  <span style={{ fontSize: '9px', color: '#0284c7', fontWeight: 'bold' }}>{eq12000 > 0 ? `+${eq12000}` : eq12000}dB</span>
                </div>
                <input type="range" min={-12} max={12} value={eq12000} onChange={(e) => { const val = parseInt(e.target.value); setEq12000(val); saveEqSettings({ eq12000: val }); }} style={{ width: '100%', accentColor: '#0284c7' }} />
              </div>
            </div>
          </div>
        )}

        {/* Seekbar */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <input type="range" min={0} max={duration || 100} value={currentTime} onChange={(e) => { const t = parseFloat(e.target.value); setCurrentTime(t); if (audioRef.current) audioRef.current.currentTime = t; }} style={{ width: '100%', accentColor: '#db2777', cursor: 'pointer' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>
            <span>{fmt(currentTime)}</span><span>{fmt(duration)}</span>
          </div>
        </div>

        {/* Play & Key Controls & 5-Band EQ Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 4px' }}>
          {/* Key Change */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '4px 10px', borderRadius: '16px', border: '1px solid #cbd5e1' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#334155' }}>キー:</span>
            <button type="button" onClick={() => setKeyOffset((k) => Math.max(-6, k - 1))} style={{ width: '26px', height: '26px', borderRadius: '50%', border: 'none', background: '#e2e8f0', color: '#0f172a', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>-</button>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: keyOffset === 0 ? '#0f172a' : '#db2777', minWidth: '20px', textAlign: 'center' }}>{keyOffset > 0 ? `+${keyOffset}` : keyOffset}</span>
            <button type="button" onClick={() => setKeyOffset((k) => Math.min(6, k + 1))} style={{ width: '26px', height: '26px', borderRadius: '50%', border: 'none', background: '#e2e8f0', color: '#0f172a', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer' }}>+</button>
          </div>

          {/* Play Button */}
          <button type="button" onClick={togglePlay} style={{ width: '56px', height: '56px', borderRadius: '50%', border: 'none', background: 'linear-gradient(135deg,#db2777 0%,#0284c7 100%)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 6px 20px rgba(219,39,119,0.35)', transition: 'transform 0.2s ease' }}>
            {isPlaying ? (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" rx="2" /><rect x="14" y="4" width="4" height="16" rx="2" /></svg>) : (<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: '4px' }}><path d="M8 5v14l11-7z" /></svg>)}
          </button>

          {/* 5-Band EQ Panel Toggle Button */}
          <button type="button" onClick={() => setShowEqPanel(!showEqPanel)} style={{ padding: '6px 12px', borderRadius: '16px', border: '1px solid #cbd5e1', background: showEqPanel ? '#fce7f3' : '#f1f5f9', color: showEqPanel ? '#db2777' : '#334155', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}>
            🎛️ 5バンドEQ
          </button>
        </div>
      </footer>

      <audio ref={audioRef} src={activeAudioSrc} crossOrigin="anonymous" onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={() => setIsPlaying(false)} />
    </div>
  );
}
