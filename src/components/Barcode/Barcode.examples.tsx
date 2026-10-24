import { useState } from 'react';
import { Divider } from '../Divider/Divider';
import { Field } from '../Field/Field';
import { InputText } from '../InputText/InputText';
import { Barcode, type BarcodeProps } from './Barcode';
import type { BarcodeError } from './encodings';

const wrap = 'd-flex flex-wrap gap-4 align-items-start';
const labelled = (props: BarcodeProps, caption: string) => (
  <figure key={caption} className="m-0">
    <Barcode {...props} />
    <figcaption className="text-body-secondary small">{caption}</figcaption>
  </figure>
);

function LiveCheckDigit() {
  const [digits, setDigits] = useState('590123412345');
  const [error, setError] = useState<BarcodeError | undefined>();
  return (
    <div className={wrap}>
      <div style={{ flex: '1 1 14rem', maxWidth: 320 }}>
        <Field label="EAN-13 digits" help="Type 12 digits and the check digit is added. Type 13 and it is verified.">
          <InputText value={digits} onChange={setDigits} inputMode="numeric" keyFilter="int" maxLength={13} />
        </Field>
        {error && <p className="text-body-secondary small mb-0">{error.message}</p>}
      </div>
      <Barcode format="ean13" value={digits} label="Product barcode" onError={setError} />
    </div>
  );
}

const ITEMS = [
  { name: 'Oat drink 1 l', qty: 2, price: 24.9, ean: '7310865001234' },
  { name: 'Rye bread', qty: 1, price: 38, ean: '7310865005678' },
  { name: 'Coffee beans 500 g', qty: 1, price: 89, ean: '7310865009012' },
];
const money = (n: number) => `${n.toFixed(2).replace('.', ',')} kr`;

function Receipt() {
  const total = ITEMS.reduce((sum, i) => sum + i.qty * i.price, 0);
  return (
    <div style={{ maxWidth: '20rem', fontFamily: 'var(--ui-font-family-mono)', fontSize: 'var(--ui-font-size-sm)' }}>
      <p className="mb-0 fw-semibold">Södermalm Market</p>
      <p className="text-body-secondary mb-0">14 Jun 2026 18:42, till 3</p>
      <Divider />
      <table className="w-100">
        <caption className="visually-hidden">Items</caption>
        <tbody>
          {ITEMS.map((i) => (
            <tr key={i.ean}>
              <td>
                {i.qty} × {i.name}
              </td>
              <td className="text-end" style={{ fontVariantNumeric: 'tabular-nums' }}>
                {money(i.qty * i.price)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" className="pt-2">
              Total
            </th>
            <td className="text-end pt-2 fw-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {money(total)}
            </td>
          </tr>
        </tfoot>
      </table>
      <Divider />
      <div className="d-flex flex-column align-items-center gap-2">
        <Barcode value="ORDER-20481" format="code128" height={56} label="Order number" />
        <Barcode value="590123412345" format="ean13" height={40} barWidth={1} label="Loyalty card" />
      </div>
    </div>
  );
}

export const examples = [
  {
    title: 'Basic (Code 128)',
    description: 'Code 128 is the default: ASCII text, with automatic switching between character sets (numeric runs are packed in half the width).',
    code: `<Barcode value="ORDER-20481" label="Order number" />`,
    render: () => <Barcode value="ORDER-20481" label="Order number" />,
  },
  {
    title: 'Formats',
    description: 'EAN-13, EAN-8 and UPC-A take one digit fewer than their length and add the check digit; with the full length the check digit is verified. Code 39 upper-cases its input; Interleaved 2 of 5 needs an even number of digits.',
    code: `<Barcode format="ean13" value="590123412345" />   // 5901234123457\n<Barcode format="ean8" value="9638507" />\n<Barcode format="upca" value="03600029145" />\n<Barcode format="code39" value="hello-39" />\n<Barcode format="itf" value="12345670" />`,
    render: () => (
      <div className={wrap}>
        {labelled({ format: 'code128', value: 'ORDER-20481' }, 'Code 128')}
        {labelled({ format: 'ean13', value: '590123412345' }, 'EAN-13 (check digit added)')}
        {labelled({ format: 'ean8', value: '9638507' }, 'EAN-8')}
        {labelled({ format: 'upca', value: '03600029145' }, 'UPC-A')}
        {labelled({ format: 'code39', value: 'hello-39' }, 'Code 39')}
        {labelled({ format: 'itf', value: '12345670' }, 'Interleaved 2 of 5')}
      </div>
    ),
  },
  {
    title: 'Live check digit',
    description: 'The value can change at any time; invalid input shows a labelled error state in the same footprint and calls onError.',
    code: `<Barcode format="ean13" value={digits} onError={setError} />`,
    render: () => <LiveCheckDigit />,
  },
  {
    title: 'Invalid values',
    description: 'Wrong length, unsupported characters and wrong check digits are typed BarcodeErrors; the component never throws.',
    code: `<Barcode format="ean13" value="12345" />\n<Barcode format="code39" value="naïve" />\n<Barcode format="ean13" value="5901234123458" />`,
    render: () => (
      <div className={wrap}>
        {labelled({ format: 'ean13', value: '12345', height: 56 }, 'Wrong length')}
        {labelled({ format: 'code39', value: 'naïve', height: 56 }, 'Unsupported character')}
        {labelled({ format: 'ean13', value: '5901234123458', height: 56 }, 'Wrong check digit')}
      </div>
    ),
  },
  {
    title: 'Size, text and quiet zone',
    description: 'height and barWidth are in px (the SVG scales down inside narrow containers); displayValue hides the text; margin is the quiet zone in modules (defaults follow the symbology).',
    code: `<Barcode value="LABEL-7" height={40} barWidth={1} />\n<Barcode value="LABEL-7" height={96} barWidth={3} />\n<Barcode value="LABEL-7" displayValue={false} />`,
    render: () => (
      <div className={wrap}>
        {labelled({ value: 'LABEL-7', height: 40, barWidth: 1 }, 'Small')}
        {labelled({ value: 'LABEL-7', height: 96, barWidth: 3 }, 'Large')}
        {labelled({ value: 'LABEL-7', displayValue: false, margin: 4 }, 'No text, margin 4')}
      </div>
    ),
  },
  {
    title: 'Colours and dark theme',
    description: 'Bars use the same QR tokens as QRCode: ink on white in every theme. Custom colours need 4:1 contrast and dark bars (the dev console warns).',
    code: `<div data-bs-theme="dark"><Barcode value="ORDER-20481" /></div>`,
    render: () => (
      <div data-bs-theme="dark" className="p-4 rounded" style={{ background: 'var(--ui-color-bg)', color: 'var(--ui-color-text)' }}>
        <Barcode value="ORDER-20481" label="Barcode on a dark surface" />
      </div>
    ),
  },
  {
    title: 'POS receipt',
    description: 'A till receipt in the mono face: ruled sections, tabular numerals, an order barcode (Code 128) and a loyalty card (EAN-13).',
    code: `<Barcode value="ORDER-20481" height={56} label="Order number" />\n<Barcode value="590123412345" format="ean13" height={40} barWidth={1} label="Loyalty card" />`,
    render: () => <Receipt />,
  },
];
