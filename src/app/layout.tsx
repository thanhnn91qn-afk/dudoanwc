import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dự đoán World Cup 2026",
  description:
    "Tạo tên, dự đoán thắng thua các trận World Cup 2026 và thi đấu cùng bạn bè.",
};

const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('dudoanwc-theme');
    var theme = stored;
    if (!theme) {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
