import React, { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import { authService } from '../services/authService'
import { feedbackService } from '../services/feedbackService'

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return { ref, visible }
}

const FEATURES = [
  {
    num: '01',
    title: 'Remember every apartment you considered',
    desc: 'Photos, prices, notes — saved in seconds. Stop losing apartments in your camera roll and text threads.',
    image: '/images/feature-add-apartment.png',
    alt: 'Add new apartment modal',
  },
  {
    num: '02',
    title: 'Let us calculate your commute times',
    desc: 'Add your work, gym, or favorite spots and we\'ll show the commute from every apartment — driving, transit, walking, or biking.',
    image: '/images/feature-map.png',
    alt: 'Map view with apartment pins and commute times',
  },
  {
    num: '03',
    title: 'Hunt together',
    desc: 'Invite your partner or roommate. Everyone sees the same apartments, photos, and notes — no more forwarding screenshots.',
    image: '/images/feature-collaborate.png',
    alt: 'Collaborative apartment search with shared comments',
  },
]

export function LandingPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isLogin) {
        await authService.signIn(email, password)
      } else {
        await authService.signUp(email, password)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      {/* ===== HEADER ===== */}
      <header className="w-full px-6 py-5 sm:px-8 lg:px-12 xl:px-16">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <span
            className={`font-sans text-xl font-bold transition-all duration-700 ease-out flex items-center gap-2 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}
          >
            <img src="/house-logo.png" alt="" className="w-6 h-6" />
            haus note
          </span>
          <div className={`flex items-center gap-4 transition-all duration-700 ease-out ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
            }`}>
            <button
              onClick={() => document.getElementById('signup-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-accent text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-accent-dark transition-colors"
            >
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* ===== HERO SECTION ===== */}
      <section className="px-6 pt-8 pb-12 sm:px-8 sm:pt-12 lg:px-12 lg:pt-16 xl:px-16">
        <div className="max-w-[1400px] mx-auto lg:flex lg:items-start lg:justify-between lg:gap-12 xl:gap-20">
          {/* Left - Hero Text */}
          <div className="lg:flex-1 lg:max-w-xl xl:max-w-2xl">
            <h1
              className={`font-sans font-bold text-[2.25rem] leading-[1.1] tracking-tight sm:text-5xl lg:text-[3.5rem] xl:text-6xl transition-all duration-700 ease-out delay-100 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              Your apartment search,
              <br />
              <span className="text-[#888]">finally organized.</span>
            </h1>
            <p
              className={`mt-5 text-[#666] text-base leading-relaxed sm:text-lg lg:text-xl lg:mt-6 max-w-md transition-all duration-700 ease-out delay-200 ${
                mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              Photos, commute times, and your partner's opinion — all in one place. No more scattered screenshots or forgotten details.
            </p>
          </div>

          {/* Right - Auth Form */}
          <div
            id="signup-form"
            className={`mt-10 lg:mt-0 lg:w-[340px] xl:w-[380px] lg:flex-shrink-0 transition-all duration-700 ease-out delay-300 ${
              mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
            }`}
          >
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-[#666] mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-xs text-[#666] mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none transition-all"
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
                  className="w-full bg-accent text-white py-3 rounded-lg font-semibold text-sm hover:bg-accent-dark disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Please wait...' : 'Continue'}
                </button>
              </form>

              <div className="my-4 flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-[#999]">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                onClick={() => authService.signInWithGoogle()}
                className="w-full flex items-center justify-center gap-3 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-medium text-sm text-[#333]">Continue with Google</span>
              </button>

              <p className="mt-4 text-center">
                <button
                  type="button"
                  onClick={() => { setIsLogin(!isLogin); setError('') }}
                  className="text-xs text-[#666] hover:text-accent"
                >
                  {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                </button>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== HERO IMAGE - Large App Screenshot ===== */}
      <section
        className={`px-6 pb-16 sm:px-8 lg:px-12 xl:px-16 transition-all duration-1000 ease-out delay-500 ${
          mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
        }`}
      >
        <div className="max-w-[1400px] mx-auto">
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-3xl blur-2xl opacity-60" />
            <video
              src="/images/hausnote-demo.mp4"
              autoPlay
              muted
              loop
              playsInline
              className="relative w-full rounded-xl sm:rounded-2xl shadow-2xl border border-gray-200/80"
            />
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl ring-1 ring-inset ring-black/[0.03] pointer-events-none" />
          </div>
        </div>
      </section>

      {/* ===== PROBLEM STATEMENT — scroll-triggered reveal ===== */}
      <ProblemStatement />

      {/* ===== FEATURES — 3 alternating blocks ===== */}
      <section className="py-12 px-6 sm:py-16 lg:py-20 sm:px-8 lg:px-12 xl:px-16">
        <div className="max-w-[1400px] mx-auto">
          <div className="mb-12 lg:mb-16">
            <p className="text-sm font-semibold text-[#999] uppercase tracking-wide">
              Built for how apartment hunting actually works
            </p>
          </div>

          <div className="space-y-16 lg:space-y-24">
            {FEATURES.map((feature, i) => (
              <FeatureBlock key={feature.num} feature={feature} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== ABOUT SECTION: Hi, I'm Soojin ===== */}
      <section className="py-16 px-6 sm:py-20 lg:py-24 sm:px-8 lg:px-12 xl:px-16 bg-gray-50">
        <div className="max-w-[1400px] mx-auto lg:flex lg:items-start lg:gap-12 xl:gap-20">
          {/* Left - Photo */}
          <div className="flex justify-center lg:justify-start lg:w-[280px] xl:w-[320px] lg:flex-shrink-0">
            <div className="w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 rounded-full overflow-hidden bg-gray-100">
              <img
                src="/soojin.png"
                alt="Soojin"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Right - Bio */}
          <div className="mt-8 lg:mt-0 lg:flex-1">
            <h2 className="font-sans font-bold text-2xl sm:text-3xl text-[#1A1A1A] mb-6 text-center lg:text-left">
              Hi, I'm Soojin
            </h2>
            <div className="text-[#666] leading-relaxed space-y-4 text-sm sm:text-base">
              <p>
                I started building haus note while apartment hunting in New York City. By my 5th visit, I couldn't keep track of apartments anymore — screenshots in my camera roll, notes in three different apps, rent prices I could barely remember, and commute times I kept re-googling.
              </p>
              <p>
                I wanted one place where I could drop an apartment and have everything organized for me — photos, commutes, price comparisons. Nothing out there did it well, so I built it.
              </p>
              <p>
                If you're in the middle of a search right now, I hope haus note saves you time and helps you make what is a weirdly high-stakes decision.
              </p>
              <div className="flex items-center gap-4 pt-3">
                <a
                  href="mailto:slee06110@gmail.com"
                  className="text-[#999] hover:text-[#1A1A1A] transition-colors"
                  aria-label="Email"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                </a>
                <a
                  href="https://www.linkedin.com/in/soojin-lee1/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#999] hover:text-[#1A1A1A] transition-colors"
                  aria-label="LinkedIn"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a
                  href="https://www.instagram.com/soojin.jenny/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#999] hover:text-[#1A1A1A] transition-colors"
                  aria-label="Instagram"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== BOTTOM CTA ===== */}
      <section className="py-20 px-6 sm:py-24 lg:py-32 sm:px-8 lg:px-12 xl:px-16 text-center">
        <h2 className="font-sans font-bold text-2xl sm:text-3xl lg:text-[2.5rem] lg:leading-[1.15] text-[#1A1A1A] mb-4">
          Your next apartment search,
          <br />
          organized from day one.
        </h2>
        <p className="text-[#666] mb-10 max-w-md mx-auto">
          No more scattered screenshots. No more forgotten details. No more "which one was that?" texts.
        </p>
        <button
          onClick={() => document.getElementById('signup-form')?.scrollIntoView({ behavior: 'smooth' })}
          className="bg-accent text-white px-10 py-4 rounded-full font-semibold hover:bg-accent-dark transition-colors shadow-lg shadow-accent/25"
        >
          Start your search
        </button>
      </section>

      {/* ===== CONTACT THE TEAM ===== */}
      <ContactForm />

      {/* ===== FOOTER ===== */}
      <footer className="w-full px-6 py-6 border-t border-gray-100 text-center sm:px-8">
        <p className="text-xs text-[#999] flex items-center justify-center gap-1.5">
          © {new Date().getFullYear()}
          <img src="/house-logo.png" alt="" className="w-3.5 h-3.5 opacity-40" />
          haus note
        </p>
      </footer>
    </div>
  )
}

/* ─── Problem Statement with scroll-triggered line reveal ─── */
function ProblemStatement() {
  const { ref, visible } = useScrollReveal()

  return (
    <section className="py-16 px-6 sm:py-20 lg:py-28 sm:px-8 lg:px-12 xl:px-16">
      <div ref={ref} className="max-w-3xl mx-auto text-center">
        <h2 className="font-sans font-bold text-2xl sm:text-3xl lg:text-[2.5rem] lg:leading-[1.15] text-[#1A1A1A]">
          <span
            className={`scroll-reveal block ${visible ? 'visible' : ''}`}
            style={{ transitionDelay: '0ms' }}
          >
            By your 5th apartment visit,
          </span>
          <span
            className={`scroll-reveal block ${visible ? 'visible' : ''}`}
            style={{ transitionDelay: '200ms' }}
          >
            you've forgotten the first three.
          </span>
        </h2>
      </div>
    </section>
  )
}

/* ─── Feature block with alternating image/text and scroll reveal ─── */
function FeatureBlock({
  feature,
  index,
}: {
  feature: typeof FEATURES[0]
  index: number
}) {
  const { ref, visible } = useScrollReveal()
  const isEven = index % 2 === 0

  return (
    <div
      ref={ref}
      className={`scroll-reveal lg:flex lg:items-center lg:gap-12 xl:gap-20 ${visible ? 'visible' : ''}`}
    >
      {/* Image */}
      <div className={`lg:flex-1 ${isEven ? 'lg:order-1' : 'lg:order-2'}`}>
        <div className="relative">
          <div className="absolute -inset-4 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl blur-2xl opacity-60" />
          <img
            src={feature.image}
            alt={feature.alt}
            className="relative w-full rounded-xl shadow-2xl border border-gray-200/80"
          />
        </div>
      </div>

      {/* Text */}
      <div className={`mt-8 lg:mt-0 lg:w-[40%] xl:w-[35%] lg:flex-shrink-0 ${isEven ? 'lg:order-2' : 'lg:order-1'}`}>
        <span className="inline-block bg-[#F5F5F5] text-[#999] font-semibold text-xs px-3 py-1 rounded-full mb-4">
          {feature.num}
        </span>
        <h3 className="font-sans font-bold text-xl sm:text-2xl lg:text-[1.75rem] leading-tight text-[#1A1A1A] mb-3">
          {feature.title}
        </h3>
        <p className="text-[#666] leading-relaxed sm:text-lg">
          {feature.desc}
        </p>
      </div>
    </div>
  )
}

/* ─── Contact Form that submits to feedback table ─── */
function ContactForm() {
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim()) return

    setError('')
    setSubmitting(true)

    try {
      await feedbackService.create({
        title: message.trim().slice(0, 100),
        description: message.trim(),
        category: 'general',
        anonymous: false,
      })
      setSubmitted(true)
      setMessage('')
    } catch (err: any) {
      setError(err.message || 'Failed to send message')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="py-12 px-6 sm:py-16 sm:px-8 lg:px-12 xl:px-16 bg-gray-50 border-t border-gray-100">
      <div className="max-w-md mx-auto text-center">
        <h3 className="font-sans font-bold text-lg sm:text-xl text-[#1A1A1A] mb-2">
          Contact the team
        </h3>
        <p className="text-sm text-[#666] mb-5">
          Have a question, feedback, or just want to say hi? We'd love to hear from you.
        </p>

        {submitted ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-sm text-green-700 font-medium">Thanks for reaching out! We'll take a look.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="text-left">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-accent/20 focus:border-accent outline-none resize-none transition-all"
              placeholder="Write your message..."
              rows={3}
              required
            />
            {error && (
              <p className="text-sm text-red-500 mt-2">{error}</p>
            )}
            <button
              type="submit"
              disabled={submitting || !message.trim()}
              className="mt-3 inline-flex items-center gap-2 bg-[#1A1A1A] text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-[#333] disabled:opacity-40 transition-colors"
            >
              <Send className="w-4 h-4" />
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
