import {
  ArrowRight,
  BadgeCheck,
  BookOpenText,
  Bot,
  Check,
  FileText,
  Gauge,
  KeyRound,
  Link2,
  ListChecks,
  Lock,
  Menu,
  Quote,
  Radar,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAuth } from '@/lib/auth'
import { PILLARS } from '@/lib/geo'

const PILLAR_ICONS: Record<string, typeof Bot> = {
  crawlability: Bot,
  llms_txt: FileText,
  structured_data: ListChecks,
  extractability: BookOpenText,
  evidence: Quote,
  entity_authority: Link2,
  share_of_voice: Radar,
}

const STEPS = [
  {
    title: 'Describe your business',
    body: 'A short guided form: who you are, what you sell, who you compete with, and the questions your customers would actually type into an AI assistant.',
  },
  {
    title: 'We scan your site',
    body: 'Six automated pillars run against your live pages — robots.txt and AI bot rules, llms.txt, JSON-LD schema, content structure, evidence density and entity signals.',
  },
  {
    title: 'We test the assistants',
    body: 'Connect your own OpenAI, Anthropic or Perplexity key and your target prompts are run for real. We record whether you were mentioned, cited, and who showed up instead.',
  },
  {
    title: 'You get a plan',
    body: 'A 0–100 score with a per-pillar breakdown, plus prioritised fixes split into quick wins, medium effort and strategic work. Downloadable as a PDF.',
  },
]

const FAQ = [
  {
    q: 'What is GEO, and how is it different from SEO?',
    a: 'SEO optimises for a ranked list of links. Generative Engine Optimisation optimises for being the source an AI assistant reads, trusts and cites inside a written answer. The signals overlap but are not the same: an assistant cares about machine-readable facts, extractable structure and verifiable evidence far more than it cares about keyword density.',
  },
  {
    q: 'Why do I need to bring my own API key?',
    a: 'The Share of Voice pillar sends your target prompts to real assistants. Running that on shared platform keys would mean either charging you or capping you. Using your own key keeps the tool free, keeps your prompts on your own account, and means nobody imposes a limit on how many prompts or providers you test.',
  },
  {
    q: 'Is my API key safe?',
    a: 'Keys are encrypted before they touch the database and are decrypted only in memory, inside the process making your audit call. They are never written to logs, never returned to the browser after you save them, and never visible to anyone else — administrators included. You can delete a key permanently at any time.',
  },
  {
    q: 'What if I do not connect a key?',
    a: 'Everything else still runs. The Share of Voice pillar is skipped and its 15% weight is redistributed proportionally across the other six, so your score stays on the same 0–100 scale. The report says plainly that the pillar was not tested.',
  },
  {
    q: 'How long does an audit take?',
    a: 'The automated pillars usually finish in under a minute. Share of Voice depends on how many prompts and providers you chose — each call is queued at a safe rate so no provider throttles you.',
  },
]

