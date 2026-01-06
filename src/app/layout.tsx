import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Hospital EMR",
  description: "Electronic Medical Records System",
  icons: {
    icon: "/favicon.svg",
    apple: "/icon-192.png",
  },
  manifest: "/manifest.json",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0ea5e9" },
    { media: "(prefers-color-scheme: dark)", color: "#0ea5e9" },
  ],
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EMR",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: "cover",
  },
  formatDetection: {
    telephone: false,
    email: false,
    address: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        
        {/* iOS-specific meta tags for native-like experience */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="EMR" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <link rel="apple-touch-startup-image" href="/icon-512.png" />
        
        {/* Theme color for status bar */}
        <meta name="theme-color" content="#0ea5e9" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0ea5e9" media="(prefers-color-scheme: dark)" />
        
        {/* Viewport settings for iOS PWA */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
        
        {/* Disable iOS auto-detection */}
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
        
        {/* PWA optimization */}
        <meta name="mobile-web-app-capable" content="yes" />
        
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Service Worker registration
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').then(
                    (registration) => {
                      console.log('SW registered:', registration);
                    },
                    (error) => {
                      console.log('SW registration failed:', error);
                    }
                  );
                });
              }
              
              // iOS PWA detection and optimization
              const isIOSPWA = ('standalone' in window.navigator) && window.navigator.standalone;
              if (isIOSPWA) {
                document.documentElement.classList.add('ios-pwa');
                // Prevent pull-to-refresh
                let lastTouchY = 0;
                let preventPullToRefresh = false;
                document.addEventListener('touchstart', (e) => {
                  if (e.touches.length !== 1) return;
                  lastTouchY = e.touches[0].clientY;
                  preventPullToRefresh = window.pageYOffset === 0;
                }, { passive: false });
                document.addEventListener('touchmove', (e) => {
                  const touchY = e.touches[0].clientY;
                  const touchYDelta = touchY - lastTouchY;
                  lastTouchY = touchY;
                  if (preventPullToRefresh && touchYDelta > 0) {
                    e.preventDefault();
                  }
                }, { passive: false });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

