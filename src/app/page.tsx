'use client';

import React, { useState, useEffect, useCallback } from 'react';
import KaraokePlayer from '@/components/KaraokePlayer';
import { parseSRT, LyricLine } from '@/lib/srtParser';
import { SUNO_BOOKMARKLET_SCRIPT } from '@/lib/bookmarklet';

export default function Home() {
  const [songTitle, setSongTitle] = useState<string>('');
  const [isPlayingMode, setIsPlayingMode] = useState(false);
  const [accompanimentAudioUrl, setAccompanimentAudioUrl] = useState<string | null>(null);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [lyricsData, setLyricsData] = useState<LyricLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.1.26:8000';

  const startKaraokeWithData = useCallback(async (
    targetAudioFile: File | null,
    targetAudioUrl: string,
    targetBgUrl: string | null,
    targetLyrics: LyricLine[]
  ) => {
    if (!targetAudioFile && !targetAudioUrl) {
      alert('Sunoの楽曲URLを入力するか、ブックマークレットから実行してください。');
      return;
    }

    setIsLoading(true);
    setLoadingStatus('ボーカル抽出 AI 処理を実行中...');

    try {
      let accompanimentUrl = '';

      if (targetAudioUrl) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/separate-url?url=${encodeURIComponent(targetAudioUrl)}`, {
            method: 'POST',
          });

          if (response.ok) {
            const audioBlob = await response.blob();
            accompanimentUrl = URL.createObjectURL(audioBlob);
          } else {
            accompanimentUrl = targetAudioUrl;
          }
        } catch (e) {
          console.warn('分離エラー。元音源でフォールバック再生します。', e);
          accompanimentUrl = targetAudioUrl;
        }
      }

      setAccompanimentAudioUrl(accompanimentUrl);
      if (targetBgUrl) setBgImageUrl(targetBgUrl);
      if (targetLyrics.length > 0) setLyricsData(targetLyrics);

      setIsLoading(false);
      setIsPlayingMode(true);
    } catch (err) {
      console.error(err);
      alert('処理中にエラーが発生しました。');
      setIsLoading(false);
    }
  }, [BACKEND_URL]);

  useEffect(() => {
    const handleUrlParams = async () => {
      try {
        const hash = window.location.hash;
        let data: { srt?: string; srtText?: string; audioUrl?: string; mp3Url?: string; imageUrl?: string; title?: string; autoStart?: boolean } | null = null;

        if (hash.startsWith('#lrc=')) {
          const lrcText = decodeURIComponent(hash.replace('#lrc=', ''));
          const parsedLyrics = parseSRT(lrcText);
          setLyricsData(parsedLyrics);
          window.history.replaceState(null, '', window.location.pathname);
        } else if (hash.startsWith('#data=')) {
          const base64Str = decodeURIComponent(hash.replace('#data=', ''));
          const jsonStr = decodeURIComponent(escape(atob(base64Str)));
          data = JSON.parse(jsonStr);
        } else if (hash.startsWith('#sunoData=')) {
          const rawJson = decodeURIComponent(hash.replace('#sunoData=', ''));
          data = JSON.parse(rawJson);
        }

        if (data) {
          const srtContent = data.srt || data.srtText || '';
          const audio = data.audioUrl || data.mp3Url || '';
          const image = data.imageUrl || null;
          const title = data.title || 'Suno AI Track';

          let parsedLyrics: LyricLine[] = [];
          if (srtContent) {
            parsedLyrics = parseSRT(srtContent);
            setLyricsData(parsedLyrics);
          }
          if (audio) setAccompanimentAudioUrl(audio);
          if (image) setBgImageUrl(image);
          if (title) setSongTitle(title);

          window.history.replaceState(null, '', window.location.pathname);

          if (audio) {
            await startKaraokeWithData(null, audio, image, parsedLyrics);
          }
        }
      } catch (err) {
        console.error('URLデータ連携エラー:', err);
      }
    };
    handleUrlParams();
  }, [startKaraokeWithData]);

  if (isPlayingMode && accompanimentAudioUrl) {
    return (
      <KaraokePlayer
        audioUrl={accompanimentAudioUrl}
        bgImageUrl={bgImageUrl}
        lyrics={lyricsData}
        title={songTitle}
        onReset={() => {
          setIsPlayingMode(false);
          setAccompanimentAudioUrl(null);
        }}
      />
    );
  }

  return (
    <main className="app-container">
      {/* Header with Cropped Logo */}
      <header style={{ textAlign: 'center', margin: '16px 0 8px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img
          src="logo_cropped.png"
          alt="AMU KARA Logo"
          className="app-logo"
        />
        <p style={{ fontSize: '12px', color: '#64748b', marginTop: '10px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
          全自動 AI ボーカル抽出 ＆ 高精度カラオケ
        </p>
      </header>

      {/* Main White Card with AI Gradient Line */}
      <div className="main-card">
        <div className="ai-top-line" />

        <div style={{ padding: '8px 0' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#334155', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>✨</span>
            <span>Suno全自動連携ブックマークレット</span>
          </div>
          <p style={{ fontSize: '11px', color: '#64748b', lineHeight: '1.5', marginBottom: '12px' }}>
            下のコードをコピーしてブラウザのブックマークのURL欄に保存してください。Sunoの曲ページ（suno.com/song/...）で押すと1タップで自動スタートします。
          </p>

          <textarea
            id="bookmarklet-textarea"
            readOnly
            rows={4}
            value={SUNO_BOOKMARKLET_SCRIPT}
            className="code-box"
          />

          <button
            type="button"
            onClick={() => {
              const el = document.getElementById('bookmarklet-textarea') as HTMLTextAreaElement;
              if (el) {
                el.focus();
                el.select();
                el.setSelectionRange(0, 99999);
                try {
                  const successful = document.execCommand('copy');
                  if (successful) {
                    alert('✅ ブックマークレットをコピーしました！\n\nSuno（suno.com）の曲画面で実行してください。');
                  } else {
                    alert('上のコードを選択してコピーしてください。');
                  }
                } catch (err) {
                  alert('上のコードを選択してコピーしてください。');
                }
              }
            }}
            className="copy-btn"
          >
            📋 ブックマークレットをコピー
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(15, 23, 42, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: '#ffffff', textAlign: 'center', padding: '24px'
        }}>
          <div style={{
            width: '48px', height: '48px',
            border: '4px solid #ec4899', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '16px'
          }} />
          <h2 style={{ fontSize: '18px', fontWeight: 'bold', margin: '0 0 8px 0' }}>音声分離 AI 処理中...</h2>
          <p style={{ fontSize: '12px', color: '#cbd5e1', margin: 0 }}>{loadingStatus}</p>
        </div>
      )}
    </main>
  );
}
