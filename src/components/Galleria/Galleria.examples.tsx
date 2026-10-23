import { Galleria } from './Galleria';

const photos = [1015, 1016, 1018, 1019, 1020].map((id, i) => ({
  src: `https://picsum.photos/id/${id}/960/600`,
  thumbnail: `https://picsum.photos/id/${id}/160/100`,
  alt: `Landscape photo ${i + 1}`,
  caption: `Landscape ${i + 1}`,
}));

export const examples = [
  {
    title: 'Thumbnails + fullscreen',
    code: `<Galleria value={photos} fullscreen aria-label="Landscapes" />`,
    render: () => (
      <div style={{ maxWidth: 640 }}>
        <Galleria value={photos} fullscreen aria-label="Landscapes" />
      </div>
    ),
  },
  {
    title: 'Thumbnails at the side, circular, indicators',
    code: `<Galleria value={photos} thumbnailsPosition="end" circular showIndicators aria-label="Side thumbnails" />`,
    render: () => (
      <div style={{ maxWidth: 720 }}>
        <Galleria value={photos} thumbnailsPosition="end" circular showIndicators aria-label="Side thumbnails" />
      </div>
    ),
  },
  {
    title: 'Autoplay',
    description: 'Pausable; disabled with reduced motion.',
    code: `<Galleria value={photos} autoplay={3000} showThumbnails={false} showIndicators aria-label="Slideshow" />`,
    render: () => (
      <div style={{ maxWidth: 640 }}>
        <Galleria value={photos} autoplay={3000} showThumbnails={false} showIndicators aria-label="Slideshow" />
      </div>
    ),
  },
];
