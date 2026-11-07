import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CONTINUUM — The Living Archive',
  description: 'Project knowledge intelligence. Your projects evolve. Their knowledge should survive.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
