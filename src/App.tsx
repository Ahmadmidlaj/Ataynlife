import { useEffect, useMemo, useRef, useState } from 'react'
import { FaWhatsapp } from 'react-icons/fa'
import {
  ArrowRight,
  ArrowUp,
  Check,
  ChevronRight,
  Heart,
  Leaf,
  Menu,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  Trash2,
  X,
} from 'lucide-react'

type Pack = { label: string; price: number }
type Product = {
  id: number
  name: string
  category: 'Fresh picks' | 'Exotic fruit' | 'Dry fruits' | 'Dates & nuts'
  note: string
  image: string
  options: Pack[]
  badge?: string
}

type CartItem = Product & { pack: Pack; quantity: number }

type ModelContext = {
  registerTool: (tool: {
    name: string
    title: string
    description: string
    inputSchema: object
    annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }
    execute: (input: unknown) => unknown | Promise<unknown>
  }, options?: { signal?: AbortSignal }) => void | Promise<void>
}

const imageUrls = {
  tropical: 'https://images.pexels.com/photos/4611444/pexels-photo-4611444.jpeg?auto=compress&cs=tinysrgb&w=1200',
  fresh: 'https://images.pexels.com/photos/8789764/pexels-photo-8789764.jpeg?auto=compress&cs=tinysrgb&w=1200',
  dry: 'https://images.pexels.com/photos/12351341/pexels-photo-12351341.jpeg?auto=compress&cs=tinysrgb&w=1200',
}

const products: Product[] = [
  { id: 1, name: 'Ruby Red Pomegranate', category: 'Fresh picks', note: 'Sweet, jewel-bright arils', image: imageUrls.fresh, options: [{ label: '1 kg', price: 299 }, { label: '2 kg', price: 549 }], badge: 'Just in' },
  { id: 2, name: 'Thai Pink Guava', category: 'Fresh picks', note: 'Crisp, fragrant & handpicked', image: imageUrls.tropical, options: [{ label: '1 kg', price: 219 }, { label: '2 kg', price: 399 }] },
  { id: 3, name: 'Dragon Fruit', category: 'Exotic fruit', note: 'Vibrant inside and out', image: imageUrls.tropical, options: [{ label: '500 g', price: 249 }, { label: '1 kg', price: 459 }], badge: 'Exotic' },
  { id: 4, name: 'California Almonds', category: 'Dates & nuts', note: 'Large, crunchy & naturally rich', image: imageUrls.dry, options: [{ label: '250 g', price: 245 }, { label: '500 g', price: 465 }] },
  { id: 5, name: 'Medjool Dates', category: 'Dates & nuts', note: 'Soft caramel notes, jumbo grade', image: imageUrls.dry, options: [{ label: '250 g', price: 329 }, { label: '500 g', price: 625 }], badge: 'Bestseller' },
  { id: 6, name: 'Whole Cashews W320', category: 'Dry fruits', note: 'Buttery, whole and unbroken', image: imageUrls.dry, options: [{ label: '250 g', price: 229 }, { label: '500 g', price: 435 }] },
  { id: 7, name: 'Turkish Apricots', category: 'Dry fruits', note: 'Sun-kissed, sweet and tender', image: imageUrls.dry, options: [{ label: '250 g', price: 285 }, { label: '500 g', price: 535 }] },
  { id: 8, name: 'Golden Kiwi', category: 'Exotic fruit', note: 'Lush, tropical & vitamin-rich', image: imageUrls.fresh, options: [{ label: '3 pieces', price: 269 }, { label: '6 pieces', price: 499 }] },
]

const categories = ['All', 'Fresh picks', 'Exotic fruit', 'Dry fruits', 'Dates & nuts'] as const
const currency = (amount: number) => `₹${amount.toLocaleString('en-IN')}`
const ownerWhatsapp = import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, '')

const getOrderMessage = (items: CartItem[], total: number) => {
  const details = items.map((item) => `• ${item.name} — ${item.pack.label} × ${item.quantity}: ${currency(item.pack.price * item.quantity)}`).join('\n')
  return `Hello Atayinlife, I would like to place an order:\n\n${details}\n\nTotal: ${currency(total)}\n\nName:\nDelivery area:\nPreferred delivery time:`
}

const getWhatsAppUrl = (items: CartItem[], total: number) => {
  const message = getOrderMessage(items, total)
  return getWhatsAppTextUrl(message)
}

