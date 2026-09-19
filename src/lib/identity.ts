// Persistent per-browser player identity (UUID stored in localStorage)
// This is NOT authentication — just a stable identifier so each browser
// has one consistent identity across sessions.

function uuid(): string {
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
    return (crypto as any).randomUUID();
  }
  // Fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const KEY = 'bba.playerId';

export function getPlayerId(): string {
  if (typeof window === 'undefined') return uuid();
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = uuid();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function getDisplayName(): string {
  if (typeof window === 'undefined') return 'Người chơi';
  let name = localStorage.getItem('bba.playerName');
  if (!name) {
    const animals = ['Hổ', 'Sư Tử', 'Đại Bàng', 'Cáo', 'Sói', 'Gấu', 'Báo', 'Cú'];
    const adj = ['Dũng Cảm', 'Thông Minh', 'Nhanh Nhẹn', 'Bí Hiểm', 'Huyền Thoại'];
    name = `${adj[Math.floor(Math.random() * adj.length)]} ${animals[Math.floor(Math.random() * animals.length)]}`;
    localStorage.setItem('bba.playerName', name);
  }
  return name;
}

export function setDisplayName(name: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bba.playerName', name);
  }
}
