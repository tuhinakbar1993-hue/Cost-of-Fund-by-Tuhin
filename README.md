# Cost of Fund by Tuhin

A high-precision, 100% client-side web application built for the Special Asset / Finance division in Bangladesh.
- **Developer**: Mohammad Towhidul Akbar Tuhin (Officer, Sammilito Islami Bank PLC; BBA, Heriot Watt University, UK; MBA, University of Chittagong)

The app parses Core Banking System (CBS) PDF reports and generates two official Excel documents:
1. **Cost of Fund (COF) Calculation** (`Cost_of_Fund.xlsx`, sheet `"Calculation of COF (2)"`) with live audit formulas.
2. **Settlement Summary** (`Summary.xlsx`, sheet `"Enigma Summary"`) displaying liability positions, settlement covering COF, proposed waivers, security valuations, and legal statuses.

---

## Key Highlights & Hard Rules Complied
- **100% Client-Side & Private**: Customer financial data never leaves the browser. No server uploads, no analytics, no external LLM/AI APIs.
- **Strict UTC Date Math**: All date arithmetic utilizes `Date.UTC` integer day numbers (`Math.floor(Date.UTC(...) / 86400000)`), preventing Asia/Dhaka or system timezone shifts from ever shifting a day.
- **365-Day Convention**: All segment time periods strictly divide by 365 (even in leap years, e.g. 366 days = 1.0027).
- **Parallel PDF Parsing**: Uses `pdfjs-dist` text layer extraction (`disableFontFace: true`, zero canvas rendering, no OCR) with coordinate binning.
- **Instant In-Memory Calculation**: Recomputes in < 50ms upon any rate or manual parameter edit with memoization.
- **Deduplication**: Automatic deduplication by 13-digit account number and content hash.
- **Live Cross-Report Audit**: 7 verification checks comparing Ledger final principal, Outstanding report amounts, and Party Performance recovery groups.
- **Dynamic ExcelJS Export**: Loads `exceljs` via dynamic `import()` strictly on download. Generates live formulas (`=D5-C5+1`, `=E5/365`, `=F5*G5*H5/100`, `=SUM(...)`, and millions formatting `#,##0.0000,,`).

---

## Acceptance Test Benchmark (Ocean Agro Farm)
Built-in benchmark dataset loaded via the "Load Sample Case" button:
- **Accounts**: `0547100001346`, `0547100001662`, `0547100003045`, `0547100003056`
- **Cut-off Date**: `05/11/2026`
- **COF Segments**: 37 total (12 / 10 / 8 / 7 per account)
- **Account Subtotals**: ~ 245,660.57 / 58,162.09 / 92,696.36 / 107,771.66
- **Total COF**: ~ 504,290.67
- **Total Realized (Profit + Comp)**: 14,233.00 + 219,900.72 = 234,133.72
- **Surplus/Deficit**: 270,156.95
- **Liability A**: 691,924.81
- **Settlement B**: 573,756.67
- **Proposed Waiver C**: 118,168.14
- **Validations**: All 7 pass (100% green).

---

## Running Locally

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run unit tests
npx tsx -e "import { runAllUnitTests } from './src/tests/unitTests.ts'; console.table(runAllUnitTests());"
```
