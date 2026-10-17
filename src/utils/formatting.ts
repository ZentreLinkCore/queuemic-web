export function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatRoomCode(code: string): string {
  if (!code) return '';
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

export function getInitials(name: string): string {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function generateRandomColor(): string {
  const vibrantColors = [
    '#8B5CF6', '#EC4899', '#06B6D4', '#10B981',
    '#F59E0B', '#6366F1', '#3B82F6', '#D946EF'
  ];
  return vibrantColors[Math.floor(Math.random() * vibrantColors.length)];
}
