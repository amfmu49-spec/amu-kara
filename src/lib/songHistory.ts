import { LyricLine } from './srtParser';

export interface SongHistoryItem {
  id: string;
  title: string;
  bgImageUrl: string | null;
  audioUrl: string;
  lyrics: LyricLine[];
  timestamp: number;
}

const HISTORY_KEY = 'amu_kara_song_history_v1';

export function getSongHistory(): SongHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const list: SongHistoryItem[] = JSON.parse(raw);
    return list.sort((a, b) => b.timestamp - a.timestamp);
  } catch (e) {
    console.warn('Failed to load song history:', e);
    return [];
  }
}

export function saveSongHistory(item: Omit<SongHistoryItem, 'timestamp'>): SongHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = getSongHistory();
    // 既存の同じIDがあれば除外して最新を先頭に追加
    const filtered = current.filter((x) => x.id !== item.id && x.audioUrl !== item.audioUrl);
    const newItem: SongHistoryItem = {
      ...item,
      timestamp: Date.now(),
    };
    const updated = [newItem, ...filtered].slice(0, 30); // 最大30件保持
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to save song history:', e);
    return getSongHistory();
  }
}

export function removeSongHistory(id: string): SongHistoryItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const current = getSongHistory();
    const updated = current.filter((x) => x.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.warn('Failed to remove song history item:', e);
    return getSongHistory();
  }
}
