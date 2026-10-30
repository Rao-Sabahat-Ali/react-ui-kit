import { Checkout, type CheckoutState } from '../../../../templates/blueprints/Checkout';
import type { PreviewChoice } from '../types';

export default function Screen(p: PreviewChoice) {
  return <Checkout previewState={{ state: p.state as CheckoutState }} />;
}
