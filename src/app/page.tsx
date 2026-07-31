'use client';

import React, { useState, useEffect, useCallback } from 'react';
import KaraokePlayer from '@/components/KaraokePlayer';
import { parseSRT, LyricLine } from '@/lib/srtParser';
import { getBookmarkletScript } from '@/lib/bookmarklet';

export default function Home() {
  const [songTitle, setSongTitle] = useState<string>('');
  const [isPlayingMode, setIsPlayingMode] = useState(false);
  const [accompanimentAudioUrl, setAccompanimentAudioUrl] = useState<string | null>(null);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [lyricsData, setLyricsData] = useState<LyricLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');
  const [bookmarkletCode, setBookmarkletCode] = useState<string>('');

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.1.26:8000';

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const currentOrigin = window.location.origin + window.location.pathname.replace(/\/$/, '');
      setBookmarkletCode(getBookmarkletScript(currentOrigin));
    }
  }, []);

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
    <main style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      color: '#1e293b',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      boxSizing: 'border-box'
    }}>
      <div style={{ width: '100%', maxWidth: '440px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* ロゴ画像ヘッダー */}
        <header style={{ textAlign: 'center', margin: '8px 0 16px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <img
            src="logo_cropped.png"
            alt="AMU KARA Logo"
            style={{
              maxWidth: '260px',
              width: '80%',
              height: 'auto',
              borderRadius: '16px',
              boxShadow: '0 10px 25px rgba(236, 72, 153, 0.25)',
              display: 'block'
            }}
          />
          <p style={{ fontSize: '12px', color: '#64748b', marginTop: '12px', fontWeight: 'bold', letterSpacing: '0.05em' }}>
            全自動 AI ボーカル抽出 ＆ 高精度カラオケ
          </p>
        </header>

        {/* メイン白基調カード */}
        <div style={{
          width: '100%',
          backgroundColor: '#ffffff',
          border: '2px solid #e2e8f0',
          borderRadius: '24px',
          padding: '24px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08)',
          position: 'relative',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}>
          {/* AIネオングラデーションライン */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '6px',
            background: 'linear-gradient(90deg, #ec4899, #a855f7, #06b6d4)'
          }} />

          <div style={{ paddingTop: '8px' }}>
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
              value={bookmarkletCode}
              style={{
                width: '100%',
                backgroundColor: '#0f172a',
                color: '#4ade80',
                fontFamily: 'monospace',
                fontSize: '16px',
                padding: '12px',
                borderRadius: '12px',
                border: '1px solid #1e293b',
                boxSizing: 'border-box',
                marginBottom: '14px',
                outline: 'none',
                lineHeight: '1.4'
              }}
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
              style={{
                width: '100%',
                padding: '14px 20px',
                background: 'linear-gradient(90deg, #9333ea, #db2777, #06b6d4)',
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '14px',
                border: 'none',
                borderRadius: '14px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(219, 39, 119, 0.3)',
                boxSizing: 'border-box'
              }}
            >
              📋 ブックマークレットをコピー
            </button>
          </div>
        </div>

      </div>

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
