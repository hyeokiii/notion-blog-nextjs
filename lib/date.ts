import { format, isValid } from 'date-fns';
import { ko } from 'date-fns/locale';

/**
 * Notion date 문자열을 한국어 로케일의 긴 날짜 형식으로 포맷합니다.
 * 값이 없거나 유효하지 않으면 빈 문자열을 반환합니다.
 */
export const formatPostDate = (date?: string | null): string => {
  if (!date) return '';

  const parsed = new Date(date);
  if (!isValid(parsed)) return '';

  return format(parsed, 'PPP', { locale: ko });
};
