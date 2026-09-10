export type DocType = "quotation" | "invoice" | "agreement" | "tnc" | "letter";

export type LetterTemplate = "internship-offer" | "job-offer" | "general";

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

  // Contact column (phone + email) on last page
  contactFontSize: number; // px (default 12)
  contactOffsetX: number;  // px, shift left(-) / right(+)
  contactOffsetY: number;  // px, shift up(-) / down(+)
};

export type LayoutMode = "flow" | "free";

/** Positional override for one element on the page. All values in px, page-space. */
export type LayoutOverride = {
  /** flow: translate delta. free: absolute left within .fg-body. */
  dx: number;
  /** flow: translate delta. free: absolute top within .fg-body. */
  dy: number;
  /** explicit width (px); undefined = natural */
  w?: number;
  /** explicit height (px); undefined = natural */
  h?: number;
  /** default "flow" */
  mode?: LayoutMode;
  /** free only — 0-based page the element is pinned to */
  page?: number;
  /** stacking order within the page; default 0 */
  z?: number;
};

/** id → override. Ids are stable strings; see LAYOUT_ELEMENTS in lib/layout.ts */
export type LayoutMap = Record<string, LayoutOverride>;

export const EMPTY_OVERRIDE: LayoutOverride = { dx: 0, dy: 0 };

export type LetterFields = {
  template: LetterTemplate;
  title: string;          // "Internship Offer Letter"
  salutation: string;     // "Dear Mr. Krishna Mehta"
  closing: string;        // "Wishing you success!"
  closing2: string;       // "Happy Working!"
  signoff: string;        // "For, UMM Studios..."
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
  letter?: LetterFields;
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
  /** free-form positioning overrides, keyed by stable element id */
  layout: LayoutMap;
  signature: {
    name: string;
    role: string;
    dataUrl?: string;
  };
  watermark: WatermarkPos;
  savedAt: number;
  savedName?: string;
  /** set when this doc was produced by converting another (e.g. quotation → invoice) */
  convertedFrom?: { id: string; type: DocType; docNumber: string };
};

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  quotation: "Quotation",
  invoice: "Invoice",
  agreement: "Agreement",
  tnc: "Terms & Conditions",
  letter: "Letter",
};

export const DOC_TYPE_EYEBROW: Record<DocType, string> = {
  quotation: "QUOTATION",
  invoice: "INVOICE",
  agreement: "AGREEMENT",
  tnc: "TERMS & CONDITIONS",
  letter: "LETTER",
};

export const HAS_ITEMS: Record<DocType, boolean> = {
  quotation: true,
  invoice: true,
  agreement: false,
  tnc: false,
  letter: false,
};

