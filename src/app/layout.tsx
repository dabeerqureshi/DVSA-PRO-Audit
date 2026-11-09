import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DVSA Mileage Discrepancy Auditing System',
  description:
    'Automated vehicle auction odometer vs. DVSA MOT mileage discrepancy verification tool. Flags records exceeding 20,000 miles.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
