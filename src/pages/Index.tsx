const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-[#0a1024] text-white p-8 text-center">
      <h1 className="text-4xl font-bold">Liquid Glass Weather</h1>
      <p className="opacity-80 max-w-md">
        The standalone Apple-style weather app lives in <code>/weather/weather.html</code>.
      </p>
      <a
        href="/weather/weather.html"
        className="px-6 py-3 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 transition"
      >
        Open Weather App →
      </a>
    </div>
  );
};

export default Index;
