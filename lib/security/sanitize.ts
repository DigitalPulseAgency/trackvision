const SQL_PATTERNS = [/--/g, /;/g, /\b(drop|insert|delete|update)\b/gi];

export const sanitizeInput = (input: string): string => {
  if (!input) {
    return '';
  }

  let value = input.trim();

  // Remove all HTML tags (e.g. <script>, <iframe>, <img>, <a>, etc.)
  value = value.replace(/<[^>]*>/g, '');

  // Escape single and double quotes
  value = value.replace(/['"]/g, (match) => (match === "'" ? "\\'" : '\\"'));

  // Remove dangerous SQL sequences
  for (const pattern of SQL_PATTERNS) {
    value = value.replace(pattern, '');
  }

  // Enforce max length
  if (value.length > 2000) {
    value = value.slice(0, 2000);
  }

  return value;
};

export const sanitizeUrl = (url: string): string => {
  const trimmed = (url || '').trim();

  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('URL must start with http:// or https://');
  }

  if (
    !validator.isURL(trimmed, {
      require_protocol: true,
    })
  ) {
    throw new Error('Invalid URL');
  }

  return trimmed;
};

