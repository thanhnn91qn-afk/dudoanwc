import type { Metadata } from "next";
import Script from "next/script";
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
      <body className="min-h-full">
        {children}
        {/*
          Twemoji: render country flag emoji thành ảnh PNG (maxcdn).
          Cần vì Windows Chrome/Edge/Firefox không có font emoji hỗ trợ
          Regional Indicator Symbols → cờ hiện thành 2 chữ cái (MX, BR, ...).
          Twemoji scan DOM và thay thế mọi emoji (kể cả sinh ra sau) thành <img>.
        */}
        <Script
          id="twemoji-loader"
          src="https://cdn.jsdelivr.net/npm/twemoji@14.0.2/dist/twemoji.min.js"
          strategy="afterInteractive"
        />
        <Script id="twemoji-init" strategy="afterInteractive">
          {`
            (function() {
              var TW = 'https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/';
              var opts = { base: TW, ext: '.svg', className: 'twemoji' };
              function parse() {
                try {
                  if (typeof twemoji !== 'undefined' && document.body) {
                    twemoji.parse(document.body, opts);
                  }
                } catch (e) {}
              }
              // Chờ twemoji load xong (script trên cùng strategy có thể
              // chưa sẵn sàng khi script này chạy)
              function start() {
                if (typeof twemoji === 'undefined') {
                  return setTimeout(start, 50);
                }
                parse();
                var obs = new MutationObserver(function() { parse(); });
                obs.observe(document.body, { childList: true, subtree: true });
              }
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', start);
              } else {
                start();
              }
            })();
          `}
        </Script>
      </body>
    </html>
  );
}