export const IS_LETTER: Record<DocType, boolean> = {
  quotation: false,
  invoice: false,
  agreement: false,
  tnc: false,
  letter: true,
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

export const LETTER_TEMPLATES: Record<
  LetterTemplate,
  { title: string; salutation: string; closing: string; closing2: string; signoff: string; clauses: { title: string; bodyHtml: string }[] }
> = {
  "internship-offer": {
    title: "Internship Offer Letter",
    salutation: "Dear Mr. Recipient Name",
    closing: "Wishing you success!",
    closing2: "Happy Working!",
    signoff: "For, Prime Digitals.",
    clauses: [
      {
        title: "",
        bodyHtml:
          "<p><strong>Congratulations!</strong> Following your application and subsequent interview, we are pleased to confirm you have been selected to work for <strong>Prime Digitals</strong>. We are delighted to make you the following Internship offer. Your internship will start on <strong>23 December 2024</strong> with a stipend of Rs. 7500 per month. All of us at <strong>Prime Digitals</strong> are excited that you will be joining our team!</p>",
      },
      {
        title: "",
        bodyHtml: "<p>For this role, you will work with the <strong>UI/UX</strong> team as an <strong>Intern</strong>.</p>",
      },
      {
        title: "Terms of engagement",
        bodyHtml:
          "<ul><li>Working Hours: 8 Hours daily, 10:00 AM – 6:00 PM (Monday through Friday)</li><li>Period of Engagement: 3 months</li></ul>",
      },
      {
        title: "",
        bodyHtml:
          "<p>Any action that could affect our business, reputation, or other key credentials would lead to direct termination of the internship with no further notice.</p><p>We hope that you will work to your level best to improve the efficiency and performance of this company.</p><p>Once again, congratulations to you on your selection and all the best for your endeavours.</p>",
      },
    ],
  },
  "job-offer": {
    title: "Offer of Employment",
    salutation: "Dear Mr. Recipient Name",
    closing: "Welcome aboard!",
    closing2: "",
    signoff: "For, Prime Digitals.",
    clauses: [
      {
        title: "",
        bodyHtml:
          "<p>We are pleased to extend to you an offer of employment with <strong>Prime Digitals</strong>, effective <strong>start date</strong>. We were impressed with your background and believe you will be a valuable addition to our team.</p>",
      },
      {
        title: "Position & Compensation",
        bodyHtml:
          "<ul><li>Position: <strong>Role title</strong></li><li>Compensation: <strong>₹X,XX,XXX</strong> per annum</li><li>Working hours: 9:00 AM – 6:00 PM, Monday through Friday</li></ul>",
      },
      {
        title: "",
        bodyHtml:
          "<p>Please confirm your acceptance by signing and returning a copy of this letter at your earliest convenience.</p>",
      },
    ],
  },
  general: {
    title: "Letter",
    salutation: "Dear Recipient",
    closing: "Sincerely,",
    closing2: "",
    signoff: "Prime Digitals",
    clauses: [
      {
        title: "",
        bodyHtml: "<p>Letter body. Replace this with your message.</p>",
      },
    ],
  },
};

export const DOC_NUMBER_PREFIX: Record<DocType, string> = {
  quotation: "Q",
  invoice: "INV",
  agreement: "AGR",
  tnc: "TNC",
  letter: "LTR",
};

/** e.g. "INV-2026-4731". Random suffix — see the plan's notes on sequential numbering. */
export function makeDocNumber(type: DocType): string {
  const yr = new Date().getFullYear();
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${DOC_NUMBER_PREFIX[type]}-${yr}-${num}`;
}

export function makeDefaultDoc(type: DocType): Doc {
  const today = new Date().toISOString().slice(0, 10);
  const isLetter = type === "letter";
  const tpl = isLetter ? LETTER_TEMPLATES["internship-offer"] : null;

  const base: Doc = {
    id: makeId(),
    type,
    meta: {
      docNumber: makeDocNumber(type),
      date: today,
      subject:
        type === "quotation"
          ? "Project Proposal"
          : type === "invoice"
          ? "Services Rendered"
          : type === "agreement"
          ? "Service Agreement"
          : type === "letter"
          ? "Internship Offer Letter"
          : "Terms & Conditions",
    },
    ...(isLetter && tpl
      ? {
          letter: {
            template: "internship-offer" as LetterTemplate,
            title: tpl.title,
            salutation: tpl.salutation,
            closing: tpl.closing,
            closing2: tpl.closing2,
            signoff: tpl.signoff,
          },
        }
      : {}),
    parties: {
      from: {
        name: "Prime Digitals",
        lines: "Your registered address\nCity, State — PIN\nbusiness@primedigitals.co.in",
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
    clauses: tpl
      ? tpl.clauses.map((c) => ({ id: makeId(), title: c.title, bodyHtml: c.bodyHtml }))
      : type === "agreement" || type === "tnc"
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
      contactEmail: "business@primedigitals.co.in",
    },
    bands: {
      topHeight: 174,
      topOffsetX: 0,
      topOffsetY: 8,
      topLogoLeft: 45,
      topLogoTop: 12,
      topLogoSize: 45,
      topTitleRight: 83,
      topTitleTop: 14,
      topTitleSize: 35,
      bottomHeight: 220,
      bottomOffsetX: 0,
      bottomOffsetY: 55,
      stampSize: 137,
      stampOffsetX: -10,
      stampOffsetY: 7,
      contactFontSize: 12,
      contactOffsetX: 0,
      contactOffsetY: 0,
    },
    layout: {},
    signature: {
      name: "PRIME DIGITALS",
      role: "",
    },
    watermark: "none",
    savedAt: Date.now(),
  };
  return base;
}
