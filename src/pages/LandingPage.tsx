import React, { useState, useRef } from 'react'
import { Camera, Link2, HelpCircle } from 'lucide-react'
import { authService } from '../services/authService'

export function LandingPage() {
  const [isLogin, setIsLogin] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showAuth, setShowAuth] = useState(false)
  const emailInputRef = useRef<HTMLInputElement>(null)

  const handleGetStarted = () => {
    // On desktop, scroll to auth form and focus email input
    if (window.innerWidth >= 1024) {
      emailInputRef.current?.focus()
      emailInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else {
      // On mobile, show auth screen
      setShowAuth(true)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await authService.signIn(email, password)
      } else {
        await authService.signUp(email, password, name)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // ========== MOBILE AUTH SCREEN ==========
  if (showAuth) {
    return (
      <div className="min-h-screen bg-white flex flex-col sm:hidden">
        <header className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <button
            onClick={() => setShowAuth(false)}
            className="text-[#666] text-sm"
          >
            Back
          </button>
          <span className="font-serif text-lg font-bold">haus note</span>
          <div className="w-10" />
        </header>

        <main className="flex-1 flex flex-col px-6 pt-8 pb-10">
          <div className="mb-8">
            <p className="text-sm text-[#666] mb-1">
              {isLogin ? 'Welcome back' : 'Create your account'}
            </p>
            <h1 className="text-2xl font-bold">
              {isLogin ? 'Sign in to continue' : 'Get started with haus note'}
            </h1>
          </div>

          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            <div className="space-y-4 flex-1">
              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-4 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
                    placeholder="Your name"
                    required
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-4 border border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
                  placeholder="••••••••"
                  required
                  minLength={6}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-500 p-4 rounded-xl text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="mt-auto pt-6 space-y-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent text-white py-4 rounded-xl font-semibold text-base active:bg-accent-dark disabled:opacity-50"
              >
                {loading ? 'Please wait...' : 'Continue'}
              </button>

              <button
                type="button"
                onClick={() => { setIsLogin(!isLogin); setError('') }}
                className="w-full text-center text-[#666] text-sm py-2"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </form>
        </main>
      </div>
    )
  }

  // ========== MAIN LANDING PAGE ==========
  return (
    <div className="min-h-screen bg-white">
      {/* ===== HEADER ===== */}
      <header className="flex items-center justify-between px-5 py-4 sm:px-8 lg:px-16">
        <span className="font-serif text-xl font-bold sm:text-2xl">haus note</span>
        <button
          onClick={handleGetStarted}
          className="bg-accent text-white px-5 py-2 rounded-full text-sm font-medium sm:px-6 sm:py-2.5"
        >
          Get Started
        </button>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="px-6 py-8 sm:px-8 lg:px-16 lg:py-16">
        <div className="max-w-6xl mx-auto lg:flex lg:items-center lg:gap-16">
          {/* Left - Hero Text */}
          <div className="lg:flex-1 text-center lg:text-left">
            <h1 className="font-serif font-bold text-[2rem] leading-[1.15] tracking-tight sm:text-4xl lg:text-5xl">
              Your Apartment Hunt,<br />Finally Organized.
            </h1>
            <p className="mt-4 text-[#666] text-base leading-relaxed max-w-md mx-auto lg:mx-0 sm:text-lg lg:text-xl lg:max-w-lg">
              Apartment hunting is chaos, emotional, and weirdly high-stake. haus note keeps track of every apartment you've viewed — never lose an apartment again.
            </p>

            {/* Mobile CTA */}
            <div className="mt-8 sm:hidden">
              <button
                onClick={handleGetStarted}
                className="w-full bg-accent text-white py-4 rounded-xl font-semibold text-base active:bg-accent-dark"
              >
                Get Started — it's free
              </button>
              <div className="mt-4 flex justify-center gap-4 text-sm text-[#999]">
                <span>✓ Free forever</span>
                <span>✓ No credit card</span>
              </div>
            </div>
          </div>

          {/* Right - Auth Form (Desktop only) */}
          <div className="hidden lg:block lg:w-[400px] lg:flex-shrink-0">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-6">Start using for free</h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div>
                    <label className="block text-sm text-[#666] mb-1">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
                      placeholder="Your name"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm text-[#666] mb-1">Email</label>
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-sm text-[#666] mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-base focus:ring-2 focus:ring-accent/30 focus:border-accent outline-none"
                    placeholder="••••••••"
                    required
                    minLength={6}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                </div>

                {error && (
                  <div className="bg-red-50 text-red-500 p-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-accent text-white py-3 rounded-full font-semibold hover:bg-accent-dark disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Please wait...' : 'Continue'}
                </button>
              </form>

              <div className="my-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-sm text-[#999]">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                onClick={() => authService.signInWithGoogle()}
                className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-full hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-medium text-[#333]">Continue with Google</span>
              </button>

              <p className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setError('') }}
                  className="text-sm text-accent hover:underline"
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== APP SCREENSHOTS ===== */}
      <section className="py-8 overflow-hidden sm:py-12 lg:py-20">
        {/* Mobile: Horizontal scroll */}
        <div className="flex gap-4 px-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide pb-4 sm:hidden">
          <img
            src="/images/feature-list-map.png"
            alt="Apartment list and map"
            className="w-[90%] flex-shrink-0 rounded-xl shadow-lg border border-gray-100 snap-center"
          />
          <img
            src="/images/feature-apartment-detail.png"
            alt="Apartment details"
            className="w-[90%] flex-shrink-0 rounded-xl shadow-lg border border-gray-100 snap-center"
          />
        </div>

        {/* Desktop: Overlapping layout */}
        <div className="hidden sm:block max-w-6xl mx-auto px-8 lg:px-16">
          <div className="relative">
            <img
              src="/images/feature-list-map.png"
              alt="Apartment list and map"
              className="w-[75%] rounded-xl shadow-2xl border border-gray-200"
            />
            <img
              src="/images/feature-apartment-detail.png"
              alt="Apartment details"
              className="absolute top-12 right-0 w-[50%] rounded-xl shadow-2xl border border-gray-200"
            />
          </div>
        </div>
      </section>

      {/* ===== PROBLEM STATEMENT ===== */}
      <section className="py-12 px-6 sm:py-16 lg:py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif font-bold text-2xl text-center mb-12 sm:text-3xl lg:text-4xl">
            Apartment hunting shouldn't feel<br className="hidden sm:block" /> like detective work
          </h2>

          <div className="space-y-4 sm:grid sm:grid-cols-3 sm:gap-6 sm:space-y-0">
            {[
              {
                Icon: Camera,
                title: 'Lost in your camera roll',
                desc: '500 photos, zero organization. Which apartment was that amazing kitchen again?'
              },
              {
                Icon: Link2,
                title: 'Scattered links everywhere',
                desc: "Notes app, texts to yourself, browser tabs from 3 weeks ago. Good luck finding anything."
              },
              {
                Icon: HelpCircle,
                title: 'Decision paralysis',
                desc: "You've seen 12 apartments. Which one was closer to work? Had better light? Lower rent?"
              },
            ].map(({ Icon, title, desc }, index) => (
              <div
                key={title}
                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all duration-200 hover:-translate-y-1 cursor-default"
              >
                <div className="w-14 h-14 mx-auto mb-5 flex items-center justify-center bg-accent/10 rounded-xl">
                  <Icon className="w-7 h-7 text-accent" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold text-xl mb-3 text-center">{title}</h3>
                <p className="text-[#666] text-base leading-relaxed text-center">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== FEATURE 1: Everything you need ===== */}
      <section className="py-12 px-6 sm:py-16 lg:py-24">
        <div className="max-w-6xl mx-auto lg:flex lg:items-center lg:gap-16">
          {/* Left - Feature List */}
          <div className="lg:flex-1">
            <h2 className="font-serif font-bold text-2xl mb-8 sm:text-3xl lg:text-4xl lg:leading-tight">
              Everything you<br />need to keep track<br />of your perfect<br />apartment
            </h2>

            <div className="space-y-6">
              {[
                {
                  num: '01',
                  title: 'Map view everything',
                  desc: 'See all your apartments on a map. Instantly understand neighborhoods, commutes, and what\'s nearby.'
                },
                {
                  num: '02',
                  title: 'Compare at a glance',
                  desc: 'Price, location, size, amenities — see everything side-by-side to make confident decisions.'
                },
                {
                  num: '03',
                  title: 'Collaborate with others',
                  desc: 'Share your search with roommates or partners. Everyone stays on the same page.'
                },
              ].map(({ num, title, desc }) => (
                <div key={num} className="flex gap-4">
                  <span className="text-[#999] font-medium text-sm">{num}</span>
                  <div>
                    <h3 className="font-semibold mb-1">{title}</h3>
                    <p className="text-[#666] text-sm leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right - Screenshot */}
          <div className="mt-8 lg:mt-0 lg:flex-1">
            <img
              src="/images/feature-apartment-detail.png"
              alt="Apartment detail view"
              className="w-full rounded-xl shadow-lg border border-gray-200"
            />
          </div>
        </div>
      </section>

      {/* ===== FEATURE 2: Add apartment in 30 seconds ===== */}
      <section className="py-12 px-6 sm:py-16 lg:py-24 bg-gray-50">
        <div className="max-w-6xl mx-auto lg:flex lg:items-center lg:gap-16">
          {/* Left - Screenshot (desktop) */}
          <div className="hidden lg:block lg:flex-1">
            <img
              src="/images/feature-list-map.png"
              alt="Add apartment"
              className="w-full rounded-xl shadow-lg border border-gray-200"
            />
          </div>

          {/* Right - Text */}
          <div className="lg:flex-1">
            <h2 className="font-serif font-bold text-2xl mb-4 sm:text-3xl lg:text-4xl">
              Add an apartment in 30 seconds
            </h2>
            <p className="text-[#666] leading-relaxed">
              Drop the address, upload photos, add rent and notes. haus note does the rest — maps it, calculates commute, organizes everything.
            </p>
          </div>

          {/* Screenshot (mobile) */}
          <div className="mt-8 lg:hidden">
            <img
              src="/images/feature-list-map.png"
              alt="Add apartment"
              className="w-full rounded-xl shadow-lg border border-gray-200"
            />
          </div>
        </div>
      </section>

      {/* ===== BOTTOM CTA ===== */}
      <section className="py-16 px-6 text-center sm:py-20 lg:py-28">
        <h2 className="font-serif font-bold text-2xl mb-4 sm:text-3xl lg:text-4xl">
          Ready to make your apartment<br />hunting less stressful?
        </h2>
        <p className="text-[#666] mb-8 max-w-md mx-auto">
          Join thousands of apartment hunters who've found their perfect place with haus note.
        </p>
        <button
          onClick={handleGetStarted}
          className="w-full max-w-xs bg-accent text-white py-4 rounded-full font-semibold active:bg-accent-dark sm:w-auto sm:px-12 hover:bg-accent-dark transition-colors"
        >
          Get Started now
        </button>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="py-6 px-6 border-t border-gray-100 text-center">
        <p className="text-xs text-[#999]">
          © {new Date().getFullYear()} <span className="font-serif font-semibold text-[#666]">haus note</span>
        </p>
      </footer>
    </div>
  )
}
