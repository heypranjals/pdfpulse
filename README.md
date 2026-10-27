# PDFPulse - Client-Side Commercial PDF Utility Suite

PDFPulse is an ultra-fast, 100% private, client-side commercial-grade PDF manipulation suite. All PDF operations run directly inside the user's browser using WebAssembly and modern JavaScript (`pdf-lib`, `pdfjs-dist`, `jspdf`, `jszip`). Documents never leave the client device, delivering zero-latency processing and unmatched enterprise privacy at $0 server compute cost.

---

## ⚡ Core Features

- **Merge PDF**: Combine multiple PDFs into a single file with custom ordering.
- **Split PDF**: Extract page ranges or burst all pages into individual PDFs bundled in a `.zip`.
- **Compress PDF**: Optimize object streams and resample canvases at selectable compression profiles (Extreme, Recommended, Less).
- **PDF to JPG / PNG**: Render high-res raster previews and export page snapshots into a `.zip`.
- **JPG / PNG to PDF**: Assemble images into uniform, beautifully margined PDF documents.
- **Rotate PDF**: Instant 90° / 180° / 270° orientation corrections across pages.
- **Watermark PDF**: Stamp custom text watermarks with opacity and coordinate controls.
- **Add Page Numbers**: Automated pagination stamping (`Page X of Y`) on headers/footers.
- **Sign & Sanitize PDF**: Digital canvas signature placement and document metadata stripping.

---

## 💰 Monetization Architecture

PDFPulse is configured for revenue generation out of the box via `src/config/monetization.ts`:

- **Display Ads**: Slots for Google AdSense / Header Bidding (`Leaderboard 728x90`, `Sidebar 300x250`, `Post-Download Interstitial`).
- **Freemium Pro Tier**:
  - **Free**: Up to 3 files per batch, ad-supported.
  - **Pro Tier ($5/month or $29 Lifetime)**: Unlimited batches, ad-free experience.
- **Payment Gateways**: Direct support for Stripe Payment Links, Razorpay, and custom checkout flows.
- **Affiliate & Sponsor Slots**: Post-processing conversion cards for cloud storage, e-signatures, and password managers.

### Configuring Monetization
Edit [src/config/monetization.ts](file:///C:/Users/pranjal%20singh/.gemini/antigravity/scratch/pdfpulse/src/config/monetization.ts) with your credentials:
```typescript
export const monetization = {
  adSensePublisherId: 'ca-pub-XXXXXXXXXXXXXXXX', // Your Google AdSense Publisher ID
  stripeLink: 'https://buy.stripe.com/your-payment-link', // Your Stripe Checkout link
  proPlan: {
    priceMonthly: 5,
    priceLifetime: 29,
  },
};
```

---

## 🚀 Development & Build

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run linting and type checking
npm run test

# Production build
npm run build
```

---

## 🌐 Deployment

Automated GitHub Actions CI/CD publishes the static build directly to **GitHub Pages** on every push to `main`.