const getWhatsAppTextUrl = (message: string) => ownerWhatsapp
  ? `https://wa.me/${ownerWhatsapp}?text=${encodeURIComponent(message)}`
  : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`

const getCartSummary = (items: CartItem[]) => ({
  itemCount: items.reduce((total, item) => total + item.quantity, 0),
  subtotal: items.reduce((total, item) => total + item.pack.price * item.quantity, 0),
  items: items.map((item) => ({ productId: item.id, name: item.name, pack: item.pack.label, quantity: item.quantity, lineTotal: item.pack.price * item.quantity })),
})

const validateBasketItems = (input: unknown): CartItem[] => {
  if (!input || typeof input !== 'object' || !Array.isArray((input as { items?: unknown }).items)) throw new Error('Provide an items array.')
  return (input as { items: unknown[] }).items.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('Each basket item must be an object.')
    const { productId, packIndex, quantity } = entry as { productId?: unknown; packIndex?: unknown; quantity?: unknown }
    if (!Number.isInteger(productId) || !Number.isInteger(packIndex) || !Number.isInteger(quantity) || Number(quantity) < 1) throw new Error('Each item needs a valid productId, packIndex and positive quantity.')
    const product = products.find((item) => item.id === productId)
    if (!product || !product.options[Number(packIndex)]) throw new Error('A requested product or pack is unavailable.')
    return { ...product, pack: product.options[Number(packIndex)], quantity: Number(quantity) }
  })
}

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<(typeof categories)[number]>('All')
  const [query, setQuery] = useState('')
  const [navigationSearch, setNavigationSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedPackIndex, setSelectedPackIndex] = useState(0)
  const [selectedQuantity, setSelectedQuantity] = useState(1)
  const cartRef = useRef(cart)

  useEffect(() => {
    const loaderTimer = window.setTimeout(() => setIsLoading(false), 1250)
    return () => window.clearTimeout(loaderTimer)
  }, [])

  useEffect(() => {
    const updateScrollTopVisibility = () => setShowScrollTop(window.scrollY > 560)
    updateScrollTopVisibility()
    window.addEventListener('scroll', updateScrollTopVisibility, { passive: true })
    return () => window.removeEventListener('scroll', updateScrollTopVisibility)
  }, [])

  useEffect(() => {
    if (!navigationSearch.trim()) return
    const searchTimer = window.setTimeout(() => {
      setIsMenuOpen(false)
      document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      setNavigationSearch('')
    }, 750)
    return () => window.clearTimeout(searchTimer)
  }, [navigationSearch])

  useEffect(() => {
    cartRef.current = cart
  }, [cart])

  const visibleProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return products.filter((product) => {
      const categoryMatches = activeCategory === 'All' || product.category === activeCategory
      const queryMatches = !normalizedQuery || `${product.name} ${product.category} ${product.note}`.toLowerCase().includes(normalizedQuery)
      return categoryMatches && queryMatches
    })
  }, [activeCategory, query])

  const itemCount = cart.reduce((total, item) => total + item.quantity, 0)
  const subtotal = cart.reduce((total, item) => total + item.pack.price * item.quantity, 0)

  const addToCart = (product: Product, pack = product.options[0], quantity = 1) => {
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.id === product.id && item.pack.label === pack.label)
      if (existing) return currentCart.map((item) => item.id === product.id && item.pack.label === pack.label ? { ...item, quantity: item.quantity + quantity } : item)
      return [...currentCart, { ...product, pack, quantity }]
    })
  }

  const changeQuantity = (id: number, packLabel: string, delta: number) => {
    setCart((currentCart) => currentCart.flatMap((item) => {
      if (item.id !== id || item.pack.label !== packLabel) return [item]
      const quantity = item.quantity + delta
      return quantity > 0 ? [{ ...item, quantity }] : []
    }))
  }

  const removeCartItem = (id: number, packLabel: string) => {
    setCart((currentCart) => currentCart.filter((item) => item.id !== id || item.pack.label !== packLabel))
  }

  const openPicker = (product: Product) => { setSelectedProduct(product); setSelectedPackIndex(0); setSelectedQuantity(1) }

  const addSelectedItem = () => {
    if (!selectedProduct) return
    addToCart(selectedProduct, selectedProduct.options[selectedPackIndex], selectedQuantity)
    setSelectedProduct(null)
    setIsCartOpen(true)
  }

  const sendWhatsAppOrder = () => {
    if (!cart.length) return
    window.open(getWhatsAppUrl(cart, subtotal), '_blank', 'noopener,noreferrer')
  }

  const startGiftingConversation = () => {
    const message = 'Hello Atayinlife, I would like help choosing a thoughtful fruit or dry-fruit gift order.'
    window.open(getWhatsAppTextUrl(message), '_blank', 'noopener,noreferrer')
  }

  const startGeneralConversation = () => {
    const message = 'Hello Atayinlife, I would like to know more about your fresh fruit, exotic fruit and dry-fruit collection.'
    window.open(getWhatsAppTextUrl(message), '_blank', 'noopener,noreferrer')
  }

  const handleNavigationSearch = (value: string) => {
    setQuery(value)
    setNavigationSearch(value)
  }

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  useEffect(() => {
    const context = (document as Document & { modelContext?: ModelContext }).modelContext
    if (!context?.registerTool) return
    const lifecycle = new AbortController()
    const register = (tool: Parameters<ModelContext['registerTool']>[0]) => Promise.resolve(context.registerTool(tool, { signal: lifecycle.signal })).catch(() => undefined)

    void register({
      name: 'get_atayinlife_basket',
      title: 'Read basket',
      description: 'Read the current Atayinlife basket, including selected pack sizes, quantities and totals.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: true, untrustedContentHint: false },
      execute: () => getCartSummary(cartRef.current),
    })
    void register({
      name: 'set_atayinlife_basket',
      title: 'Set basket',
      description: 'Replace the visible Atayinlife basket with the requested available products, packs and quantities.',
      inputSchema: { type: 'object', properties: { items: { type: 'array', items: { type: 'object', properties: { productId: { type: 'integer' }, packIndex: { type: 'integer' }, quantity: { type: 'integer', minimum: 1 } }, required: ['productId', 'packIndex', 'quantity'], additionalProperties: false } } }, required: ['items'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: (input) => {
        const nextItems = validateBasketItems(input)
        return new Promise((resolve) => {
          setCart(nextItems)
          window.requestAnimationFrame(() => resolve(getCartSummary(nextItems)))
        })
      },
    })
    void register({
      name: 'send_atayinlife_whatsapp_order',
      title: 'Send WhatsApp order',
      description: 'Open WhatsApp with the current Atayinlife basket, prices and delivery details prefilled for order confirmation.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute: () => {
        const currentCart = cartRef.current
        const summary = getCartSummary(currentCart)
        if (!currentCart.length) throw new Error('Add at least one item before starting an order.')
        window.open(getWhatsAppUrl(currentCart, summary.subtotal), '_blank', 'noopener,noreferrer')
        return { status: 'opened', ...summary }
      },
    })
    return () => lifecycle.abort()
  }, [])

  return (
    <main className="min-h-screen overflow-x-hidden bg-[#fbfaf5] text-[#17382f]">
      <div className="bg-[#103d31] px-4 py-2 text-center text-[12px] font-medium tracking-[0.08em] text-[#fcf8e9] sm:text-[13px]">Thoughtfully packed • Freshness first • Delivered with care</div>

      <header className="relative sticky top-0 z-30 border-b border-[#153d3420] bg-[#fbfaf5]/95 backdrop-blur-md">
        <div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <a href="#top" className="group flex items-center gap-2.5" aria-label="Atayinlife home"><span className="grid size-9 place-items-center rounded-full bg-[#103d31] text-[#f3c76b] transition-transform duration-300 group-hover:rotate-12"><Leaf size={20} strokeWidth={2.2} /></span><span className="font-display text-[24px] leading-none tracking-[-0.045em] text-[#103d31]">Atayinlife</span></a>
          <nav className="hidden items-center gap-6 text-[14px] font-medium text-[#31554a] lg:flex"><a className="transition-colors hover:text-[#be7c24]" href="#shop">Shop</a><a className="transition-colors hover:text-[#be7c24]" href="#curated">Curated boxes</a><a className="transition-colors hover:text-[#be7c24]" href="#how-it-works">How it works</a><a className="transition-colors hover:text-[#be7c24]" href="#our-promise">Our promise</a><a className="transition-colors hover:text-[#be7c24]" href="#contact">Contact</a></nav>
          <div className="flex items-center gap-1 sm:gap-2"><label className="hidden h-10 items-center gap-2 rounded-full border border-[#214d4020] bg-white px-3.5 text-[#567166] md:flex"><Search size={16} /><input value={query} onChange={(event) => handleNavigationSearch(event.target.value)} className="w-36 bg-transparent text-[14px] outline-none placeholder:text-[#768c84]" placeholder="Find a favourite" aria-label="Search products" /></label><button onClick={() => setIsCartOpen(true)} className="relative grid size-10 place-items-center rounded-full transition-colors hover:bg-[#e8efe9]" aria-label="Open basket"><ShoppingBag size={19} />{itemCount > 0 && <span className="absolute -right-0.5 -top-0.5 grid min-w-5 place-items-center rounded-full bg-[#c5761e] px-1 text-[11px] font-bold leading-5 text-white">{itemCount}</span>}</button><button onClick={() => setIsMenuOpen((open) => !open)} className="grid size-10 place-items-center rounded-full hover:bg-[#e8efe9] lg:hidden" aria-label="Toggle navigation menu">{isMenuOpen ? <X size={21} /> : <Menu size={21} />}</button></div>
        </div>
        {isMenuOpen && <div className="absolute inset-x-0 top-full border-t border-[#153d3415] bg-[#fbfaf5]/98 px-5 py-5 shadow-[0_18px_34px_rgba(16,61,49,.14)] backdrop-blur-xl lg:hidden"><div className="mx-auto max-w-7xl"><div className="mb-4 flex h-11 items-center gap-2 rounded-full border border-[#214d4020] bg-white px-4 text-[#567166] shadow-sm"><Search size={17} /><input value={query} onChange={(event) => handleNavigationSearch(event.target.value)} className="w-full bg-transparent text-[14px] outline-none placeholder:text-[#789087]" placeholder="Search the collection" aria-label="Search products" /></div><nav className="grid gap-1"><a href="#shop" onClick={() => setIsMenuOpen(false)} className="group flex items-center justify-between rounded-2xl px-4 py-3.5 text-[15px] font-bold text-[#17382f] transition hover:bg-[#e9f0e8]">Shop the collection <ArrowRight size={17} className="text-[#b97625] transition-transform group-hover:translate-x-1" /></a><a href="#curated" onClick={() => setIsMenuOpen(false)} className="group flex items-center justify-between rounded-2xl px-4 py-3.5 text-[15px] font-bold text-[#17382f] transition hover:bg-[#e9f0e8]">Curated boxes <ArrowRight size={17} className="text-[#b97625] transition-transform group-hover:translate-x-1" /></a><a href="#how-it-works" onClick={() => setIsMenuOpen(false)} className="group flex items-center justify-between rounded-2xl px-4 py-3.5 text-[15px] font-bold text-[#17382f] transition hover:bg-[#e9f0e8]">How it works <ArrowRight size={17} className="text-[#b97625] transition-transform group-hover:translate-x-1" /></a><a href="#our-promise" onClick={() => setIsMenuOpen(false)} className="group flex items-center justify-between rounded-2xl px-4 py-3.5 text-[15px] font-bold text-[#17382f] transition hover:bg-[#e9f0e8]">Our promise <ArrowRight size={17} className="text-[#b97625] transition-transform group-hover:translate-x-1" /></a><a href="#contact" onClick={() => setIsMenuOpen(false)} className="group flex items-center justify-between rounded-2xl px-4 py-3.5 text-[15px] font-bold text-[#17382f] transition hover:bg-[#e9f0e8]">Contact Atayinlife <ArrowRight size={17} className="text-[#b97625] transition-transform group-hover:translate-x-1" /></a></nav><button onClick={() => { setIsMenuOpen(false); startGeneralConversation() }} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#103d31] px-5 text-[14px] font-bold text-white shadow-[0_10px_22px_rgba(16,61,49,.2)] transition hover:bg-[#1a5747]"><FaWhatsapp size={20} /> Chat with our fruit concierge</button></div></div>}
      </header>
      {isMenuOpen && <button type="button" onClick={() => setIsMenuOpen(false)} className="fixed inset-0 z-20 cursor-default bg-[#082d25]/25 backdrop-blur-[1px] lg:hidden" aria-label="Close navigation menu" />}

      <section id="top" className="hero-shell relative isolate min-h-[720px] overflow-hidden bg-[#082c25] lg:min-h-[760px]">
        <img src={imageUrls.tropical} alt="Fresh tropical fruits arranged in a colourful still life" className="hero-media absolute inset-0 -z-30 h-full w-full object-cover object-[63%_48%]" />
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(96deg,rgba(4,34,28,.98)_0%,rgba(7,45,36,.89)_40%,rgba(8,39,32,.42)_71%,rgba(8,39,32,.55)_100%)]" />
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_72%_22%,rgba(241,201,109,.32),transparent_24%),radial-gradient(circle_at_78%_84%,rgba(43,135,98,.28),transparent_29%)]" />
        <div className="hero-orb absolute -right-24 top-28 -z-10 size-72 rounded-full bg-[#f2cd79]/20 blur-3xl" aria-hidden="true" />
        <div className="hero-orb-delay absolute bottom-4 left-[42%] -z-10 size-52 rounded-full bg-[#2b976e]/25 blur-3xl" aria-hidden="true" />
        <div className="hero-noise absolute inset-0 -z-10 opacity-30" aria-hidden="true" />

        <div className="mx-auto grid min-h-[720px] max-w-7xl items-end gap-10 px-5 pb-24 pt-20 sm:pb-28 lg:min-h-[760px] lg:grid-cols-[1.15fr_.85fr] lg:px-8 lg:pb-32">
          <div className="hero-copy max-w-3xl text-[#fffdf4]">
            <div className="mb-7 flex flex-wrap items-center gap-3"><span className="inline-flex items-center gap-2 rounded-full border border-[#f4d998]/35 bg-[#153d34]/65 px-3.5 py-2 text-[12px] font-bold tracking-[0.1em] text-[#f8d988] backdrop-blur-sm"><Sparkles size={14} /> THE SEASONAL EDIT</span><span className="text-[12px] font-semibold tracking-[0.12em] text-white/60">01 / 04</span></div>
            <p className="mb-4 text-[12px] font-bold tracking-[0.16em] text-[#d8ecdb]/80">FRUIT, BUT MORE CONSIDERED</p>
            <h1 className="font-display text-[56px] leading-[0.9] tracking-[-0.06em] sm:text-[76px] lg:text-[96px]">More than<br />a <em className="font-normal text-[#f5cd75]">market.</em></h1>
            <p className="mt-7 max-w-xl text-[17px] leading-7 text-[#f7f1dc]/86 sm:text-[19px]">An evolving edit of fresh fruit, rare exotic produce, premium dates and dry fruits—picked for people who notice the difference.</p>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row"><a href="#shop" className="group inline-flex min-h-13 items-center justify-center gap-2 rounded-full bg-[#f4c96f] px-7 text-[14px] font-bold text-[#15382f] shadow-[0_14px_36px_rgba(5,30,25,.28)] transition duration-300 hover:-translate-y-1 hover:bg-[#ffe09a]">Explore the market <ArrowRight className="transition-transform duration-300 group-hover:translate-x-1" size={17} /></a><a href="#how-it-works" className="inline-flex min-h-13 items-center justify-center gap-2 rounded-full border border-white/35 px-7 text-[14px] font-bold text-white transition hover:bg-white/10">The Atayinlife way <ChevronRight size={17} /></a></div>
            <div className="mt-12 flex items-center gap-4 text-[13px] font-medium text-[#d9e9dc]/75"><span className="h-px w-10 bg-[#f4cd75]" /><span>Fresh arrivals, in their best moment</span></div>
          </div>

          <div className="hero-side hidden self-center justify-self-end lg:block">
            <div className="hero-sun inline-flex size-20 items-center justify-center rounded-full border border-[#f2cd79]/45 bg-[#103d31]/60 text-center text-[11px] font-bold leading-4 tracking-[0.08em] text-[#f7d77f] backdrop-blur-md">NEW<br />HARVEST</div>
            <article className="hero-float-card mt-16 w-[290px] rounded-[1.7rem] border border-white/20 bg-[#fbfaf5]/95 p-4 text-[#143b31] shadow-[0_28px_80px_rgba(0,0,0,.28)] backdrop-blur-lg"><div className="overflow-hidden rounded-[1.15rem] bg-[#dce8d5]"><img src={imageUrls.fresh} alt="Seasonal fresh fruit selection" className="h-36 w-full object-cover" /></div><div className="px-1 pb-1 pt-4"><div className="flex items-start justify-between gap-4"><div><p className="text-[11px] font-bold tracking-[0.12em] text-[#ab6c20]">THIS WEEK&apos;S FIND</p><h2 className="mt-1 font-display text-[24px] tracking-[-0.045em]">Colour outside the ordinary.</h2></div><span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e9f0e6] text-[#205943]"><ArrowRight size={16} /></span></div><div className="mt-4 flex items-center justify-between border-t border-[#153d3314] pt-3 text-[12px] font-bold text-[#527066]"><span>PEAK SEASON</span><span>→ EXPLORE</span></div></div></article>
          </div>
        </div>

        <div className="hero-marquee absolute inset-x-0 bottom-0 border-y border-white/15 bg-[#0b342b]/65 py-3 backdrop-blur-md"><div className="hero-marquee-track flex w-max items-center gap-8 whitespace-nowrap text-[12px] font-bold tracking-[0.16em] text-[#e6eee1]/90"><span>FRESH, NOT FORGETTABLE</span><span className="text-[#f3cf7a]">✦</span><span>EXOTIC FINDS</span><span className="text-[#f3cf7a]">✦</span><span>PREMIUM DRY FRUITS</span><span className="text-[#f3cf7a]">✦</span><span>THOUGHTFULLY PACKED</span><span className="text-[#f3cf7a]">✦</span><span>FRESH, NOT FORGETTABLE</span><span className="text-[#f3cf7a]">✦</span><span>EXOTIC FINDS</span><span className="text-[#f3cf7a]">✦</span></div></div>
      </section>

      <section className="border-b border-[#17463815] bg-[#f6f2e7]"><div className="mx-auto grid max-w-7xl grid-cols-1 divide-y divide-[#17463818] px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 lg:px-8">{[['Picked for peak flavour', 'Fresh arrivals that are worth the wait'], ['Packed with a little ceremony', 'Protective, considered and gift-ready'], ['A simple way to order', 'Build your basket, confirm on WhatsApp']].map(([title, caption]) => <div key={title} className="flex items-center gap-3 py-5 sm:px-5 sm:first:pl-0"><Check className="shrink-0 text-[#b97825]" size={18} strokeWidth={2.5} /><div><p className="text-[14px] font-bold text-[#17382f]">{title}</p><p className="mt-0.5 text-[13px] text-[#5e746c]">{caption}</p></div></div>)}</div></section>

      <section id="shop" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><div className="flex flex-col justify-between gap-7 md:flex-row md:items-end"><div><p className="mb-3 text-[12px] font-bold tracking-[0.13em] text-[#b57423]">THE MARKET EDIT</p><h2 className="max-w-xl font-display text-[42px] leading-[1.02] tracking-[-0.04em] text-[#113a2f] sm:text-[52px]">Exceptional things,<br />ready for your table.</h2></div><p className="max-w-sm text-[16px] leading-7 text-[#5b7169]">Build a basket from this week&apos;s most beautiful fresh produce and pantry treasures.</p></div><div className="mt-10 rounded-[1.5rem] border border-[#17463818] bg-[#f3f6ef] p-3 shadow-[0_14px_35px_-30px_rgba(12,58,45,.65)] sm:p-4"><label className="flex min-h-14 items-center gap-3 rounded-xl bg-white px-4 text-[#285044] shadow-sm ring-1 ring-[#1746380f] transition focus-within:ring-2 focus-within:ring-[#1e6854]/45"><Search className="shrink-0 text-[#a86c21]" size={20} /><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[16px] font-medium outline-none placeholder:text-[#789087]" placeholder="Search fresh fruit, exotic fruit, dates, almonds, cashews…" aria-label="Search Atayinlife products" />{query && <button onClick={() => setQuery('')} className="grid size-9 shrink-0 place-items-center rounded-full text-[#5b756c] transition hover:bg-[#e7efe5] hover:text-[#173d32]" aria-label="Clear product search"><X size={18} /></button>}</label><div className="flex flex-col gap-3 pt-3 sm:flex-row sm:items-center sm:justify-between"><p className="px-1 text-[13px] font-medium text-[#637b71]">{visibleProducts.length} {visibleProducts.length === 1 ? 'product' : 'products'} found {query ? `for “${query}”` : 'in the current collection'}</p><p className="px-1 text-[12px] font-semibold tracking-[0.06em] text-[#a96a1e]">SEARCH BY NAME, CATEGORY OR TASTE</p></div></div><div className="mt-5 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none]">{categories.map((category) => <button key={category} onClick={() => setActiveCategory(category)} className={`whitespace-nowrap rounded-full border px-4 py-2.5 text-[14px] font-semibold transition ${activeCategory === category ? 'border-[#103d31] bg-[#103d31] text-white' : 'border-[#17463822] bg-white text-[#436158] hover:border-[#103d31]'}`}>{category}</button>)}</div>
        {visibleProducts.length ? <div className="mt-9 grid grid-cols-1 gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">{visibleProducts.map((product) => <article key={product.id} className="group min-w-0"><button onClick={() => openPicker(product)} className="relative block aspect-[.88] w-full overflow-hidden rounded-[1.4rem] bg-[#e9eee7] text-left"><img src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-[#0d3529]/35 via-transparent to-transparent opacity-75" />{product.badge && <span className="absolute left-3 top-3 rounded-full bg-[#f5d37f] px-2.5 py-1 text-[12px] font-bold text-[#294139]">{product.badge}</span>}<span className="absolute bottom-3 right-3 grid size-10 place-items-center rounded-full bg-white text-[#17382f] shadow-sm transition group-hover:bg-[#f4ca71]"><Plus size={19} /></span></button><div className="mt-4 flex gap-3"><div className="min-w-0 flex-1"><p className="text-[15px] font-bold text-[#17382f]">{product.name}</p><p className="mt-1 text-[13px] text-[#70857d]">{product.note}</p></div><p className="whitespace-nowrap text-[14px] font-bold text-[#a9641b]">from {currency(product.options[0].price)}</p></div><button onClick={() => addToCart(product)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#16463a]/20 bg-white px-3 py-3 text-[14px] font-bold text-[#1b4b3f] transition hover:border-[#17463a] hover:bg-[#e9f0e9]"><ShoppingBag size={16} /> Add {product.options[0].label}</button></article>)}</div> : <div className="mt-10 rounded-[1.4rem] border border-dashed border-[#173d3330] bg-white px-6 py-14 text-center"><p className="font-display text-3xl text-[#17382f]">Nothing quite matches that.</p><p className="mt-2 text-[15px] text-[#698077]">Try a different search or explore the full selection.</p><button onClick={() => { setQuery(''); setActiveCategory('All') }} className="mt-5 text-[14px] font-bold text-[#b36d1d] underline underline-offset-4">Show all products</button></div>}</section>

      <section id="curated" className="mx-auto max-w-7xl px-5 pb-20 lg:px-8 lg:pb-28"><div className="grid overflow-hidden rounded-[2rem] bg-[#163f35] lg:grid-cols-2"><div className="order-2 p-8 text-[#fffaf0] sm:p-12 lg:order-1 lg:p-16"><p className="text-[12px] font-bold tracking-[0.13em] text-[#edc96f]">PANTRY, ELEVATED</p><h2 className="mt-4 font-display text-[42px] leading-[1.02] tracking-[-0.04em] sm:text-[55px]">Little rituals,<br /><em className="font-normal text-[#efd37f]">well supplied.</em></h2><p className="mt-6 max-w-md text-[16px] leading-7 text-[#e5eada]/80">The good stuff for early starts, shared plates, thoughtful gifts and all the in-between moments.</p><a href="#shop" className="mt-8 inline-flex items-center gap-2 text-[14px] font-bold text-[#f5d27c] transition hover:text-white">Browse the pantry <ArrowRight size={17} /></a><div className="mt-12 grid grid-cols-3 gap-4 border-t border-white/15 pt-7"><div><p className="font-display text-3xl text-[#f2d17b]">01</p><p className="mt-1 text-[12px] leading-5 text-[#e4eadd]/75">Fresh favourites</p></div><div><p className="font-display text-3xl text-[#f2d17b]">02</p><p className="mt-1 text-[12px] leading-5 text-[#e4eadd]/75">Rare varieties</p></div><div><p className="font-display text-3xl text-[#f2d17b]">03</p><p className="mt-1 text-[12px] leading-5 text-[#e4eadd]/75">Nourishing pantry</p></div></div></div><img src={imageUrls.dry} alt="An abundant platter of premium dried fruits and nuts" className="order-1 h-[360px] w-full object-cover object-center lg:order-2 lg:h-full" /></div></section>

      <section id="our-promise" className="bg-[#efeada] px-5 py-20 lg:px-8 lg:py-28"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><p className="mb-3 text-[12px] font-bold tracking-[0.13em] text-[#af6d20]">OUR APPROACH</p><h2 className="font-display text-[42px] leading-[1.02] tracking-[-0.04em] text-[#123c31] sm:text-[52px]">The pleasure is in the picking.</h2></div><div className="mt-12 grid gap-5 md:grid-cols-3">{[{ icon: <Heart />, title: 'Chosen, not just stocked', copy: 'Every fruit and pantry find earns its place for taste, texture and simple goodness.' }, { icon: <PackageCheck />, title: 'Beautifully protected', copy: 'From our hands to your home, every order is packed to arrive at its best.' }, { icon: <Truck />, title: 'A gentler delivery rhythm', copy: 'We keep ordering personal, clear and easy from the first click to your doorstep.' }].map((promise) => <div key={promise.title} className="rounded-[1.5rem] bg-[#fbfaf5] p-7"><span className="grid size-11 place-items-center rounded-full bg-[#e6efe5] text-[#1c604d]">{promise.icon}</span><h3 className="mt-6 text-[17px] font-bold text-[#17382f]">{promise.title}</h3><p className="mt-2 text-[15px] leading-6 text-[#627970]">{promise.copy}</p></div>)}</div></div></section>

      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="text-[12px] font-bold tracking-[0.13em] text-[#af6d20]">MADE SIMPLE</p><h2 className="mt-3 font-display text-[42px] leading-[1.02] tracking-[-0.04em] text-[#123c31] sm:text-[52px]">Good shopping<br /><em className="font-normal text-[#b57423]">should feel easy.</em></h2><p className="mt-6 max-w-md text-[16px] leading-7 text-[#60776d]">No accounts, complicated checkout or uncertainty. Choose what feels right, then send a complete order straight to WhatsApp.</p></div><div className="grid gap-3 sm:grid-cols-3">{[{ number: '01', title: 'Find your favourites', copy: 'Explore fresh fruit, exotic finds and nourishing pantry staples.' }, { number: '02', title: 'Make it yours', copy: 'Select the pack size and quantity that makes sense for your home.' }, { number: '03', title: 'Confirm with clarity', copy: 'Your complete basket opens in WhatsApp with every detail already listed.' }].map((step) => <article key={step.number} className="rounded-[1.45rem] border border-[#173d3318] bg-white p-6"><p className="font-display text-3xl text-[#c17a27]">{step.number}</p><h3 className="mt-8 text-[16px] font-bold text-[#163d32]">{step.title}</h3><p className="mt-2 text-[14px] leading-6 text-[#668077]">{step.copy}</p></article>)}</div></div></section>

      <section className="bg-[#e7efe5] px-5 py-20 lg:px-8 lg:py-24"><div className="mx-auto grid max-w-7xl gap-10 rounded-[2rem] bg-[#f9fbf6] p-7 shadow-[0_20px_70px_-45px_rgba(10,58,43,.6)] sm:p-10 lg:grid-cols-[1.1fr_.9fr] lg:p-14"><div><p className="text-[12px] font-bold tracking-[0.13em] text-[#af6d20]">FOR THOUGHTFUL GIVING</p><h2 className="mt-3 max-w-xl font-display text-[42px] leading-[1.02] tracking-[-0.04em] text-[#123c31] sm:text-[53px]">A better way to say,<br /><em className="font-normal text-[#b57423]">“I was thinking of you.”</em></h2><p className="mt-6 max-w-lg text-[16px] leading-7 text-[#60776d]">Whether it is a family celebration, a thank-you or an everyday care package, Atayinlife makes it simple to choose something nourishing and genuinely useful.</p><button onClick={startGiftingConversation} className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#103d31] px-6 text-[14px] font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#1b5748]">Plan a gift order <FaWhatsapp size={18} /></button></div><div className="grid content-center gap-3"><div className="rounded-[1.35rem] bg-[#103d31] p-6 text-[#fbf8ec]"><p className="text-[12px] font-bold tracking-[0.12em] text-[#efce79]">CONSIDERED FROM START TO FINISH</p><p className="mt-4 font-display text-[29px] leading-tight">A gift that feels as good to give as it does to receive.</p></div><div className="grid grid-cols-2 gap-3"><div className="rounded-[1.35rem] bg-[#f1e5c8] p-5"><Heart className="text-[#b57423]" size={21} /><p className="mt-8 text-[14px] font-bold text-[#24483e]">Chosen with care</p><p className="mt-1 text-[13px] leading-5 text-[#587168]">For the moments that matter.</p></div><div className="rounded-[1.35rem] bg-[#dceadb] p-5"><PackageCheck className="text-[#287053]" size={21} /><p className="mt-8 text-[14px] font-bold text-[#24483e]">Packed to present</p><p className="mt-1 text-[13px] leading-5 text-[#587168]">A polished unboxing moment.</p></div></div></div></div></section>

      <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8 lg:py-28"><div className="grid gap-10 lg:grid-cols-[.8fr_1.2fr]"><div><p className="text-[12px] font-bold tracking-[0.13em] text-[#af6d20]">ORDERING, ANSWERED</p><h2 className="mt-3 font-display text-[42px] leading-[1.02] tracking-[-0.04em] text-[#123c31] sm:text-[50px]">Clear from the<br />first click.</h2><p className="mt-5 max-w-sm text-[16px] leading-7 text-[#60776d]">We designed the experience to make each choice easy to see and simple to adjust.</p></div><div className="divide-y divide-[#173d3318] border-y border-[#173d3318]">{[{ question: 'How do I place an Atayinlife order?', answer: 'Add the products you like, choose their pack sizes and quantities, then select “Order on WhatsApp”. Your full basket appears in a ready-to-send message.' }, { question: 'Can I change or remove an item before ordering?', answer: 'Yes. In your basket, use the + and − controls to change a quantity, or use Remove to delete any item completely. Your total updates immediately.' }, { question: 'How are delivery details confirmed?', answer: 'The WhatsApp order message includes your delivery area and preferred delivery time fields, so the order can be confirmed clearly before dispatch.' }, { question: 'Will I see the price for my chosen pack?', answer: 'Yes. Every product shows its available pack options, and your basket displays a line total for each choice plus the full order total.' }].map((faq) => <details key={faq.question} className="group py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-[16px] font-bold text-[#193f34] [&::-webkit-details-marker]:hidden">{faq.question}<span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#e8efe6] text-[#245244] transition group-open:rotate-45"><Plus size={16} /></span></summary><p className="max-w-2xl pt-3 pr-12 text-[15px] leading-7 text-[#617970]">{faq.answer}</p></details>)}</div></div></section>

      <section id="contact" className="bg-[#103d31] px-5 py-20 text-[#fffaf0] lg:px-8 lg:py-24"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.15fr_.85fr] lg:items-center"><div><p className="text-[12px] font-bold tracking-[0.13em] text-[#efce79]">SAY HELLO</p><h2 className="mt-3 max-w-2xl font-display text-[45px] leading-[1.02] tracking-[-0.04em] sm:text-[58px]">Questions about the<br /><em className="font-normal text-[#f0d37f]">good stuff?</em></h2><p className="mt-6 max-w-xl text-[16px] leading-7 text-[#e4ecdf]/80">Whether you are choosing fruit for the week, planning a thoughtful gift or simply need help with a product, our WhatsApp conversation starts with the essentials already written for you.</p><div className="mt-8 flex flex-col gap-3 sm:flex-row"><button onClick={startGeneralConversation} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#25D366] px-6 text-[14px] font-bold text-[#073a18] transition hover:-translate-y-0.5 hover:bg-[#46e982]"><FaWhatsapp size={20} /> Chat on WhatsApp</button><a href="#shop" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/30 px-6 text-[14px] font-bold text-white transition hover:bg-white/10">Keep shopping <ArrowRight size={17} /></a></div></div><aside className="rounded-[1.7rem] border border-white/15 bg-white/8 p-7 backdrop-blur-sm sm:p-8"><p className="text-[12px] font-bold tracking-[0.12em] text-[#efce79]">WHAT TO EXPECT</p><div className="mt-6 grid gap-5">{[['A clear starting point', 'Your WhatsApp message opens with your basket or question prefilled.'], ['No difficult checkout', 'Choose your sizes, review your total and confirm in one simple conversation.'], ['A responsive team handoff', 'Your delivery area and preferred time are included so the next step is clear.']].map(([title, copy]) => <div key={title} className="flex gap-3"><span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-full bg-[#efce79] text-[#123d31]"><Check size={14} strokeWidth={3} /></span><div><p className="text-[15px] font-bold">{title}</p><p className="mt-1 text-[14px] leading-6 text-[#e4ecdf]/75">{copy}</p></div></div>)}</div></aside></div></section>

      <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8"><div className="flex flex-col items-start justify-between gap-7 rounded-[1.7rem] border border-[#d6e0d3] bg-white p-7 sm:flex-row sm:items-center sm:p-10"><div><p className="flex items-center gap-1.5 text-[13px] font-bold text-[#b97625]"><Star size={15} fill="currentColor" /> YOUR NEXT BASKET, MADE EASY</p><h2 className="mt-2 font-display text-[31px] tracking-[-0.035em] text-[#143b31] sm:text-[38px]">Select, review, message. That&apos;s it.</h2></div><button onClick={() => setIsCartOpen(true)} className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-full bg-[#103d31] px-6 text-[14px] font-bold text-white transition hover:bg-[#1a5747]">Review your basket <ShoppingBag size={17} /></button></div></section>

      <footer className="bg-[#103d31] px-5 pb-8 pt-14 text-[#f8f4e5] lg:px-8"><div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4"><div className="sm:col-span-2"><a href="#top" className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-full bg-[#f1cc74] text-[#103d31]"><Leaf size={20} /></span><span className="font-display text-[27px] tracking-[-0.045em]">Atayinlife</span></a><p className="mt-5 max-w-sm text-[15px] leading-6 text-[#d8e2d7]/75">A more considered market for fresh fruit, exotic finds and pantry pleasures.</p></div><div><p className="text-[12px] font-bold tracking-[0.13em] text-[#efce79]">EXPLORE</p><div className="mt-4 grid gap-3 text-[14px] text-[#d8e2d7]/80"><a href="#shop" className="hover:text-white">Fresh & exotic fruit</a><a href="#shop" className="hover:text-white">Dates & dry fruits</a><a href="#curated" className="hover:text-white">Curated boxes</a></div></div><div><p className="text-[12px] font-bold tracking-[0.13em] text-[#efce79]">ORDERING</p><div className="mt-4 grid gap-3 text-[14px] text-[#d8e2d7]/80"><button onClick={() => setIsCartOpen(true)} className="text-left hover:text-white">Your basket</button><a href="#how-it-works" className="hover:text-white">How it works</a><button onClick={startGiftingConversation} className="text-left hover:text-white">Chat with us</button></div></div></div><div className="mx-auto mt-12 flex max-w-7xl flex-col gap-3 border-t border-white/15 pt-6 text-[12px] text-[#d8e2d7]/65 sm:flex-row sm:justify-between"><p>© {new Date().getFullYear()} Atayinlife. Made for better everyday rituals.</p><p>Fresh • Exotic • Naturally considered</p></div></footer>

      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3">
        {showScrollTop && <button onClick={scrollToTop} className="grid size-12 place-items-center rounded-full border border-[#d4dfd2] bg-[#fbfaf5] text-[#103d31] shadow-[0_12px_28px_rgba(12,58,45,.18)] transition hover:-translate-y-1 hover:bg-white" aria-label="Scroll to top"><ArrowUp size={20} /></button>}
        {itemCount > 0 && <button onClick={() => setIsCartOpen(true)} className="group inline-flex min-h-12 items-center gap-2 rounded-full bg-[#103d31] py-2 pl-3 pr-4 text-[14px] font-bold text-white shadow-[0_12px_30px_rgba(12,58,45,.28)] transition hover:-translate-y-0.5 hover:bg-[#1a5747]" aria-label={`Open basket with ${itemCount} items`}><span className="relative grid size-8 place-items-center rounded-full bg-white/15"><ShoppingBag size={17} /><span className="absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full bg-[#f1c869] px-1 text-[11px] leading-5 text-[#143b31]">{itemCount}</span></span><span>Basket · {currency(subtotal)}</span></button>}
        <button onClick={startGeneralConversation} className="whatsapp-float group inline-flex size-[56px] items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_14px_34px_rgba(12,90,44,.42)] transition hover:-translate-y-1 hover:bg-[#31dc6f] sm:w-auto sm:gap-2.5 sm:px-5" aria-label="Chat with Atayinlife on WhatsApp"><FaWhatsapp size={26} /><span className="hidden text-[14px] font-bold sm:inline">WhatsApp</span></button>
      </div>

      {selectedProduct && <ProductPicker product={selectedProduct} packIndex={selectedPackIndex} quantity={selectedQuantity} onPackChange={setSelectedPackIndex} onQuantityChange={setSelectedQuantity} onClose={() => setSelectedProduct(null)} onAdd={addSelectedItem} />}
      <CartDrawer cart={cart} subtotal={subtotal} isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} onChangeQuantity={changeQuantity} onRemoveItem={removeCartItem} onOrder={sendWhatsAppOrder} />
      {isLoading && <div className="site-loader fixed inset-0 z-[80] grid place-items-center overflow-hidden bg-[#082d25] text-[#fffaf0]" role="status" aria-label="Loading Atayinlife"><div className="loader-glow absolute size-[min(82vw,560px)] rounded-full bg-[#e9c66e]/15 blur-3xl" /><div className="relative flex flex-col items-center"><div className="loader-orbit grid size-24 place-items-center rounded-full border border-[#f0cf7e]/45"><div className="loader-core grid size-17 place-items-center rounded-full bg-[#f1cc75] text-[#103d31] shadow-[0_0_50px_rgba(241,204,117,.5)]"><Leaf size={34} strokeWidth={2.25} /></div></div><p className="mt-8 font-display text-[38px] tracking-[-0.05em]">Atayinlife</p><p className="mt-2 text-[11px] font-bold tracking-[0.2em] text-[#efd17e]">THE CONSIDERED MARKET</p><div className="mt-8 h-px w-40 overflow-hidden bg-white/15"><span className="loader-line block h-full bg-[#efcf7e]" /></div></div></div>}
    </main>
  )
}

function ProductPicker({ product, packIndex, quantity, onPackChange, onQuantityChange, onClose, onAdd }: { product: Product; packIndex: number; quantity: number; onPackChange: (index: number) => void; onQuantityChange: (quantity: number) => void; onClose: () => void; onAdd: () => void }) {
  const pack = product.options[packIndex]
  return <div className="fixed inset-0 z-50 grid place-items-end bg-[#0b2c25]/45 p-0 backdrop-blur-sm sm:place-items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="picker-title"><div className="grid w-full max-w-3xl overflow-hidden rounded-t-[1.8rem] bg-[#fbfaf5] shadow-2xl sm:grid-cols-2 sm:rounded-[1.8rem]"><div className="relative h-64 sm:h-full"><img src={product.image} alt={product.name} className="h-full w-full object-cover" /><button onClick={onClose} className="absolute right-4 top-4 grid size-10 place-items-center rounded-full bg-white/90 text-[#17382f] sm:hidden" aria-label="Close product options"><X size={19} /></button></div><div className="relative p-6 sm:p-8"><button onClick={onClose} className="absolute right-5 top-5 hidden text-[#5d756b] hover:text-[#17382f] sm:block" aria-label="Close product options"><X size={22} /></button><p className="text-[12px] font-bold tracking-[0.12em] text-[#b57423]">{product.category.toUpperCase()}</p><h2 id="picker-title" className="mt-2 pr-8 font-display text-[35px] leading-none tracking-[-0.04em] text-[#153d32]">{product.name}</h2><p className="mt-3 text-[15px] text-[#668077]">{product.note}</p><p className="mt-7 text-[13px] font-bold text-[#34594d]">CHOOSE A SIZE</p><div className="mt-3 grid grid-cols-2 gap-2">{product.options.map((option, index) => <button key={option.label} onClick={() => onPackChange(index)} className={`rounded-xl border px-3 py-3 text-left transition ${packIndex === index ? 'border-[#103d31] bg-[#eaf0e7] text-[#103d31]' : 'border-[#153d3320] bg-white text-[#4c665e]'}`}><span className="block text-[14px] font-bold">{option.label}</span><span className="mt-0.5 block text-[13px]">{currency(option.price)}</span></button>)}</div><div className="mt-7 flex items-center justify-between"><p className="text-[13px] font-bold text-[#34594d]">QUANTITY</p><QuantityControl quantity={quantity} onChange={onQuantityChange} /></div><div className="mt-7 flex items-center justify-between border-t border-[#173d3318] pt-5"><div><p className="text-[13px] text-[#668077]">Your selection</p><p className="text-[16px] font-bold text-[#17382f]">{pack.label} × {quantity}</p></div><p className="font-display text-[31px] text-[#153d32]">{currency(pack.price * quantity)}</p></div><button onClick={onAdd} className="mt-6 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#103d31] text-[14px] font-bold text-white transition hover:bg-[#1e5948]"><ShoppingBag size={17} /> Add to basket</button></div></div></div>
}

function QuantityControl({ quantity, onChange }: { quantity: number; onChange: (quantity: number) => void }) {
  return <div className="flex items-center rounded-full border border-[#153d3320] bg-white p-1"><button onClick={() => onChange(Math.max(1, quantity - 1))} className="grid size-8 place-items-center rounded-full text-[#244b3f] hover:bg-[#e9f0e9]" aria-label="Decrease quantity"><Minus size={15} /></button><span className="w-8 text-center text-[14px] font-bold text-[#17382f]">{quantity}</span><button onClick={() => onChange(quantity + 1)} className="grid size-8 place-items-center rounded-full bg-[#e9f0e9] text-[#244b3f] hover:bg-[#dae8da]" aria-label="Increase quantity"><Plus size={15} /></button></div>
}

function CartDrawer({ cart, subtotal, isOpen, onClose, onChangeQuantity, onRemoveItem, onOrder }: { cart: CartItem[]; subtotal: number; isOpen: boolean; onClose: () => void; onChangeQuantity: (id: number, pack: string, delta: number) => void; onRemoveItem: (id: number, pack: string) => void; onOrder: () => void }) {
  if (!isOpen) return null
  return <div className="fixed inset-0 z-50 bg-[#0b2c25]/35 backdrop-blur-[2px]" role="dialog" aria-modal="true" aria-labelledby="basket-title"><button onClick={onClose} className="absolute inset-0 cursor-default" aria-label="Close basket" /><aside className="absolute right-0 top-0 flex h-full w-full max-w-[430px] flex-col bg-[#fbfaf5] shadow-2xl"><div className="flex items-center justify-between border-b border-[#173d3315] px-6 py-5"><div><p className="text-[12px] font-bold tracking-[0.12em] text-[#af6e20]">YOUR SELECTION</p><h2 id="basket-title" className="mt-1 font-display text-[31px] tracking-[-0.04em] text-[#143b31]">Your basket</h2></div><button onClick={onClose} className="grid size-10 place-items-center rounded-full hover:bg-[#e9f0e9]" aria-label="Close basket"><X size={21} /></button></div>{cart.length ? <><div className="flex-1 overflow-y-auto px-6 py-5">{cart.map((item) => <div key={`${item.id}-${item.pack.label}`} className="flex gap-4 border-b border-[#173d3312] py-4 first:pt-0"><img src={item.image} alt="" className="size-[76px] rounded-xl object-cover" /><div className="min-w-0 flex-1"><div className="flex gap-2"><div className="min-w-0 flex-1"><p className="truncate text-[15px] font-bold text-[#17382f]">{item.name}</p><p className="mt-0.5 text-[13px] text-[#6d837b]">{item.pack.label}</p></div><p className="text-[14px] font-bold text-[#a5661f]">{currency(item.pack.price * item.quantity)}</p></div><div className="mt-3 flex items-center justify-between gap-4"><QuantityControl quantity={item.quantity} onChange={(newQuantity) => onChangeQuantity(item.id, item.pack.label, newQuantity - item.quantity)} /><button onClick={() => onRemoveItem(item.id, item.pack.label)} className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-[13px] font-bold text-[#a35a35] transition hover:bg-[#f8e8de]" aria-label={`Remove ${item.name} from basket`}><Trash2 size={15} /> Remove</button></div></div></div>)}</div><div className="border-t border-[#173d3315] bg-[#f4f0e4] p-6"><div className="flex items-center justify-between"><p className="text-[15px] font-bold text-[#294f44]">Order total</p><p className="font-display text-[32px] tracking-[-0.04em] text-[#103d31]">{currency(subtotal)}</p></div><p className="mt-1 text-[12px] leading-5 text-[#698077]">Review, edit or remove items freely before sending your order.</p><button onClick={onOrder} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 text-[14px] font-bold text-[#063816] transition hover:bg-[#38e878]"><FaWhatsapp size={20} /> Order on WhatsApp</button></div></> : <div className="grid flex-1 place-items-center px-8 text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-full bg-[#e8eee7] text-[#285347]"><ShoppingBag size={25} /></span><h3 className="mt-5 font-display text-[30px] tracking-[-0.035em] text-[#163e33]">Your basket is waiting.</h3><p className="mx-auto mt-2 max-w-xs text-[15px] leading-6 text-[#657c73]">Find a fresh favourite or a pantry essential to get started.</p><button onClick={onClose} className="mt-6 rounded-full bg-[#103d31] px-5 py-3 text-[14px] font-bold text-white">Continue shopping</button></div></div>}</aside></div>
}

export default App
