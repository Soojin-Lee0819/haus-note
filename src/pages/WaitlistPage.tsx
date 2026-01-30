import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function WaitlistPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)

  // Trigger entrance animations
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { error: insertError } = await supabase
        .from('waitlist')
        .insert({ email: email.toLowerCase().trim() })

      if (insertError) {
        if (insertError.code === '23505') {
          setError("You're already on the waitlist!")
        } else {
          throw insertError
        }
      } else {
        setSubmitted(true)
      }
    } catch (err: any) {
      console.error('Waitlist error:', err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  // Success state - full page celebration
  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Header */}
        <header className="w-full px-6 py-5 sm:px-8 lg:px-12">
          <div className="max-w-[1400px] mx-auto">
            <span className="font-sans text-xl font-bold">haus note</span>
          </div>
        </header>

        {/* Success Content */}
        <main className="flex-1 flex items-center justify-center px-6 sm:px-8">
          <div className="text-center max-w-md animate-fade-in-up">
            {/* Checkmark Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="font-sans font-bold text-3xl sm:text-4xl text-[#1A1A1A] mb-3">
              You're on the list!
            </h1>

            <p className="text-[#666] text-lg mb-8">
              We'll send you an email when haus note is ready.
              <br />
              Get ready to organize your apartment hunt.
            </p>

            {/* Social Link */}
            <p className="text-[#888] text-sm">
              Follow{' '}
              <a
                href="https://beacons.ai/soojintech"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1A1A1A] font-medium hover:underline"
              >
                @soojintech
              </a>
              {' '}for updates
            </p>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full px-6 py-4 text-center sm:px-8">
          <p className="text-xs text-[#999]">
            © {new Date().getFullYear()} haus note
          </p>
        </footer>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden">
      {/* Header */}
      <header className="w-full px-6 py-5 sm:px-8 lg:px-12 relative z-10">
        <div className="max-w-[1600px] mx-auto">
          <span
            className={`font-sans text-xl font-bold inline-block transition-all duration-700 ease-out ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}
          >
            haus note
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center px-6 pb-8 sm:px-8 lg:px-12 xl:px-16">
        <div className="w-full max-w-[1600px] mx-auto lg:flex lg:items-center lg:gap-12 xl:gap-16">

          {/* Left Side - Text & Form (narrower) */}
          <div className="lg:w-[38%] xl:w-[35%] lg:flex-shrink-0 relative z-10">
            {/* Large Header */}
            <h1
              className={`font-sans font-bold text-[2.5rem] leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.25rem] xl:text-[3.75rem] transition-all duration-700 ease-out delay-100 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              Apartment hunting <span className="text-[#666]">(finally)</span>
              <br />
              organized.
            </h1>

            {/* Subheader */}
            <p
              className={`mt-5 text-[#666] text-base leading-relaxed sm:text-lg lg:mt-6 max-w-md transition-all duration-700 ease-out delay-200 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              Can't keep track of apartments in spreadsheets anymore? Track every apartment you see, map your commutes, and remember what you loved (or hated).
            </p>

            {/* Email Form */}
            <form
              onSubmit={handleSubmit}
              className={`mt-8 lg:mt-10 transition-all duration-700 ease-out delay-300 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end max-w-md">
                <div className="flex-1">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    required
                    className="w-full px-0 py-3 text-base border-0 border-b-2 border-gray-200 focus:border-[#1A1A1A] focus:ring-0 outline-none bg-transparent placeholder-gray-400 transition-colors sm:text-lg"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="px-7 py-3 bg-accent text-white font-semibold rounded-full hover:bg-accent-dark active:scale-[0.98] disabled:opacity-50 transition-all whitespace-nowrap shadow-lg shadow-accent/25"
                >
                  {loading ? 'Joining...' : 'Join waitlist'}
                </button>
              </div>
              {error && (
                <p className="mt-3 text-red-500 text-sm">{error}</p>
              )}
            </form>

            {/* Social Link */}
            <p
              className={`mt-6 text-[#888] text-sm transition-all duration-700 ease-out delay-[400ms] ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              Follow{' '}
              <a
                href="https://beacons.ai/soojintech"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1A1A1A] font-medium hover:underline"
              >
                @soojintech
              </a>
              {' '}for updates →
            </p>
          </div>

          {/* Right Side - Large App Screenshot */}
          <div
            className={`mt-12 lg:mt-0 lg:flex-1 transition-all duration-1000 ease-out delay-200 ${
              mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-12'
            }`}
          >
            <div className="relative lg:-mr-12 xl:-mr-24 2xl:-mr-32">
              {/* Subtle gradient backdrop */}
              <div className="absolute -inset-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl blur-2xl opacity-60" />

              {/* Main image */}
              <img
                src="/images/feature-list-map.png"
                alt="haus note app preview showing apartment list and map view"
                className="relative w-full rounded-xl shadow-2xl border border-gray-200/80 lg:rounded-2xl"
              />

              {/* Subtle overlay for polish */}
              <div className="absolute inset-0 rounded-xl lg:rounded-2xl ring-1 ring-inset ring-black/[0.03] pointer-events-none" />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        className={`w-full px-6 py-4 text-center sm:px-8 lg:px-12 transition-all duration-700 ease-out delay-500 ${
          mounted ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <p className="text-xs text-[#999]">
          © {new Date().getFullYear()} haus note
        </p>
      </footer>

      {/* Custom animation keyframes */}
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
        }
      `}</style>
    </div>
  )
}
