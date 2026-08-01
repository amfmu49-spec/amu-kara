'use client';

import React, { useState, useEffect, useCallback } from 'react';
import KaraokePlayer from '@/components/KaraokePlayer';
import { parseSRT, LyricLine } from '@/lib/srtParser';
import { SUNO_BOOKMARKLET_SCRIPT } from '@/lib/bookmarklet';
import { separateVocalWithFreeAI } from '@/lib/demucsAi';
import { getSongHistory, saveSongHistory, removeSongHistory, SongHistoryItem } from '@/lib/songHistory';

export const APP_VERSION = 'v7.2.0 (AMU KARA)';

export default function Home() {
  const [songTitle, setSongTitle] = useState<string>('');
  const [isPlayingMode, setIsPlayingMode] = useState(false);
  const [accompanimentAudioUrl, setAccompanimentAudioUrl] = useState<string | null>(null);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [lyricsData, setLyricsData] = useState<LyricLine[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  // 歌った曲の履歴リスト
  const [songHistory, setSongHistory] = useState<SongHistoryItem[]>([]);

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.1.26:8000';

  // 履歴のロード
  useEffect(() => {
    setSongHistory(getSongHistory());
  }, []);

  const startKaraokeWithData = useCallback(async (
    targetAudioFile: File | null,
    targetAudioUrl: string,
    targetBgUrl: string | null,
    targetLyrics: LyricLine[],
    targetTitle?: string
  ) => {
    if (!targetAudioFile && !targetAudioUrl) {
      alert('Sunoの楽曲URLを入力するか、ブックマークレットから実行してください。');
      return;
    }

    const currentTitle = targetTitle || songTitle || 'Suno AI Track';
    if (targetTitle) setSongTitle(targetTitle);

    setIsLoading(true);
    setLoadingStatus('🤖 AMU KARA AI が高音質ボーカル分離中... (数秒お待ちください)');

    try {
      let accompanimentUrl = targetAudioUrl;

      if (targetAudioUrl) {
        const aiResult = await separateVocalWithFreeAI(targetAudioUrl);
        if (aiResult) {
          accompanimentUrl = aiResult;
          setLoadingStatus('✅ AI分離完了！カラオケを起動します...');
        } else {
          try {
            setLoadingStatus('⚙️ ローカル AI エンジンで音源分離中...');
            const response = await fetch(`${BACKEND_URL}/api/separate-url?url=${encodeURIComponent(targetAudioUrl)}`, {
              method: 'POST'
            });

            if (response.ok) {
              const audioBlob = await response.blob();
              accompanimentUrl = URL.createObjectURL(audioBlob);
              setLoadingStatus('✅ ローカルAI分離完了！');
            }
          } catch (e) {
            console.log('AI Separation Fallback to Client DSP:', e);
          }
        }
      }

      setAccompanimentAudioUrl(accompanimentUrl);
      if (targetBgUrl) setBgImageUrl(targetBgUrl);
      if (targetLyrics.length > 0) setLyricsData(targetLyrics);

      // 履歴リストに保存
      const updatedHistory = saveSongHistory({
        id: targetAudioUrl || accompanimentUrl,
        title: currentTitle,
        bgImageUrl: targetBgUrl,
        audioUrl: targetAudioUrl || accompanimentUrl,
        lyrics: targetLyrics,
      });
      setSongHistory(updatedHistory);

      setTimeout(() => {
        setIsLoading(false);
        setIsPlayingMode(true);
      }, 600);
    } catch (err) {
      console.error(err);
      alert('処理中にエラーが発生しました。');
      setIsLoading(false);
    }
  }, [BACKEND_URL, songTitle]);

  // 履歴曲のワンタップ即時呼び出し
  const handleSelectHistorySong = (item: SongHistoryItem) => {
    setSongTitle(item.title);
    setAccompanimentAudioUrl(item.audioUrl);
    setBgImageUrl(item.bgImageUrl);
    setLyricsData(item.lyrics);
    setIsPlayingMode(true);
  };

  // 履歴項目の削除
  const handleDeleteHistorySong = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('この曲を履歴から削除しますか？')) {
      const updated = removeSongHistory(id);
      setSongHistory(updated);
    }
  };

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
            await startKaraokeWithData(null, audio, image, parsedLyrics, title);
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
      justifyContent: 'flex-start',
      padding: '20px 16px 40px',
      boxSizing: 'border-box'
    }}>
      <div style={{ width: '100%', maxWidth: '460px', margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        
        {/* ロゴ画像 ＆ バージョンヘッダー */}
        <header style={{ textAlign: 'center', margin: '4px 0 8px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
            <p style={{ fontSize: '12px', color: '#64748b', margin: 0, fontWeight: 'bold', letterSpacing: '0.05em' }}>
              全自動 AI ボーカル抽出 ＆ 高精度カラオケ
            </p>
            <span style={{ fontSize: '10px', background: 'linear-gradient(90deg,#ec4899,#0284c7)', color: '#ffffff', padding: '2px 8px', borderRadius: '10px', fontWeight: 'bold' }}>
              {APP_VERSION}
            </span>
          </div>
        </header>

        {/* 最近歌った曲 / マイソングリスト (履歴機能) */}
        {songHistory.length > 0 && (
          <div style={{
            width: '100%',
            backgroundColor: '#ffffff',
            border: '2px solid #e2e8f0',
            borderRadius: '24px',
            padding: '20px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.04)',
            boxSizing: 'border-box'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '16px' }}>🎵</span>
                <h2 style={{ fontSize: '14px', fontWeight: 'bold', color: '#0f172a', margin: 0 }}>
                  歌った曲のマイリスト ({songHistory.length}曲)
                </h2>
              </div>
              <span style={{ fontSize: '10px', color: '#0284c7', fontWeight: 'bold', background: '#e0f2fe', padding: '2px 8px', borderRadius: '10px' }}>
                ⚡ 秒速タップ再生
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto', paddingRight: '4px' }}>
              {songHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelectHistorySong(item)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    backgroundColor: '#f8fafc',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                    e.currentTarget.style.borderColor = '#ec4899';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', overflow: 'hidden' }}>
                    {item.bgImageUrl ? (
                      <img src={item.bgImageUrl} alt="" style={{ width: '44px', height: '44px', borderRadius: '12px', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'linear-gradient(135deg,#ec4899,#0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 'bold', fontSize: '18px' }}>
                        🎵
                      </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.title}
                      </span>
                      <span style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                        {item.lyrics && item.lyrics.length > 0 ? `📝 歌詞データあり (${item.lyrics.length}行)` : '🎵 音源保存済み'}
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      style={{
                        padding: '6px 12px',
                        background: 'linear-gradient(90deg,#ec4899,#a855f7)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        border: 'none',
                        borderRadius: '14px',
                        cursor: 'pointer',
                        boxShadow: '0 2px 8px rgba(236,72,153,0.3)'
                      }}
                    >
                      🎤 歌う
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDeleteHistorySong(e, item.id)}
                      title="リストから削除"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        fontSize: '14px',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* メイン白基調カード（ブックマークレット連携） */}
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
              下のコードをコピーしてブラウザのブックマークのURL欄に保存してください。Sunoの曲ページ（suno.com/song/...）で押すと1タップで自動スタートし、マイリストに追加されます。
            </p>

            <textarea
              id="bookmarklet-textarea"
              readOnly
              rows={3}
              value={SUNO_BOOKMARKLET_SCRIPT}
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
          background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(12px)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          color: '#ffffff', textAlign: 'center', padding: '24px'
        }}>
          <div style={{
            width: '56px', height: '56px',
            border: '4px solid #ec4899', borderTopColor: 'transparent',
            borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px'
          }} />
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0 0 10px 0', background: 'linear-gradient(90deg, #ec4899, #38bdf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            AMU KARA AI 高音質分離中...
          </h2>
          <p style={{ fontSize: '13px', color: '#cbd5e1', margin: 0, maxWidth: '320px', lineHeight: '1.5' }}>
            {loadingStatus}
          </p>
        </div>
      )}
    </main>
  );
}
