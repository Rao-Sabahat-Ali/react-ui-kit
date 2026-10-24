import type { OrderLine } from '@sabahat/react-ui-kit';

/** Sample cart for the Checkout blueprint. Replace with your cart; amounts are major units (21 means 21,00 kr). */
export const CURRENCY = 'SEK';
export const LOCALE = 'sv-SE';

export const CART_LINES: OrderLine[] = [
  { id: 'mug', name: 'Stoneware mug', description: 'Sand, 30 cl', quantity: 2, unitPrice: 21 },
  { id: 'towel', name: 'Linen tea towel', description: 'Oat', quantity: 1, unitPrice: 36 },
];

/** Estimated tax added at checkout (the sample shop shows tax separately). */
export const TAX = 4.4;

export interface DeliveryMethod {
  value: string;
  label: string;
  price: number;
  /** Arrival wording shown next to the price. */
  arrives: string;
}

export const DELIVERY_METHODS: DeliveryMethod[] = [
  { value: 'standard', label: 'Standard', price: 4, arrives: 'Thursday 29 October' },
  { value: 'express', label: 'Express', price: 9, arrives: 'Tomorrow' },
];

export const COUNTRIES = [
  { value: 'SE', label: 'Sweden' },
  { value: 'NO', label: 'Norway' },
  { value: 'DK', label: 'Denmark' },
  { value: 'FI', label: 'Finland' },
];

/** Shown on the confirmation. In a real shop this comes from the server after it confirms the payment. */
export const ORDER_REFERENCE = 'ORD-48213';
