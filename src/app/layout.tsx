import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AMU KARA - Suno AI Karaoke",
  description: "Suno AI 全自動カラオケシステム",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <style>{`
          * { box-sizing: border-box; }
          body {
            background-color: #f8fafc !important;
            color: #1e293b !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            margin: 0; padding: 0; min-height: 100vh;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
          }
          .app-container {
            width: 100%; max-width: 440px; margin: 0 auto; padding: 16px;
            display: flex; flex-direction: column; align-items: center;
          }
          .app-logo {
            max-width: 280px !important; width: 85% !important; height: auto !important;
            border-radius: 16px; box-shadow: 0 10px 25px rgba(236, 72, 153, 0.25);
          }
          .main-card {
            width: 100%; background: #ffffff !important;
            border: 2px solid #e2e8f0 !important; border-radius: 24px !important;
            padding: 24px !important; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.08) !important;
            position: relative; overflow: hidden; margin-top: 16px;
          }
          .ai-top-line {
            position: absolute; top: 0; left: 0; right: 0; height: 6px;
            background: linear-gradient(90deg, #ec4899, #a855f7, #06b6d4) !important;
          }
          .code-box {
            width: 100%; background-color: #0f172a !important; color: #4ade80 !important;
            font-family: monospace !important; font-size: 16px !important; padding: 12px !important;
            border-radius: 12px !important; border: 1px solid #1e293b !important;
            box-sizing: border-box; margin: 12px 0 !important; outline: none;
          }
          .copy-btn {
            width: 100%; padding: 14px 20px !important;
            background: linear-gradient(90deg, #9333ea, #db2777, #06b6d4) !important;
            color: #ffffff !important; font-weight: bold !important; font-size: 14px !important;
            border: none !important; border-radius: 14px !important; cursor: pointer;
            box-shadow: 0 4px 14px rgba(219, 39, 119, 0.3) !important; transition: transform 0.1s;
          }
          .copy-btn:active { transform: scale(0.97); }
        `}</style>
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
