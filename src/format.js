export function formatDate(value) {
  if (!value) return '未確認';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '未確認';
  return new Intl.DateTimeFormat('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

export const shortSha = (value) => value ? value.slice(0, 7) : '未確認';
export const firstLine = (value) => value?.split('\n')[0]?.trim() || '未確認';
