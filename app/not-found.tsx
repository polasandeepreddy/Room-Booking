import Link from 'next/link';
import { Building2, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6 bg-slate-900/60 p-8 rounded-2xl border border-slate-800">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
          <Building2 className="w-7 h-7" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">404</h1>
          <h2 className="text-lg font-semibold text-gray-200 mb-1">Page Not Found</h2>
          <p className="text-xs text-gray-400">
            The page you are looking for does not exist or has been moved.
          </p>
        </div>
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-bold text-xs hover:from-amber-400 hover:to-amber-500 transition-all shadow-lg shadow-amber-500/20"
          >
            <Home className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
