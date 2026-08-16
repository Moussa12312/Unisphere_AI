const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: 'Sécurisé',
    description: 'Vos données sont protégées',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: 'Intelligent',
    description: "L'IA au service de votre réussite",
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Accessible',
    description: 'Disponible partout, à tout moment',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    title: 'Collaboratif',
    description: 'Échangez, collaborez, progressez',
  },
];

export default function AuthBranding() {
  return (
    <div className="hidden lg:flex lg:w-[30%] flex-col justify-center p-8 relative z-10 mr-30 -mt-55">
      <div className="flex items-center gap-3 mb-4">
        <img src="/logo.png" alt="UniSphere AI" width={100} height={50} className="rounded-lg" />
        <h1 className="text-3xl font-bold text-white">
          UniSphere <span className="text-[#FF6B00]">AI</span>
        </h1>
      </div>

      <h2 className="text-[25px] font-bold text-white mb-5 leading-tight">
        L&apos;intelligence du Savoir,
        <br />
        <span className="text-[#FF6B00]">La puissance du Numérique</span>
      </h2>

      <div className="space-y-6">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-start gap-4 -mt-3">
            <div className="w-12 h-12 bg-[#FF6B00]/20 rounded-xl flex items-center justify-center text-[#FF6B00] flex-shrink-0">
              {feature.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white mb-0">{feature.title}</h3>
              <p className="text-slate-400 text-sm">{feature.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
