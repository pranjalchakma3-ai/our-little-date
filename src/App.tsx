import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { useLocalDatePlan } from './hooks/useLocalDatePlan'
import { useRunawayButton } from './hooks/useRunawayButton'
import { type DatePlan, type PlannerErrors, type Screen } from './types'

const PLACES = [
  ['Cozy café', '☕'],
  ['Dinner date', '🍝'],
  ['Movie', '🎬'],
  ['Park date', '🌷'],
  ['Long drive', '🚗'],
  ['Surprise me', '✨'],
  ['Something else', '✍️'],
] as const

const FOODS = [
  ['Pizza', '🍕'],
  ['Burger', '🍔'],
  ['Pasta', '🍝'],
  ['Momos', '🥟'],
  ['Indian food', '🍛'],
  ['Chinese', '🥡'],
  ['Dessert', '🍰'],
  ['Ice cream', '🍨'],
  ['Coffee', '☕'],
  ['Surprise me', '💗'],
] as const

const FLOATERS = [
  { symbol: '♡', left: '6%', top: '17%', delay: '-1s', duration: '8s' },
  { symbol: '✦', left: '14%', top: '72%', delay: '-5s', duration: '11s' },
  { symbol: '♥', left: '88%', top: '19%', delay: '-3s', duration: '9s' },
  { symbol: '♡', left: '93%', top: '68%', delay: '-7s', duration: '12s' },
  { symbol: '✧', left: '78%', top: '84%', delay: '-2s', duration: '10s' },
  { symbol: '✿', left: '3%', top: '89%', delay: '-6s', duration: '13s' },
]

const BASE_PATH = import.meta.env.BASE_URL.replace(/\/+$/, '')

function stripBasePath(pathname: string) {
  if (BASE_PATH && pathname.startsWith(BASE_PATH)) {
    return pathname.slice(BASE_PATH.length) || '/'
  }
  return pathname
}

function routeFromPath(pathname: string): Screen {
  const clean = stripBasePath(pathname).replace(/\/+$/, '') || '/'
  if (clean === '/plan') return 'plan'
  if (clean === '/contribution') return 'contribution'
  if (clean === '/reveal') return 'reveal'
  return 'proposal'
}

function pathForScreen(screen: Screen) {
  const route = screen === 'proposal' ? '/' : `/${screen}`
  return `${BASE_PATH}${route}` || '/'
}

