import { useState, useEffect } from 'react';
import './index.css';

function App() {
  const [keyword, setKeyword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(null); // { type: 'ANTIBOT' | 'EMPTY' | 'SERVER', message: string }
  const [cached, setCached] = useState(false);
  const [stale, setStale] = useState(false);
  const [setupStatus, setSetupStatus] = useState('checking'); // 'checking' | 'needs_login' | 'logging_in' | 'ready'

  useEffect(() => {
    let interval;
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/login/status');
        const data = await res.json();
        
        if (data.status === 'completed') {
          setSetupStatus('ready');
        } else if (data.status === 'running') {
          setSetupStatus('logging_in');
        } else {
          // Hanya revert jika kita tidak sedang dalam proses ancang-ancang login
          setSetupStatus(prev => prev === 'logging_in' ? 'logging_in' : 'needs_login');
        }
      } catch (e) {
        console.error(e);
      }
    };

    checkStatus();
    interval = setInterval(checkStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStartLogin = async () => {
    setSetupStatus('logging_in');
    try {
      await fetch('/api/login/start', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!keyword.trim()) return;

    setIsLoading(true);
    setError(null);
    setProducts(null);
    setCached(false);
    setStale(false);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(keyword)}`);
      const data = await response.json();

      if (!response.ok) {
        const reason = data.reason || 'SERVER';
        const message = data.error || 'Terjadi kesalahan.';
        setError({ type: reason, message });
        return;
      }

      setProducts(data.items);
      setCached(data.cached);
      setStale(data.stale || false);
    } catch (err) {
      setError({ type: 'SERVER', message: 'Gagal terhubung ke server. Pastikan backend berjalan.' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (priceInfo) => {
    // If we have a formatted price string from shopee already, use it.
    if (typeof priceInfo === 'string') return priceInfo;
    
    // Otherwise format the integer.
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(priceInfo);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center pt-20 pb-20 px-4 font-sans">
      <div className="w-full max-w-2xl text-center space-y-6">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-rose-500">
          Shopee Price Scraper
        </h1>
        <p className="text-slate-400 text-lg">
          Find the 3 cheapest products instantly without being blocked.
        </p>

        {setupStatus === 'checking' && (
          <div className="py-8 flex justify-center">
            <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {setupStatus === 'needs_login' && (
          <div className="flex flex-col items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <p className="text-slate-300">Sesi scraping Anda belum siap di laptop Host.</p>
            <p className="text-slate-500 text-sm max-w-md">
              Catatan: Menekan tombol di bawah akan membuka jendela browser Shopee <b>hanya di Mac Host (Laptop Utama)</b>. Silakan login di sana agar sistem bisa mulai bekerja dari IP Residential.
            </p>
            <button
              onClick={handleStartLogin}
              className="px-8 py-3 bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 rounded-xl font-semibold transition-all shadow-lg shadow-orange-500/20"
            >
              Login Shopee di Mac Host
            </button>
          </div>
        )}

        {setupStatus === 'logging_in' && (
          <div className="flex flex-col items-center gap-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 border-orange-500/30">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-orange-300 font-semibold text-lg">Proses Login Sedang Berjalan...</p>
            <p className="text-slate-400 text-sm max-w-sm">
              Cek jendela Camoufox yang terbuka di <b>Mac Host</b>. Silakan login & selesaikan captcha di sana sampai browser tertutup otomatis.
            </p>
          </div>
        )}

        {setupStatus === 'ready' && (
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row items-center gap-3 w-full bg-slate-900/50 p-2 rounded-2xl border border-slate-800 backdrop-blur-sm shadow-xl">
            <input
              type="text"
              className="flex-1 w-full bg-transparent border-none outline-none px-4 py-3 text-lg placeholder-slate-500"
              placeholder="e.g. iPhone 15 Pro Max"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !keyword.trim()}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-orange-500 to-rose-600 hover:from-orange-400 hover:to-rose-500 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-500/20"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </button>
          </form>
        )}

        {error && (
          <div className={`p-4 rounded-xl border flex gap-3 text-left ${
            error.type === 'ANTIBOT'
              ? 'bg-amber-950/40 border-amber-700 text-amber-200'
              : error.type === 'EMPTY_RESULTS'
              ? 'bg-blue-950/40 border-blue-700 text-blue-200'
              : 'bg-red-950/40 border-red-800 text-red-200'
          }`}>
            <span className="text-xl mt-0.5 flex-shrink-0">
              {error.type === 'ANTIBOT' ? '🛡️' : error.type === 'EMPTY_RESULTS' ? '🔍' : '⚠️'}
            </span>
            <div>
              <p className="font-semibold text-sm mb-1">
                {error.type === 'ANTIBOT'
                  ? 'Anti-bot Shopee Terdeteksi'
                  : error.type === 'EMPTY_RESULTS'
                  ? 'Produk Tidak Ditemukan'
                  : 'Terjadi Kesalahan'}
              </p>
              <p className="text-sm opacity-80">{error.message}</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 animate-pulse">Navigating Shopee stealthily... this might take a few seconds.</p>
          </div>
        )}

        {products && !isLoading && (
          <div className="w-full space-y-6 text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between px-2">
              <h2 className="text-2xl font-bold">Top 3 Cheapest Results</h2>
              {stale ? (
                <span className="text-xs font-semibold px-2 py-1 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
                  ⚠ Stale Cache — anti-bot triggered
                </span>
              ) : cached ? (
                <span className="text-xs font-semibold px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                  ✓ Live Cache
                </span>
              ) : null}
            </div>

            <div className="grid gap-4">
              {products.map((product, index) => (
                <div key={index} className="group flex flex-col sm:flex-row justify-between sm:items-center p-5 bg-slate-900 border border-slate-800 hover:border-orange-500/50 rounded-2xl transition-all shadow-md">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-orange-400 font-bold text-lg border border-slate-700">
                      #{index + 1}
                    </div>
                    <div className="space-y-1">
                      <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Nama Barang:</p>
                      <h3 className="font-semibold text-lg line-clamp-2 text-slate-200 group-hover:text-white transition-colors">
                        {product.name}
                      </h3>
                      <div className="pt-2">
                        <p className="text-slate-400 text-xs uppercase tracking-wider font-semibold">Harga Barang:</p>
                        <p className="text-xl font-bold text-orange-400">
                          {product.priceStr || formatPrice(product.price)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <a
                    href={product.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 sm:mt-0 flex-shrink-0 px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors text-center border border-slate-700 group-hover:border-slate-600"
                  >
                    View on Shopee
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
