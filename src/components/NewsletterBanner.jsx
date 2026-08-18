import { useState } from 'react'

export default function NewsletterBanner() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (email.trim()) {
      setSubmitted(true)
      setEmail('')
      setTimeout(() => setSubmitted(false), 3000)
    }
  }

  return (
    <section className="relative bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 overflow-hidden">
      {/* Racing Pattern Background */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="newsletter-pattern" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M0 30 L30 0 L60 30 L30 60 Z" fill="none" stroke="white" strokeWidth="0.8"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#newsletter-pattern)"/>
      </svg>

      <div className="relative z-10 container mx-auto px-2.5 mobile:px-3 tablet:px-5 py-8 mobile:py-10 tablet:py-14">
        <div className="max-w-2xl mx-auto text-center">
          {/* Floating Badge */}
          <div className="inline-block mb-4">
            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs mobile:text-xs font-semibold backdrop-blur-sm border border-white/30 animate-[fade_3s_ease-in-out_infinite]">
              GRATIS
            </span>
          </div>

          <h2 className="text-lg mobile:text-xl tablet:text-3xl font-bold text-white mb-1.5 mobile:mb-2">
            Dapatkan Promo Eksklusif!
          </h2>
          <p className="text-orange-100 text-xs mobile:text-sm mb-4 mobile:mb-6 max-w-lg mx-auto">
            Berlangganan newsletter kami untuk mendapatkan diskon dan info promo terbaru
          </p>

          {submitted ? (
            <div className="bg-white/20 backdrop-blur-sm rounded-full px-6 py-3 text-white font-semibold text-xs mobile:text-sm">
              Terima kasih telah berlangganan!
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col mobile:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan email Anda"
                required
                className="flex-1 px-4 py-3 rounded-full text-xs mobile:text-sm text-slate-900 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-600"
              />
              <button
                type="submit"
                className="bg-white text-orange-600 px-6 py-3 rounded-full font-bold text-xs mobile:text-sm hover:bg-orange-50 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-orange-600"
              >
                Berlangganan
              </button>
            </form>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fade {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </section>
  )
}