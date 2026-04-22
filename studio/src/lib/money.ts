import type { Currency, Item, Numbering, TaxRow } from "./schema";
import { currencySymbol } from "./schema";

export function formatAmount(n: number, numbering: Numbering, currency: Currency): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  const [intPart, decPart] = abs.toFixed(2).split(".");
  let formatted: string;
  if (numbering === "indian") {
    formatted = groupIndian(intPart);
  } else {
    formatted = groupIntl(intPart);
  }
  return `${sign}${currencySymbol(currency)}${formatted}.${decPart}`;
}

function groupIntl(intStr: string): string {
  return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function groupIndian(intStr: string): string {
  if (intStr.length <= 3) return intStr;
  const last3 = intStr.slice(-3);
  const rest = intStr.slice(0, -3);
  const groupedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return `${groupedRest},${last3}`;
}

export function computeTotals(items: Item[], taxRows: TaxRow[]) {
  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
  const taxes = taxRows.map((t) => ({
    label: t.label,
    amount: (subtotal * (Number(t.percent) || 0)) / 100,
  }));
  const totalTax = taxes.reduce((s, t) => s + t.amount, 0);
  const grand = subtotal + totalTax;
  return { subtotal, taxes, totalTax, grand };
}

// Number to words
const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
  "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen",
  "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10);
  const o = n % 10;
  return o === 0 ? TENS[t] : `${TENS[t]} ${ONES[o]}`;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h === 0) return twoDigits(rest);
  if (rest === 0) return `${ONES[h]} Hundred`;
  return `${ONES[h]} Hundred ${twoDigits(rest)}`;
}

export function numberToWordsIndian(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  const rest1 = n % 10000000;
  const lakh = Math.floor(rest1 / 100000);
  const rest2 = rest1 % 100000;
  const thousand = Math.floor(rest2 / 1000);
  const last = rest2 % 1000;
  if (crore) parts.push(`${twoDigits(crore) || threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (last) parts.push(threeDigits(last));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function numberToWordsIntl(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const billion = Math.floor(n / 1_000_000_000);
  const rest1 = n % 1_000_000_000;
  const million = Math.floor(rest1 / 1_000_000);
  const rest2 = rest1 % 1_000_000;
  const thousand = Math.floor(rest2 / 1_000);
  const last = rest2 % 1_000;
  if (billion) parts.push(`${threeDigits(billion)} Billion`);
  if (million) parts.push(`${threeDigits(million)} Million`);
  if (thousand) parts.push(`${threeDigits(thousand)} Thousand`);
  if (last) parts.push(threeDigits(last));
  return parts.join(" ").trim();
}

export function amountInWords(amount: number, numbering: Numbering, currency: Currency): string {
  const rupeesLike = currency === "INR" ? "Rupees" : currency === "USD" ? "Dollars" : currency === "EUR" ? "Euros" : currency === "GBP" ? "Pounds" : "Dirhams";
  const paiseLike = currency === "INR" ? "Paise" : "Cents";
  const whole = Math.floor(amount);
  const frac = Math.round((amount - whole) * 100);
  const words =
    numbering === "indian" ? numberToWordsIndian(whole) : numberToWordsIntl(whole);
  const fracWords = frac > 0 ? ` and ${twoDigits(frac) || threeDigits(frac)} ${paiseLike}` : "";
  return `${words} ${rupeesLike}${fracWords} Only.`;
}
