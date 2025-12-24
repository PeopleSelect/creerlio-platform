'use client';

import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const MapboxMap = dynamic(() => import('../components/MapboxMap'), { ssr: false });

export default function HomePage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const check = async () => {
      const { data } = await supabase.auth.getSession();
      setIsAuthenticated(!!data.session?.user?.id);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run-home-auth',hypothesisId:'C',location:'frontend/src/app/page.tsx:check',message:'home(src/app) session check',data:{hasSession:!!data.session?.user?.id,hasEmail:!!data.session?.user?.email},timestamp:Date.now()})}).catch(()=>{});
      // #endregion
    };
    check().catch(() => setIsAuthenticated(false));
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      check().catch(() => setIsAuthenticated(false));
    });
    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/6182f207-3db2-4ea3-b5df-968f1e2a56cc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sessionId:'debug-session',runId:'run-home-render',hypothesisId:'D',location:'frontend/src/app/page.tsx:buttons',message:'home(src/app) button visibility',data:{isAuthenticated,showsCreateTalent:!isAuthenticated,showsCreateBusiness:!isAuthenticated,showsTalentDashboard:true,showsBusinessDashboard:false},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
  }, [isAuthenticated]);

  return (
    <main className='min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white'>
      
      {/* Header */}
      <header className='sticky top-0 z-50 backdrop-blur bg-slate-950/70 border-b border-white/10'>
        <div className='max-w-7xl mx-auto px-6 py-4 flex items-center justify-between'>
          <div className='text-xl font-bold'>Creerlio</div>
          <nav className='flex items-center gap-6 text-sm text-slate-300'>
            <Link href='#about'>About</Link>
            <Link href='#talent'>Talent</Link>
            <Link href='#business'>Business</Link>
            <Link href='#search'>Search</Link>
            {!isAuthenticated ? (
              <>
                <Link href='/login' className='hover:text-blue-400 transition-colors'>Sign in</Link>
                <Link href='/login?mode=signup&role=talent&redirect=/dashboard/talent' className='px-4 py-2 rounded bg-blue-500 text-white'>
                  Create Talent account
                </Link>
                <Link href='/login?mode=signup&role=business&redirect=/dashboard/business' className='px-4 py-2 rounded bg-green-500 text-white'>
                  Create Business account
                </Link>
              </>
            ) : (
              <button
                type='button'
                className='hover:text-blue-400 transition-colors'
                onClick={async () => {
                  await supabase.auth.signOut();
                  router.refresh();
                }}
              >
                Sign out
              </button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className='max-w-7xl mx-auto px-6 py-28 grid grid-cols-1 lg:grid-cols-2 gap-20 items-center'>
        <div className='space-y-8'>
          <h1 className='text-5xl lg:text-6xl font-extrabold leading-tight'>
            Creerlio  The AI Powered<br />
            <span className='text-blue-400 glow-text'>Talent & Business</span> Platform
          </h1>
          <p className='text-lg text-slate-300 max-w-xl'>
            Smarter hiring, deeper talent insight, and proactive workforce strategy.
            Creerlio connects businesses and talent through AI-powered matching,
            location intelligence, and dynamic portfolios.
          </p>
          <div className='flex gap-4'>
            <Link href='/search' className='px-6 py-3 rounded bg-blue-500 font-semibold'>
              Search businesses & jobs
            </Link>
            {!isAuthenticated ? (
              <>
                <Link href='/login/talent?mode=signin&redirect=/dashboard/talent' className='px-6 py-3 rounded border border-white/20'>
                  Sign in (Talent)
                </Link>
                <Link href='/login/business?mode=signin&redirect=/dashboard/business' className='px-6 py-3 rounded border border-white/20'>
                  Sign in (Business)
                </Link>
              </>
            ) : (
              <>
            <Link href='/dashboard/talent' className='px-6 py-3 rounded border border-white/20'>
                  Talent Dashboard
                </Link>
                <Link href='/dashboard/business' className='px-6 py-3 rounded border border-white/20'>
                  Business Dashboard
            </Link>
              </>
            )}
          </div>
        </div>

        {/* Map */}
        <div className='relative h-[420px] rounded-3xl overflow-hidden border border-blue-500/20 bg-slate-900/60'>
          <MapboxMap />
        </div>
      </section>

      {/* Metrics */}
      <section className='max-w-7xl mx-auto px-6 py-16 grid grid-cols-2 gap-12'>
        <div>
          <div className='text-4xl font-bold text-green-400'>84.38%</div>
          <div className='text-slate-400'>Match Accuracy</div>
        </div>
        <div>
          <div className='text-4xl font-bold text-blue-400'>655K</div>
          <div className='text-slate-400'>Active Talent</div>
        </div>
      </section>

      {/* Features */}
      <section className='max-w-7xl mx-auto px-6 py-24 space-y-12'>
        <h2 className='text-3xl font-bold'>Feature Set</h2>

        <div className='grid md:grid-cols-3 gap-8'>
          <div className='dashboard-card p-8 rounded-xl'>
            <h3 className='font-semibold text-xl mb-2'>Rich Multimedia Portfolios</h3>
            <p className='text-slate-400'>Video, credentials, projects, and interactive talent profiles.</p>
          </div>
          <div className='dashboard-card p-8 rounded-xl'>
            <h3 className='font-semibold text-xl mb-2'>Business Intelligence</h3>
            <p className='text-slate-400'>AI matching, analytics, and proactive hiring insights.</p>
          </div>
          <div className='dashboard-card p-8 rounded-xl'>
            <h3 className='font-semibold text-xl mb-2'>Location Intelligence</h3>
            <p className='text-slate-400'>Map-based insight into talent density and commute zones.</p>
          </div>
        </div>
      </section>

    </main>
  );
}