function Nav() {
  const { isAuthenticated, isAdmin } = useAuth()
  const [open, setOpen] = useState(false)
  const appHref = isAdmin ? '/admin' : '/app'

  const links = [
    { href: '#how', label: 'How it works' },
    { href: '#pillars', label: 'Scoring' },
    { href: '#byok', label: 'Your keys' },
    { href: '#faq', label: 'FAQ' },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md">
      <nav
        className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6"
        aria-label="Main"
      >
        <Link to="/" className="rounded-md focus-visible:ring-2 focus-visible:ring-ring">
          <Logo />
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle className="hidden sm:inline-flex" />
          {isAuthenticated ? (
            <Button asChild size="sm">
              <Link to={appHref}>
                Open dashboard <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link to="/signup">Start free audit</Link>
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </Button>
        </div>
      </nav>

      {open && (
        <div id="mobile-nav" className="border-t border-border px-6 py-3 md:hidden">
          <ul className="space-y-1">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-2 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Link
                to="/login"
                className="block rounded-md px-2 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Sign in
              </Link>
            </li>
          </ul>
        </div>
      )}
    </header>
  )
}

function Hero() {
  return (
    <section className="glow-surface relative overflow-hidden border-b border-border">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="mx-auto max-w-3xl text-center">
          <Badge variant="outline" className="mb-6 gap-1.5 py-1 pl-1.5 pr-3">
            <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Free
            </span>
            Bring your own API key — no usage caps
          </Badge>

          <h1 className="text-balance text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl md:text-6xl">
            When an AI answers your customer&apos;s question,
            <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
              {' '}
              is it citing you?
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
            Search is moving inside ChatGPT, Claude, Perplexity and Gemini — where there is no
            page two, only the sources the model chose to trust. This audit scores how visible
            and citable your business is to those models, and tells you exactly what to fix.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link to="/signup">
                Run your free audit <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <a href="#pillars">See what we measure</a>
            </Button>
          </div>

          <p className="mt-4 text-xs text-muted-foreground">
            No credit card. No sales call. Your keys stay yours.
          </p>
        </div>

        <div className="mx-auto mt-16 max-w-4xl">
          <ScorePreview />
        </div>
      </div>
    </section>
  )
}

/** Static illustration of the report — no data, purely to set expectations. */
function ScorePreview() {
  const sample = [
    { label: 'Crawlability', value: 88 },
    { label: 'llms.txt', value: 20 },
    { label: 'Schema', value: 64 },
    { label: 'Extractability', value: 72 },
    { label: 'Evidence', value: 45 },
    { label: 'Authority', value: 58 },
    { label: 'Share of Voice', value: 33 },
  ]

  return (
    <Card className="overflow-hidden shadow-xl">
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/40 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-destructive/60" />
        <span className="size-2.5 rounded-full bg-warning/60" />
        <span className="size-2.5 rounded-full bg-success/60" />
        <span className="ml-3 text-xs text-muted-foreground">Example report</span>
      </div>
      <CardContent className="grid gap-8 p-6 sm:grid-cols-[auto,1fr] sm:p-8">
        <div className="flex flex-col items-center justify-center gap-1 sm:border-r sm:border-border sm:pr-8">
          <div className="relative">
            <svg viewBox="0 0 120 120" className="size-32 -rotate-90" aria-hidden="true">
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="hsl(var(--muted))"
                strokeWidth="10"
              />
              <circle
                cx="60"
                cy="60"
                r="52"
                fill="none"
                stroke="hsl(var(--band-fair))"
                strokeWidth="10"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 52 * 0.57} ${2 * Math.PI * 52}`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-semibold tabular-nums">57</span>
              <span className="text-[11px] text-muted-foreground">/ 100</span>
            </div>
          </div>
          <Badge variant="warning" className="mt-2">
            Needs Work
          </Badge>
        </div>

        <ul className="space-y-2.5">
          {sample.map((row) => (
            <li key={row.label} className="grid grid-cols-[7.5rem,1fr,2.5rem] items-center gap-3">
              <span className="truncate text-xs text-muted-foreground">{row.label}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full"
                  style={{
                    width: `${row.value}%`,
                    backgroundColor:
                      row.value >= 80
                        ? 'hsl(var(--band-excellent))'
                        : row.value >= 60
                          ? 'hsl(var(--band-good))'
                          : row.value >= 40
                            ? 'hsl(var(--band-fair))'
                            : 'hsl(var(--band-poor))',
                  }}
                />
              </span>
              <span className="text-right text-xs tabular-nums text-muted-foreground">
                {row.value}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}

function HowItWorks() {
  return (
    <section id="how" className="border-b border-border py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Four steps, one honest number
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            No black box. Every point in your score traces back to a specific check you can
            reproduce yourself.
          </p>
        </div>

        <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full transition-colors hover:border-primary/40">
                <CardContent className="space-y-3 p-5">
                  <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/12 text-sm font-semibold text-primary">
                    {index + 1}
                  </span>
                  <h3 className="font-medium leading-snug">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function Pillars() {
  return (
    <section id="pillars" className="border-b border-border bg-muted/25 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Seven weighted pillars
          </h2>
          <p className="mt-3 text-pretty text-muted-foreground">
            Each pillar is scored 0–100 on its own, then combined by weight into your composite
            GEO score. You always see the sub-scores, so you know which lever to pull.
          </p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((pillar) => {
            const Icon = PILLAR_ICONS[pillar.key] ?? Gauge
            return (
              <Card key={pillar.key} className="h-full">
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/12 text-primary">
                      <Icon className="size-4.5" aria-hidden="true" />
                    </span>
                    <Badge variant="secondary" className="tabular-nums">
                      {Math.round(pillar.weight * 100)}%
                    </Badge>
                  </div>
                  <h3 className="font-medium leading-snug">{pillar.name}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {pillar.description}
                  </p>
                </CardContent>
              </Card>
            )
          })}

          <Card className="h-full border-dashed bg-transparent">
            <CardContent className="flex h-full flex-col justify-center gap-2 p-5">
              <h3 className="font-medium leading-snug">Bands</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-band-poor" /> 0–39 Poor
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-band-fair" /> 40–59 Needs Work
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-band-good" /> 60–79 Good
                </li>
                <li className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-band-excellent" /> 80–100 Excellent
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

function Byok() {
  const points = [
    {
      icon: Lock,
      title: 'Encrypted before storage',
      body: 'Your key is encrypted with an authenticated cipher the moment it arrives, and only decrypted in memory inside the process making your own audit call.',
    },
    {
      icon: ShieldCheck,
      title: 'Never shown again, never shared',
      body: 'After saving, the app only ever displays a masked preview. Administrators can see that a key exists — never its value.',
    },
    {
      icon: Sparkles,
      title: 'No caps on what you test',
      body: 'Because the cost is on your account, you decide how many target prompts and which providers to run. We only pace the calls so nobody gets rate-limited.',
    },
    {
      icon: KeyRound,
      title: 'Delete whenever',
      body: 'Removing a key is a hard delete, not a flag. Skip this step entirely and the other six pillars still produce a full score.',
    },
  ]

  return (
    <section id="byok" className="border-b border-border py-20 sm:py-24">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2">
        <div>
          <Badge variant="outline" className="mb-4">
            Bring your own key
          </Badge>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Your keys. Your account. Your limits.
          </h2>
          <p className="mt-4 text-pretty leading-relaxed text-muted-foreground">
            Live AI testing is the part of this audit that actually costs money — so we let you
            pay for it directly, at cost, on your own provider account. That is what keeps the
            tool free and keeps you from bumping into somebody else&apos;s quota.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {['OpenAI', 'Anthropic', 'Perplexity'].map((name) => (
              <Badge key={name} variant="secondary" className="gap-1.5 py-1">
                <Check className="size-3" aria-hidden="true" />
                {name}
              </Badge>
            ))}
          </div>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {points.map((point) => (
            <li key={point.title}>
              <Card className="h-full">
                <CardContent className="space-y-2 p-5">
                  <point.icon className="size-4.5 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-medium">{point.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{point.body}</p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

function Faq() {
  return (
    <section id="faq" className="border-b border-border bg-muted/25 py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-6">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Questions</h2>
        <dl className="mt-10 space-y-8">
          {FAQ.map((item) => (
            <div key={item.q}>
              <dt className="font-medium leading-snug">{item.q}</dt>
              <dd className="mt-2 text-pretty leading-relaxed text-muted-foreground">{item.a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

function FinalCta() {
  return (
    <section className="glow-surface py-20 sm:py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <BadgeCheck className="mx-auto size-9 text-primary" aria-hidden="true" />
        <h2 className="mt-5 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Find out what the assistants say about you
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
          One form, one scan, one prioritised list of fixes. Most sites discover at least one
          quick win in the first five minutes.
        </p>
        <Button asChild size="lg" className="mt-8">
          <Link to="/signup">
            Start your free audit <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row">
        <Logo />
        <p className="text-xs text-muted-foreground">
          Self-hosted GEO auditing. Your data and your API keys stay on your own server.
        </p>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <Link to="/login" className="transition-colors hover:text-foreground">
            Sign in
          </Link>
          <Link to="/signup" className="transition-colors hover:text-foreground">
            Create account
          </Link>
        </div>
      </div>
    </footer>
  )
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <Hero />
        <HowItWorks />
        <Pillars />
        <Byok />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
