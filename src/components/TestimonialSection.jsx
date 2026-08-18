import { useState, useEffect, useCallback, useRef } from 'react'
import { FiStar, FiChevronLeft, FiChevronRight } from 'react-icons/fi'

const testimonials = [
  {
    name: 'Ahmad Rizki',
    rating: 5,
    text: 'Spray paint-nya berkualitas banget! Warna nyata dan tahan lama. Recommended seller!',
    avatar: 'AR',
  },
  {
    name: 'Siti Nurhaliza',
    rating: 5,
    text: 'Pengiriman cepat, packing rapi. Onderdil motor saya pas dan berfungsi dengan baik.',
    avatar: 'SN',
  },
  {
    name: 'Budi Santoso',
    rating: 4,
    text: 'Harga terjangkau untuk kualitas original. Garansi resmi juga ada. Puas!',
    avatar: 'BS',
  },
  {
    name: 'Dewi Lestari',
    rating: 5,
    text: 'Customer service-nya ramah dan fast response. Barang sampai dengan selamat.',
    avatar: 'DL',
  },
]

export default function TestimonialSection() {
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const prefersReducedMotion = useRef(false)
  const intervalRef = useRef(null)

  useEffect(() => {
    prefersReducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }, [])

  const next = useCallback(() => {
    setCurrent((prev) => (prev + 1) % testimonials.length)
  }, [])

  const prev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + testimonials.length) % testimonials.length)
  }, [])

  useEffect(() => {
    if (isPaused || prefersReducedMotion.current) return
    intervalRef.current = setInterval(next, 7000)
    return () => clearInterval(intervalRef.current)
  }, [isPaused, next])

  const goTo = (index) => {
    setCurrent(index)
    clearInterval(intervalRef.current)
    if (!isPaused && !prefersReducedMotion.current) {
      intervalRef.current = setInterval(next, 7000)
    }
  }

  const t = testimonials[current]

  return (
    <section
      className="bg-gradient-to-b from-orange-50 to-white py-8 mobile:py-10 tablet:py-16"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      aria-label="Testimonial carousel"
      role="region"
    >
      <div className="container mx-auto px-2.5 mobile:px-3 tablet:px-5 max-w-3xl">
        <h2 className="text-lg mobile:text-xl tablet:text-3xl font-bold text-center text-slate-800 mb-5 mobile:mb-8">
          Apa Kata Pelanggan Kami?
        </h2>

        <div className="relative">
          {/* Prev Button */}
          <button
            onClick={prev}
            className="absolute -left-2 mobile:-left-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 z-10"
            aria-label="Testimoni sebelumnya"
          >
            <FiChevronLeft className="w-5 h-5" />
          </button>

          {/* Card */}
          <div className="bg-white rounded-xl shadow-md border border-slate-100 p-4 mobile:p-6 mx-6 mobile:mx-0 transition-all duration-200">
            {/* Stars */}
            <div className="flex gap-1 mb-4 justify-center">
              {[...Array(5)].map((_, i) => (
                <FiStar
                  key={i}
                  className={`w-5 h-5 ${
                    i < t.rating ? 'text-yellow-400 fill-yellow-400' : 'text-slate-200'
                  }`}
                />
              ))}
            </div>

            {/* Quote */}
            <p className="text-slate-700 text-center text-xs mobile:text-sm leading-relaxed mb-6 italic">
              &ldquo;{t.text}&rdquo;
            </p>

            {/* Author */}
            <div className="flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-semibold text-sm">
                {t.avatar}
              </div>
              <span className="font-semibold text-slate-800 text-xs mobile:text-sm">
                {t.name}
              </span>
            </div>
          </div>

          {/* Next Button */}
          <button
            onClick={next}
            className="absolute -right-2 mobile:-right-12 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 z-10"
            aria-label="Testimoni berikutnya"
          >
            <FiChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Dot Navigation */}
        <div className="flex justify-center gap-2 mt-6">
          {testimonials.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                i === current
                  ? 'bg-orange-500 w-6'
                  : 'bg-slate-300 hover:bg-slate-400'
              }`}
              aria-label={`Testimoni ${i + 1}`}
              aria-current={i === current ? 'true' : undefined}
            />
          ))}
        </div>
      </div>
    </section>
  )
}