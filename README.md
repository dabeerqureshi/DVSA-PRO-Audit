# DVSA Mileage Discrepancy Auditing System

A high-performance vehicle mileage verification and DVSA discrepancy auditing web application built with **Next.js 14**, **TypeScript**, **Tailwind CSS**, and **SheetJS**. Designed to process BCA and dealer auction spreadsheets client-side, automatically evaluate odometer discrepancies against historical MOT readings, and export reports in the exact 4-column schema requested.

---

## Output Schema Specification

The export pipeline generates files (.xlsx and .csv) formatted with the exact 4 columns:

| Column Name | Type | Description | Example |
| :--- | :--- | :--- | :--- |
| **`reg no`** | String | Vehicle registration number | `EP21 GZU` |
| **`milage`** | String / Number | Listed auction odometer reading | `91,094` |
| **`dvsaa`** | String | Complete DVSA MOT history string | `35k (21/06/2024), 52k (08/07/2025), 57k (09/06/2026)` |
| **`d/f`** | Number / String | Calculated discrepancy difference ($\Delta$) | `34,094` |

---

## Auditing Algorithm & Business Rules

1. **Header Offset & Column Detection**:
   - Automatically scans rows 1–12 to skip auction pricing sub-headers and locate the real table headers.
   - Detects `Registration Number` (Col F), `Mileage` (Col Q), and `DVSA Mileage` (Col X).
   - Protects `Mileage` from being confused with `Last Service Mileage`.
   - Includes manual column mapping dropdowns for custom file layouts.

2. **DVSA MOT History Extraction**:
   - Parses multi-entry historical strings (e.g. `35k (21/06/2024), 52k (08/07/2025), 57k (09/06/2026)`).
   - Isolates the latest recorded entry by date stamp (`57k (09/06/2026)`).
   - Evaluates `k` multipliers (e.g., `57k` $\rightarrow$ $57,000$) and full numbers (`118,505` $\rightarrow$ $118,505$).

3. **Discrepancy Evaluation**:
   $$\text{d/f} = \text{milage} - \text{last\_dvsa} \quad (\text{most recent DVSA MOT entry})$$
   $$\text{Flagged when } |\text{d/f}| \ge 20,000$$
   - Production default threshold is **20,000 miles** (user-configurable to 10k, 20k, 30k, 50k, or custom numeric).

---

## Features

- **Drag-and-Drop Dropzone & Paste Modal**: Ingests `.xlsx`, `.xls`, `.csv` files, and direct tab-separated clipboard paste.
- **Sub-header Auto-Filtration**: Automatically skips valuation rows (CAP, Glass's Guide, Buy Now prices) and isolates real vehicle records.
- **1-Click Sample Auction Data**: Preloaded with authentic BCA / dealer test batches (10 real vehicle records).
- **100% In-Browser Execution**: Zero server uploads, zero payload size limits, zero server latency, and 100% data privacy.
- **Interactive KPI Cards**: Scanned records, Flagged count, Passed count, Pass Rate %, and Maximum Discrepancy.
- **Search & Filtering**: Search by vehicle registration, filter by All / Flagged / Passed tabs, and paginated display.
- **Export Engine**: 1-click download of `.xlsx` with styled column widths and `.csv` formatted files.

---

## Local Development

```bash
# Install dependencies
npm install

# Run unit tests
npm test

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Build & Verification

```bash
npm run build
npm start
```

---

## Deployment to Vercel (100% Production Ready)

### Option 1: Git Push to GitHub & Connect to Vercel
1. Push this repository to your GitHub account:
   ```bash
   git add .
   git commit -m "feat: complete DVSA mileage audit system"
   git push origin main
   ```
2. Log into [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Import the repository — Vercel will automatically detect **Next.js** framework and configure the build command (`next build`).
4. Click **Deploy**.

### Option 2: Deploy via Vercel CLI
```bash
npm i -g vercel
vercel
```
Follow the interactive CLI prompts to deploy straight to production:
```bash
vercel --prod
```