function formatDate(dateValue: string) {
  if (!dateValue) return 'Our perfect day'
  const [year, month, day] = dateValue.split('-').map(Number)
  return new Intl.DateTimeFormat('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function formatTime(timeValue: string) {
  if (!timeValue) return 'The perfect time'
  const [hours, minutes] = timeValue.split(':').map(Number)
  return new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(
    new Date(2000, 0, 1, hours, minutes),
  )
}

function selectedPlace(plan: DatePlan) {
  return plan.place === 'Something else' ? plan.customPlace : plan.place
}

function todayInputValue() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function BackgroundDecor() {
  return (
    <div className="background-decor" aria-hidden="true">
      <div className="orb orb-one" />
      <div className="orb orb-two" />
      {FLOATERS.map((floater, index) => (
        <span
          className="floater"
          key={`${floater.symbol}-${index}`}
          style={{
            left: floater.left,
            top: floater.top,
            animationDelay: floater.delay,
            animationDuration: floater.duration,
          }}
        >
          {floater.symbol}
        </span>
      ))}
    </div>
  )
}

function HeartBurst({ active, large = false }: { active: boolean; large?: boolean }) {
  if (!active) return null
  const hearts = ['💗', '♡', '✨', '💕', '♥', '✦', '💖', '♡', '💗', '✨', '♥', '💕']
  return (
    <div className={`heart-burst ${large ? 'heart-burst-large' : ''}`} aria-hidden="true">
      {hearts.map((heart, index) => (
        <span key={`${heart}-${index}`} style={{ '--burst-index': index } as React.CSSProperties}>
          {heart}
        </span>
      ))}
    </div>
  )
}

function BrandMark({ step }: { step: number }) {
  return (
    <div className="brand-mark" aria-label={`Our little date, step ${step} of 4`}>
      <span className="brand-heart">♥</span>
      <span>our little date</span>
      <span className="step-count">0{step} / 04</span>
    </div>
  )
}

function ProposalScreen({ onYes }: { onYes: () => void }) {
  const [yay, setYay] = useState(false)
  const [reaction, setReaction] = useState('')
  const {
    containerRef,
    buttonRef,
    yesRef,
    position,
    attemptCount,
    isReady,
    isEscaping,
    label,
    evadeInteraction,
  } = useRunawayButton({
    onAttempt: (count) => {
      if (count === 3) setReaction('Okay, you are committed to the bit 😂')
      if (count === 6) setReaction('The YES button is literally right there, pretty girl. 💗')
    },
  })

  const accept = () => {
    setYay(true)
    window.setTimeout(onYes, 780)
  }

  return (
    <main className={`screen proposal-screen ${yay ? 'is-accepted' : ''}`}>
      <BrandMark step={1} />
      <section className="proposal-card" aria-labelledby="proposal-title">
        <div className="eyebrow"><span>Just one tiny question</span></div>
        <div className="proposal-emblem" aria-hidden="true">
          <span>🥺</span><span className="emblem-heart">♥</span>
        </div>
        <h1 id="proposal-title">Will you go on a<br />date with me?</h1>
        <p className="proposal-subtitle">I promise it’ll be worth saying yes.</p>

        <div className="escape-arena" ref={containerRef} aria-label="Choose your answer">
          <div className="arena-rule" aria-hidden="true"><span>choose wisely</span></div>
          <button
            type="button"
            className="button yes-button"
            ref={yesRef}
            data-no-zone
            onClick={accept}
          >
            YES <span aria-hidden="true">💗</span>
          </button>

          <div
            className={`no-hit-zone ${isReady ? 'is-ready' : ''} ${isEscaping ? 'is-escaping' : ''}`}
            style={{ transform: `translate3d(${position.x - 28}px, ${position.y - 28}px, 0)` }}
            onPointerEnter={evadeInteraction}
            onPointerDown={evadeInteraction}
            onTouchStart={evadeInteraction}
            onMouseDown={evadeInteraction}
          >
            <button
              type="button"
              className="button no-button"
              ref={buttonRef}
              onFocus={evadeInteraction}
              onPointerEnter={evadeInteraction}
              onPointerDown={evadeInteraction}
              onTouchStart={evadeInteraction}
              onMouseDown={evadeInteraction}
              onClick={evadeInteraction}
              aria-label={`${label}. This playful button runs away.`}
            >
              {label}
            </button>
            <span className="speed-puff" aria-hidden="true">💨</span>
          </div>

          <div className="arena-caption" data-no-zone aria-live="polite">
            {reaction || (attemptCount >= 2
              ? `Failed NO attempts: ${attemptCount} 😂`
              : 'The heart wants what it wants.')}
          </div>
        </div>
      </section>
      <p className="made-with">Made with an unreasonable amount of love <span>♡</span></p>
      <HeartBurst active={yay} large />
      {yay && <div className="yay-message" role="status">YAYYYY! 🥹💗</div>}
    </main>
  )
}

function FieldError({ id, children }: { id: string; children?: string }) {
  if (!children) return null
  return <p className="field-error" id={id} role="alert">{children}</p>
}

function DateSummary({ plan, compact = false }: { plan: DatePlan; compact?: boolean }) {
  return (
    <div className={`date-summary ${compact ? 'date-summary-compact' : ''}`}>
      <div className="summary-heading">
        <span className="summary-kicker">OFFICIAL ITINERARY</span>
        <span className="summary-heart" aria-hidden="true">♥</span>
      </div>
      <h3>Our Date</h3>
      <dl>
        <div><dt>📅</dt><dd><span>WHEN</span>{formatDate(plan.date)}</dd></div>
        <div><dt>⏰</dt><dd><span>TIME</span>{formatTime(plan.time)}</dd></div>
        <div><dt>📍</dt><dd><span>WHERE</span>{selectedPlace(plan) || 'Our little adventure'}</dd></div>
        <div><dt>😋</dt><dd><span>MENU</span>{plan.foods.length ? plan.foods.join(' · ') : 'Something delicious'}</dd></div>
      </dl>
      {plan.message && <blockquote>“{plan.message}”</blockquote>}
      <p className="summary-footnote">Dress code: looking cute (so, no effort required)</p>
    </div>
  )
}

function DatePlanner({ plan, setPlan, onComplete }: {
  plan: DatePlan
  setPlan: (next: DatePlan | ((current: DatePlan) => DatePlan)) => void
  onComplete: () => void
}) {
  const [errors, setErrors] = useState<PlannerErrors>({})
  const [submitting, setSubmitting] = useState(false)
  const minDate = todayInputValue()

  const update = <Key extends keyof DatePlan>(key: Key, value: DatePlan[Key]) => {
    setPlan((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const toggleFood = (food: string) => {
    const foods = plan.foods.includes(food)
      ? plan.foods.filter((item) => item !== food)
      : [...plan.foods, food]
    update('foods', foods)
  }

  const validate = () => {
    const next: PlannerErrors = {}
    if (!plan.date) next.date = 'Pick a day for our little adventure.'
    else if (plan.date < minDate) next.date = 'Our date deserves a day in the future.'
    if (!plan.time) next.time = 'Tell me when I should steal you away.'
    if (!plan.place) next.place = 'Choose where our story continues.'
    if (plan.place === 'Something else' && !plan.customPlace.trim()) {
      next.customPlace = 'Tell me your dream destination.'
    }
    if (!plan.foods.length) next.foods = 'Every good date needs at least one snack.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (submitting || !validate()) return
    setSubmitting(true)
    window.setTimeout(onComplete, 520)
  }

  return (
    <main className="screen planner-screen">
      <BrandMark step={2} />
      <header className="screen-heading">
        <span className="eyebrow">OFFICIAL DATE PLANNING DEPARTMENT™</span>
        <h1>Okayyy… it’s a date! <span aria-hidden="true">🥹💗</span></h1>
        <p>Now let’s plan our little adventure.</p>
      </header>

      <div className="planner-layout">
        <form className="planner-form" onSubmit={submit} noValidate>
          <fieldset className="form-section two-column-fields">
            <legend><span>01</span> The essentials</legend>
            <label className="field-label">
              <span>When are you free, pretty girl? 📅</span>
              <input
                type="date"
                value={plan.date}
                min={minDate}
                onChange={(event) => update('date', event.target.value)}
                aria-invalid={Boolean(errors.date)}
                aria-describedby={errors.date ? 'date-error' : undefined}
              />
              <FieldError id="date-error">{errors.date}</FieldError>
            </label>
            <label className="field-label">
              <span>What time should I steal you away? ⏰</span>
              <input
                type="time"
                value={plan.time}
                onChange={(event) => update('time', event.target.value)}
                aria-invalid={Boolean(errors.time)}
                aria-describedby={errors.time ? 'time-error' : undefined}
              />
              <FieldError id="time-error">{errors.time}</FieldError>
            </label>
          </fieldset>

          <fieldset className="form-section">
            <legend><span>02</span> Where should we go? <small>📍</small></legend>
            <div className="choice-grid place-grid" role="radiogroup" aria-describedby={errors.place ? 'place-error' : undefined}>
              {PLACES.map(([place, emoji]) => (
                <button
                  className={`choice-card ${plan.place === place ? 'is-selected' : ''}`}
                  type="button"
                  role="radio"
                  aria-checked={plan.place === place}
                  key={place}
                  onClick={() => update('place', place)}
                >
                  <span className="choice-emoji">{emoji}</span>
                  <span>{place}</span>
                  <span className="choice-check" aria-hidden="true">✓</span>
                </button>
              ))}
            </div>
            <FieldError id="place-error">{errors.place}</FieldError>
            {plan.place === 'Something else' && (
              <label className="field-label custom-place-field">
                <span>Tell me where you’re dreaming of ✨</span>
                <input
                  type="text"
                  value={plan.customPlace}
                  placeholder="Your perfect place…"
                  onChange={(event) => update('customPlace', event.target.value)}
                  aria-invalid={Boolean(errors.customPlace)}
                  aria-describedby={errors.customPlace ? 'custom-place-error' : undefined}
                />
                <FieldError id="custom-place-error">{errors.customPlace}</FieldError>
              </label>
            )}
          </fieldset>

          <fieldset className="form-section">
            <legend><span>03</span> What are we eating? <small>😋</small></legend>
            <p className="legend-note">Choose as many as your heart desires.</p>
            <div className="food-grid" aria-describedby={errors.foods ? 'food-error' : undefined}>
              {FOODS.map(([food, emoji]) => (
                <label className={`food-chip ${plan.foods.includes(food) ? 'is-selected' : ''}`} key={food}>
                  <input
                    type="checkbox"
                    checked={plan.foods.includes(food)}
                    onChange={() => toggleFood(food)}
                  />
                  <span>{emoji}</span> {food}
                </label>
              ))}
            </div>
            <FieldError id="food-error">{errors.foods}</FieldError>
          </fieldset>

          <fieldset className="form-section">
            <legend><span>04</span> One last thing</legend>
            <label className="field-label">
              <span>Any special demands, princess? 👑 <em>optional</em></span>
              <textarea
                value={plan.message}
                maxLength={180}
                rows={4}
                placeholder={'“I expect flowers…” 👀'}
                onChange={(event) => update('message', event.target.value)}
              />
              <small className="character-count">{plan.message.length}/180</small>
            </label>
          </fieldset>

          <button className="button primary-cta" type="submit" disabled={submitting}>
            {submitting ? 'Sealing the plan… 💌' : 'LOCK IN OUR DATE 💗'}
            {!submitting && <span aria-hidden="true">→</span>}
          </button>
        </form>

        <aside className="summary-column" aria-label="Your date preview">
          <DateSummary plan={plan} />
        </aside>
      </div>
    </main>
  )
}

function ContributionScreen({ plan, onContinue }: { plan: DatePlan; onContinue: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState('')
  const [qrFailed, setQrFailed] = useState(false)
  const revealUrl = useMemo(() => `${window.location.origin}${pathForScreen('reveal')}`, [])

  useEffect(() => {
    let active = true
    QRCode.toDataURL(revealUrl, {
      width: 520,
      margin: 3,
      errorCorrectionLevel: 'M',
      color: { dark: '#351321', light: '#fffdf9' },
    })
      .then((url) => {
        if (active) setQrDataUrl(url)
      })
      .catch(() => {
        if (active) setQrFailed(true)
      })
    return () => { active = false }
  }, [revealUrl])

  return (
    <main className="screen contribution-screen">
      <BrandMark step={3} />
      <div className="contribution-layout">
        <section className="contribution-copy">
          <span className="eyebrow">RELATIONSHIP FINANCE DEPARTMENT™</span>
          <div className="perfect-stamp" aria-hidden="true">PERFECT! <span>♥</span></div>
          <h1>One tiny thing… <span aria-hidden="true">😌</span></h1>
          <p className="contribution-lead">As per our highly professional relationship agreement, a <strong>50% contribution</strong> is required. 😂</p>
          <DateSummary plan={plan} compact />
          <div className="fake-notice">
            <span aria-hidden="true">ⓘ</span>
            <p><strong>A playful demo — not a real payment.</strong><br />No money, account, or payment information is requested.</p>
          </div>
        </section>

        <section className="qr-card" aria-labelledby="qr-title">
          <div className="qr-card-topline"><span>YOUR CONTRIBUTION</span><strong>50%</strong></div>
          <div className="qr-divider" />
          <h2 id="qr-title">Scan to pay your 50% <span aria-hidden="true">💸</span></h2>
          <button className="qr-button" type="button" onClick={onContinue} aria-label="Open the romantic reveal">
            {qrDataUrl && <img src={qrDataUrl} alt={`QR code linking to ${revealUrl}`} />}
            {!qrDataUrl && !qrFailed && <div className="qr-placeholder" aria-label="Generating QR code"><span /></div>}
            {qrFailed && <div className="qr-error">QR took the day off 💗<small>Use the button below instead.</small></div>}
            <span className="qr-heart" aria-hidden="true">♥</span>
          </button>
          <p className="serious-copy">Definitely a very serious payment request. <span>👀</span></p>
          <button className="button primary-cta qr-continue" type="button" onClick={onContinue}>
            I’VE SCANNED IT 👀 <span aria-hidden="true">→</span>
          </button>
          <p className="qr-fallback">On a phone? Tap the QR or the button — both lead to the same surprise.</p>
        </section>
      </div>
    </main>
  )
}

function Envelope({ isOpen, onOpen }: { isOpen: boolean; onOpen: () => void }) {
  return (
    <button
      className={`envelope-button ${isOpen ? 'is-open' : ''}`}
      type="button"
      onClick={onOpen}
      disabled={isOpen}
      aria-label={isOpen ? 'Love letter opened' : 'Open my love letter'}
    >
      <span className="envelope-shadow" />
      <span className="envelope-back" />
      <span className="letter-peek">
        <span>for my favorite person</span>
        <i>♥</i>
      </span>
      <span className="envelope-flap" />
      <span className="envelope-front" />
      <span className="wax-seal">♥</span>
    </button>
  )
}

function RevealScreen({ onRestart }: { onRestart: () => void }) {
  const [open, setOpen] = useState(false)
  const [loved, setLoved] = useState(false)

  return (
    <main className={`screen reveal-screen ${open ? 'letter-is-open' : ''}`}>
      <BrandMark step={4} />
      <div className="reveal-intro">
        <span className="eyebrow">PAYMENT DECLINED: GIRLFRIEND TOO PRECIOUS</span>
        {!open && (
          <>
            <h1>You’ve received a message…</h1>
            <p>There’s something I’ve been meaning to tell you.</p>
          </>
        )}
      </div>

      <div className="envelope-stage">
        <Envelope isOpen={open} onOpen={() => setOpen(true)} />
        {!open && <button className="open-letter-copy" type="button" onClick={() => setOpen(true)}>OPEN MY LETTER <span>💌</span></button>}
      </div>

      <article className="love-letter" aria-hidden={!open}>
        <div className="letter-pin" aria-hidden="true">♥</div>
        <p className="letter-overline">A VERY IMPORTANT NOTE</p>
        <h1>I LOVE YOU <span aria-hidden="true">❤️</span></h1>
        <div className="letter-ornament" aria-hidden="true"><span />♥<span /></div>
        <div className="letter-body">
          <p className="salutation">My love,</p>
          <p>Did you really think I’d make you pay for our date? <span aria-hidden="true">😭💗</span></p>
          <p className="letter-highlight">You don’t have to pay anything, my wifey.</p>
          <p>Your only contribution is showing up, looking cute, eating good food with me, laughing with me, and giving me your time.</p>
          <p>That’s more than enough.</p>
          <p className="date-on-me">The date is on me. <span aria-hidden="true">❤️</span></p>
          <p>I love you.<br />Now get ready for our date, pretty girl. <span aria-hidden="true">🌷💗</span></p>
          <p className="signature">— Yours, always <span>♥</span></p>
        </div>
        <button className="button primary-cta love-button" type="button" onClick={() => setLoved(true)} disabled={loved}>
          {loved ? 'BEST DECISION EVER. 😌❤️' : 'I LOVE YOU TOO 💗'}
        </button>
        <button className="start-over" type="button" onClick={onRestart}>Replay our little story ↺</button>
      </article>
      <HeartBurst active={open || loved} large />
    </main>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(() => routeFromPath(window.location.pathname))
  const { plan, setPlan, acceptProposal, reset } = useLocalDatePlan()

  const navigate = (next: Screen, replace = false) => {
    const path = pathForScreen(next)
    if (replace) window.history.replaceState({ screen: next }, '', path)
    else window.history.pushState({ screen: next }, '', path)
    setScreen(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    const onPopState = () => setScreen(routeFromPath(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const onYes = () => {
    acceptProposal()
    navigate('plan')
  }

  const restart = () => {
    reset()
    navigate('proposal')
  }

  return (
    <div className={`app app-${screen}`}>
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <BackgroundDecor />
      <div id="main-content" tabIndex={-1}>
        {screen === 'proposal' && <ProposalScreen onYes={onYes} />}
        {screen === 'plan' && <DatePlanner plan={plan} setPlan={setPlan} onComplete={() => navigate('contribution')} />}
        {screen === 'contribution' && <ContributionScreen plan={plan} onContinue={() => navigate('reveal')} />}
        {screen === 'reveal' && <RevealScreen onRestart={restart} />}
      </div>
    </div>
  )
}
