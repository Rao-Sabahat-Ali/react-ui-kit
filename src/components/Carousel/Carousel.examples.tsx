import { Carousel } from './Carousel';

const products = ['Lamp', 'Chair', 'Desk', 'Shelf', 'Rug', 'Plant', 'Mirror'].map((name, i) => ({ name, price: 20 + i * 15 }));
const card = (p: { name: string; price: number }) => (
  <div className="card h-100">
    <div className="card-body">
      <h3 className="h6 card-title">{p.name}</h3>
      <p className="card-text text-body-secondary">${p.price}</p>
    </div>
  </div>
);
const responsive = [
  { breakpoint: '992px', numVisible: 2, numScroll: 1 },
  { breakpoint: '576px', numVisible: 1, numScroll: 1 },
];

export const examples = [
  {
    title: 'Products, 3 visible, responsive',
    code: `<Carousel value={products} numVisible={3} responsiveOptions={[{ breakpoint: '992px', numVisible: 2, numScroll: 1 }, { breakpoint: '576px', numVisible: 1, numScroll: 1 }]} itemTemplate={(p) => <ProductCard {...p} />} aria-label="Products" />`,
    render: () => <Carousel value={products} numVisible={3} responsiveOptions={responsive} itemTemplate={card} aria-label="Products" />,
  },
  {
    title: 'Circular autoplay',
    description: 'Pauses on hover/focus, has a pause button and never autoplays with reduced motion.',
    code: `<Carousel value={products} circular autoplayInterval={3000} itemTemplate={card} aria-label="Highlights" />`,
    render: () => <Carousel value={products} circular autoplayInterval={3000} itemTemplate={card} aria-label="Highlights" />,
  },
  {
    title: 'Vertical',
    code: `<Carousel value={products} orientation="vertical" numVisible={2} verticalViewportHeight="260px" itemTemplate={card} />`,
    render: () => (
      <div style={{ maxWidth: 320 }}>
        <Carousel value={products} orientation="vertical" numVisible={2} verticalViewportHeight="260px" itemTemplate={card} aria-label="Vertical products" />
      </div>
    ),
  },
];
