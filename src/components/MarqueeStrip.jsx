const text = 'MR. WHITE BURGERS ✦ SMASH BURGER ✦ OBRERA ✦ OKLAHOMA ✦ BIG WHITE ✦ CHESSE JOA ✦ CURRY WHITE ✦ PREMIUM ✦ '

export default function MarqueeStrip() {
  return (
    <div
      className="relative bg-[#F0C832] overflow-hidden py-4"
      aria-hidden="true"
      style={{
        boxShadow: '0 -10px 40px -10px rgba(240, 200, 50, 0.25), 0 10px 40px -10px rgba(240, 200, 50, 0.25)',
      }}
    >
      <div
        className="flex whitespace-nowrap"
        style={{ animation: 'marquee 22s linear infinite' }}
      >
        <span
          className="text-sm text-black uppercase tracking-[0.18em] pr-10"
          style={{ fontFamily: 'Anton, sans-serif' }}
        >
          {text}
        </span>
        <span
          className="text-sm text-black uppercase tracking-[0.18em] pr-10"
          style={{ fontFamily: 'Anton, sans-serif' }}
        >
          {text}
        </span>
      </div>
    </div>
  )
}
