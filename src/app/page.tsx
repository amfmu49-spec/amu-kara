'use client';

import React, { useState, useEffect, useCallback } from 'react';
import KaraokePlayer from '@/components/KaraokePlayer';
import { parseSRT, LyricLine } from '@/lib/srtParser';
import { SUNO_BOOKMARKLET_SCRIPT } from '@/lib/bookmarklet';

export default function Home() {
  const [audioUrlInput, setAudioUrlInput] = useState<string>('');
  const [songTitle, setSongTitle] = useState<string>('');

  // 再生モード用の状態
  const [isPlayingMode, setIsPlayingMode] = useState(false);
  const [accompanimentAudioUrl, setAccompanimentAudioUrl] = useState<string | null>(null);
  const [bgImageUrl, setBgImageUrl] = useState<string | null>(null);
  const [lyricsData, setLyricsData] = useState<LyricLine[]>([]);

  // ローディング状態
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  // バックエンドURL (FastAPI)
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://192.168.1.26:8000';

  // 音声分離・スタート処理
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

  // URLハッシュからの自動読み込み（ブックマークレット直接ジャンプ対応）
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
          if (audio) setAudioUrlInput(audio);
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
    <main className="min-h-screen bg-slate-50 text-slate-800 flex flex-col items-center justify-center p-4 selection:bg-pink-500 selection:text-white font-sans">
      {/* Header with New Logo */}
      <header className="w-full max-w-md text-center py-4 flex flex-col items-center">
        <img
          src="/logo_cropped.png"
          alt="AMU KARA Logo"
          className="w-64 h-auto rounded-2xl shadow-xl shadow-pink-500/20 border border-slate-900/80 hover:scale-105 transition transform"
        />
        <p className="text-xs text-slate-500 mt-2 font-bold tracking-wider">
          全自動 AI ボーカル抽出 ＆ 高精度カラオケ
        </p>
      </header>

      {/* Main Card (白基調 ＋ AIネオンライン) */}
      <div className="w-full max-w-md bg-white/90 border-2 border-slate-100 rounded-3xl p-6 shadow-xl backdrop-blur-xl relative overflow-hidden space-y-4">
        {/* AIカラーライン (上部枠線アクセント) */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400" />

        {/* ブックマークレット取得エリア */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">✨ Suno全自動連携ブックマークレット</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            下のコードをコピーしてブラウザのブックマークのURL欄に保存してください。Sunoの曲ページ（suno.com/song/...）で押すと1タップで自動スタートします。
          </p>

          <textarea
            id="bookmarklet-textarea"
            readOnly
            rows={3}
            value={SUNO_BOOKMARKLET_SCRIPT}
            className="w-full bg-slate-900 p-3 rounded-xl text-base text-green-400 font-mono border border-slate-800 focus:outline-none select-all leading-relaxed"
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
            className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-pink-600 to-cyan-500 active:scale-98 text-white rounded-xl font-bold text-xs shadow-md shadow-pink-500/20 transition"
          >
            📋 ブックマークレットをコピー
          </button>
        </div>
      </div>

      {/* Loading Modal */}
      {isLoading && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 border-4 border-pink-500 border-t-transparent rounded-full animate-spin mb-6 shadow-lg shadow-pink-500/50" />
          <h2 className="text-xl font-bold text-white mb-2">音声分離 AI 処理中...</h2>
          <p className="text-xs text-slate-300 max-w-xs leading-relaxed">{loadingStatus}</p>
        </div>
      )}
    </main>
  );
}
