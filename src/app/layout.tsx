import type { Metadata } from "next";
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"

export const metadata: Metadata = {
  title: "Together Forever - Couple App",
  description: "A romantic app for couples to stay connected",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          {/* Auth Header - Only show when signed out */}
          <SignedOut>
            <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl shadow-lg border-b border-white/20">
              <div className="flex items-center justify-between px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-rose-400 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-pink-600 to-rose-600 bg-clip-text text-transparent">
                    Together Forever
                  </h1>
                </div>
                <div className="flex items-center gap-3">
                  <SignInButton mode="modal">
                    <button className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-pink-600 transition-colors">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="px-4 py-2 bg-gradient-to-r from-pink-400 to-rose-400 text-white rounded-2xl font-medium hover:from-pink-500 hover:to-rose-500 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105">
                      Get Started
                    </button>
                  </SignUpButton>
                </div>
              </div>
            </div>
          </SignedOut>

          {/* User Menu - Only show when signed in */}
          <SignedIn>
            <div className="fixed top-4 right-4 z-50">
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10 rounded-full shadow-lg border-2 border-white/20",
                    userButtonPopoverCard: "bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl",
                    userButtonPopoverActionButton: "hover:bg-pink-50 text-gray-700",
                    userButtonPopoverActionButtonText: "text-sm font-medium",
                    userButtonPopoverFooter: "border-t border-gray-100",
                  }
                }}
              />
            </div>
          </SignedIn>

          {/* Main Content */}
          <main className={`
            ${typeof window !== 'undefined' ? 'pt-0' : 'pt-0'}
            min-h-screen
          `}>
            {children}
          </main>
          
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
