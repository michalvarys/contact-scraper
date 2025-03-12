import { formatDistanceToNow } from 'date-fns';
import { cs } from 'date-fns/locale';

// Formátování data
export const formatDate = (date: string | null | undefined) => {
  if (!date) return '-';
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: cs });
};
