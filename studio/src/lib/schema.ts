export type DocType = "quotation" | "invoice" | "agreement" | "tnc";

export type Currency = "INR" | "USD" | "EUR" | "AED" | "GBP";
export type Numbering = "indian" | "intl";

export type Party = {
  name: string;
  lines: string; // multi-line address + email/phone (freeform)
};

export type Item = {
  id: string;
  /** Backward-compat single-line fallback; prefer `title` + `sub`. */
  desc?: string;
  title: string;
  sub: string;
  qty: number;
  rate: number;
};

export type TaxRow = {
  id: string;
  label: string;
  percent: number;
};

export type Clause = {
  id: string;
  title: string;
  bodyHtml: string;
};

export type WatermarkPos = "br" | "bl" | "none";

export type PaymentDetails = {
  upiId: string;
  bankAccount: string;
  bankIfsc: string;
  advancePaid: number;
  thankYouNote: string;
  contactPhone: string;
  contactEmail: string;
};

export type BandControls = {
  // Top band
  topHeight: number;       // px, height of the top band itself
  topOffsetX: number;      // px, nudge whole top band left(-) / right(+)
  topOffsetY: number;      // px, nudge whole top band up(-) / down(+)

  // Logo within the top band
  topLogoLeft: number;     // px, logo X (from left edge of band)
  topLogoTop: number;      // px, logo Y (from vertical center; 0 = centered)
  topLogoSize: number;     // px, logo height

  // Title within the top band
  topTitleRight: number;   // px, title X (from right edge of band)
  topTitleTop: number;     // px, title Y (from vertical center; 0 = centered)
  topTitleSize: number;    // px, title font size

  // Bottom band
  bottomHeight: number;
  bottomOffsetX: number;
  bottomOffsetY: number;

  // Logomark (stamp) on last page
  stampSize: number;       // px, width/height (default 96)
  stampOffsetX: number;    // px, shift left(-) / right(+)
  stampOffsetY: number;    // px, shift up(-) / down(+)
};

export type Doc = {
  id: string;
  type: DocType;
  meta: {
    docNumber: string;
    date: string;   // ISO yyyy-mm-dd
    validity?: string;
    subject: string; // client-facing subtitle (e.g. "Project Proposal")
    attn?: string;   // "Attn: Mr. ..." line
  };
  parties: { from: Party; to: Party };
  money: {
    currency: Currency;
    numbering: Numbering;
    taxRows: TaxRow[];
  };
  items: Item[];          // used by quotation/invoice
  clauses: Clause[];
  payment: PaymentDetails;
  bands: BandControls;
  signature: {
    name: string;
    role: string;
    dataUrl?: string;
  };
  watermark: WatermarkPos;
  savedAt: number;
  savedName?: string;
};

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  quotation: "Quotation",
  invoice: "Invoice",
  agreement: "Agreement",
  tnc: "Terms & Conditions",
};

export const DOC_TYPE_EYEBROW: Record<DocType, string> = {
  quotation: "QUOTATION",
  invoice: "INVOICE",
  agreement: "AGREEMENT",
  tnc: "TERMS & CONDITIONS",
};

export const HAS_ITEMS: Record<DocType, boolean> = {
  quotation: true,
  invoice: true,
  agreement: false,
  tnc: false,
};

export const CURRENCIES: { code: Currency; symbol: string; label: string }[] = [
  { code: "INR", symbol: "₹", label: "INR — Indian Rupee" },
  { code: "USD", symbol: "$", label: "USD — US Dollar" },
  { code: "EUR", symbol: "€", label: "EUR — Euro" },
  { code: "AED", symbol: "د.إ", label: "AED — UAE Dirham" },
  { code: "GBP", symbol: "£", label: "GBP — British Pound" },
];

export function currencySymbol(c: Currency): string {
  return CURRENCIES.find((x) => x.code === c)?.symbol ?? c;
}

export function defaultTaxRows(c: Currency): TaxRow[] {
  if (c === "INR") {
    return [
      { id: "cgst", label: "CGST 9%", percent: 9 },
      { id: "sgst", label: "SGST 9%", percent: 9 },
    ];
  }
  return [{ id: "tax", label: "Tax", percent: 0 }];
}

export function makeId(): string {
  // small, no-import id (avoids importing uuid in shared code)
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function makeDefaultDoc(type: DocType): Doc {
  const today = new Date().toISOString().slice(0, 10);
  const yr = new Date().getFullYear();
  const prefix = { quotation: "Q", invoice: "INV", agreement: "AGR", tnc: "TNC" }[type];
  const num = Math.floor(1000 + Math.random() * 9000);

  const base: Doc = {
    id: makeId(),
    type,
    meta: {
      docNumber: `${prefix}-${yr}-${num}`,
      date: today,
      subject:
        type === "quotation"
          ? "Project Proposal"
          : type === "invoice"
          ? "Services Rendered"
          : type === "agreement"
          ? "Service Agreement"
          : "Terms & Conditions",
    },
    parties: {
      from: {
        name: "Prime Digitals",
        lines: "Your registered address\nCity, State — PIN\nhello@primedigitals.example",
      },
      to: {
        name: "Client Name",
        lines: "Client address\nCity, State — PIN\nclient@example.com",
      },
    },
    money: {
      currency: "INR",
      numbering: "indian",
      taxRows: defaultTaxRows("INR"),
    },
    items: HAS_ITEMS[type]
      ? [
          {
            id: makeId(),
            title: "Web Development",
            sub: "30+ page responsive website with UI/UX design",
            qty: 1,
            rate: 42200,
          },
          {
            id: makeId(),
            title: "Branding",
            sub: "Logo (with concepts & unlimited revisions), Flyer,\n2 Business Profile, Visiting card design",
            qty: 1,
            rate: 12500,
          },
        ]
      : [],
    clauses:
      type === "agreement" || type === "tnc"
        ? [
            {
              id: makeId(),
              title: "Scope",
              bodyHtml:
                "<p>This agreement outlines the scope of work to be delivered by Prime Digitals to the Client.</p>",
            },
            {
              id: makeId(),
              title: "Payment",
              bodyHtml:
                "<p>All invoices are payable within 15 days of issue unless otherwise agreed in writing.</p>",
            },
          ]
        : [
            {
              id: makeId(),
              title: "Payment Terms",
              bodyHtml: "<p>50% advance on confirmation, 50% on delivery.</p>",
            },
            {
              id: makeId(),
              title: "Delivery",
              bodyHtml: "<p>Estimated delivery within 4 weeks of confirmed brief.</p>",
            },
          ],
    payment: {
      upiId: "9316715060",
      bankAccount: "50100750274961",
      bankIfsc: "HDFC0001450",
      advancePaid: 0,
      thankYouNote: "Thanks for your business!",
      contactPhone: "+91 79901 98105",
      contactEmail: "hello@primedigitals.io",
    },
    bands: {
      topHeight: 110,
      topOffsetX: 0,
      topOffsetY: 0,
      topLogoLeft: 28,
      topLogoTop: 0,
      topLogoSize: 60,
      topTitleRight: 70,
      topTitleTop: 0,
      topTitleSize: 34,
      bottomHeight: 80,
      bottomOffsetX: 0,
      bottomOffsetY: 0,
      stampSize: 96,
      stampOffsetX: 0,
      stampOffsetY: 0,
    },
    signature: {
      name: "PRIME DIGITALS",
      role: "",
    },
    watermark: "none",
    savedAt: Date.now(),
  };
  return base;
}
