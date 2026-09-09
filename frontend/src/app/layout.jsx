import "./globals.css";
import { AppProvider } from "../context/AppContext";
import { ToastContainer } from "../components/ui/Toast";

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <head>
        <title>DigiHall AI - Exam Attendance & Anti-Proxy System</title>
        <meta name="description" content="AI-Powered Exam Attendance, Multi-Hall Scheduling and Anti-Proxy Biometric Verification System" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700;800&family=Outfit:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-bg-dark text-slate-100 antialiased p-3 sm:p-5">
        <AppProvider>
          <div className="max-w-7xl mx-auto flex flex-col">
            {children}
            <ToastContainer />
          </div>
        </AppProvider>
      </body>
    </html>
  );
}
