export function Footer() {
  return (
    <footer className="relative glass border-t border-white/20 py-12 mt-20">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 opacity-50"></div>
      <div className="relative container mx-auto px-6">
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <div className="w-10 h-10 bg-gradient-primary rounded-xl flex items-center justify-center mr-3 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 bg-clip-text text-transparent">
              BenchMark My Website
            </span>
          </div>
          
          <p className="text-gray-600 text-lg mb-8 max-w-2xl mx-auto font-medium">
            Made with <span className="text-red-500 animate-pulse">❤️</span> for better AI-website compatibility
            <br />
            <span className="text-sm text-gray-500 mt-2 block">
              Empowering developers to create AI-friendly web experiences
            </span>
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-sm text-gray-500 mb-8">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span className="font-medium">Powered by BrowserUse</span>
            </div>
            <span className="hidden sm:block text-gray-300">•</span>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7c0-2.21-3.582-4-8-4s-8 1.79-8 4z" />
              </svg>
              <span className="font-medium">Secured by Supabase</span>
            </div>
            <span className="hidden sm:block text-gray-300">•</span>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              <span className="font-medium">Built with Next.js & TypeScript</span>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <p className="text-xs text-gray-400">
              © 2024 BenchMark My Website. All rights reserved.
              <span className="block sm:inline sm:ml-2 mt-1 sm:mt-0">
                Making the web more AI-accessible, one benchmark at a time.
              </span>
            </p>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-secondary rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float"></div>
      <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-tertiary rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-float" style={{animationDelay: '2s'}}></div>
    </footer>
  )
} 