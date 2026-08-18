import { FiAward, FiTruck, FiShield, FiHeadphones } from 'react-icons/fi'

const features = [
  {
    icon: FiAward,
    title: 'Produk Berkualitas',
    description: 'Spray paint dan onderdil motor kualitas terbaik dari brand terpercaya',
    stat: '2000+',
    statLabel: 'Produk',
  },
  {
    icon: FiTruck,
    title: 'Pengiriman Cepat',
    description: 'Dikirim cepat ke seluruh Indonesia dengan jasa pengiriman terpercaya',
    stat: '1000+',
    statLabel: 'Pengiriman',
  },
  {
    icon: FiShield,
    title: 'Garansi Terjamin',
    description: 'Garansi resmi untuk semua produk yang kami jual',
    stat: '100%',
    statLabel: 'Garansi',
  },
  {
    icon: FiHeadphones,
    title: 'Support 24/7',
    description: 'Tim customer service kami siap membantu Anda kapan saja',
    stat: '24/7',
    statLabel: 'Support',
  },
]

export default function WhyChooseUs() {
  return (
    <section className="bg-gradient-to-b from-orange-50 to-white py-8 mobile:py-10 tablet:py-16">
      <div className="container mx-auto px-2.5 mobile:px-3 tablet:px-5">
        <h2 className="text-lg mobile:text-xl tablet:text-3xl font-bold text-center text-slate-800 mb-5 mobile:mb-8">
          Kenapa Memilih BJS Racing Store?
        </h2>

        <div className="grid grid-cols-1 mobile:grid-cols-2 tablet:grid-cols-4 gap-3 mobile:gap-4">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <div
                key={index}
                className="text-center p-3.5 mobile:p-4 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-lg hover:border-orange-500 transition-all duration-200 cursor-pointer group"
              >
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-orange-100 flex items-center justify-center group-hover:bg-orange-200 transition-colors duration-200">
                  <Icon className="w-7 h-7 text-orange-600" />
                </div>

                <h3 className="font-semibold text-slate-800 mb-2 text-xs mobile:text-sm">
                  {feature.title}
                </h3>
                <p className="text-slate-600 text-xs mobile:text-xs mb-4 leading-relaxed">
                  {feature.description}
                </p>

                <div className="pt-3 border-t border-slate-100">
                  <p className="text-lg mobile:text-xl font-bold text-orange-600">
                    {feature.stat}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{feature.statLabel}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}