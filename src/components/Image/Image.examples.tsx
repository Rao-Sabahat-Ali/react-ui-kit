import { Skeleton } from '../Skeleton/Skeleton';
import { Image } from './Image';

const photo = 'https://picsum.photos/id/1018/800/450';

export const examples = [
  {
    title: 'Responsive with ratio and placeholder',
    description: 'Lazy loaded; the ratio box reserves space so the layout does not shift.',
    code: `<Image src="${photo}" alt="Mountain lake" ratio="16x9" placeholder={<Skeleton shape="rect" />} rounded />`,
    render: () => (
      <div style={{ maxWidth: 480 }}>
        <Image src={photo} alt="Mountain lake" ratio="16x9" placeholder={<Skeleton shape="rect" />} rounded />
      </div>
    ),
  },
  {
    title: 'Fallback and thumbnail',
    code: `<Image src="/does-not-exist.jpg" fallbackSrc="https://picsum.photos/id/1025/240/160" alt="Dog" width={240} height={160} thumbnail />`,
    render: () => <Image src="/does-not-exist.jpg" fallbackSrc="https://picsum.photos/id/1025/240/160" alt="Dog" width={240} height={160} thumbnail />,
  },
  {
    title: 'Preview (zoom & rotate)',
    code: `<Image src="${photo}" alt="Mountain lake" width={240} height={135} preview rounded />`,
    render: () => <Image src={photo} alt="Mountain lake" width={240} height={135} preview rounded />,
  },
];
