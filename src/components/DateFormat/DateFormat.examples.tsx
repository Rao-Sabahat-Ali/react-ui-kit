import { DateFormat } from './DateFormat';

const iso = '2026-10-20T09:30:00Z';

export const examples = [
  {
    title: 'Absolute and relative',
    description: 'Always a semantic `<time>` with the exact value in `title`.',
    code: `<DateFormat value={user.createdAt} />\n<DateFormat value={order.placedAt} format="datetime" dateStyle="short" />\n<DateFormat value={comment.at} format="relative" live />`,
    render: () => (
      <div className="d-flex flex-column gap-1">
        <DateFormat value={iso} />
        <DateFormat value={iso} format="datetime" dateStyle="short" />
        <DateFormat value={iso} format="time" timeZone="Asia/Tokyo" />
        <DateFormat value={Date.now() - 3 * 86400000} format="relative" live />
        <DateFormat value={Date.now() - 20 * 86400000} format="auto" />
        <DateFormat value="not a date" />
      </div>
    ),
  },
];
