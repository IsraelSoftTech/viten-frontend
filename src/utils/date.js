// Utility helpers to produce/localize YYYY-MM-DD strings (avoid timezone shifts)
export const getLocalDate = (d = new Date()) => {
  const date = d instanceof Date ? d : new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const getFirstOfMonthLocal = (d = new Date()) => {
  const date = d instanceof Date ? new Date(d) : new Date(d);
  date.setDate(1);
  return getLocalDate(date);
};

// Safely extract YYYY-MM-DD from different date string shapes returned by the server
export const extractYYYYMMDD = (dateString) => {
  if (!dateString) return '';
  if (typeof dateString === 'string') {
    const tIdx = dateString.indexOf('T');
    if (tIdx !== -1) return dateString.slice(0, tIdx);
    const spaceIdx = dateString.indexOf(' ');
    if (spaceIdx !== -1) return dateString.slice(0, spaceIdx);
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) return dateString;
  }
  const d = new Date(dateString);
  if (isNaN(d)) return '';
  return getLocalDate(d);
};
