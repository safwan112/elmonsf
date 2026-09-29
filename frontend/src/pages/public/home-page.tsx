import {
  ArrowLeft,
  BookOpen,
  ChartLine,
  CirclePlay,
  Layers,
  Lock,
  Smartphone,
  Sparkles,
  Target,
  Timer,
  UserRound,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'
import { Seo } from '@/components/common/seo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useCurrentUser } from '@/features/auth/use-auth'
import { config } from '@/lib/config'

const features: { icon: LucideIcon; title: string; text: string }[] = [
  {
    icon: CirclePlay,
    title: 'دروس مسجّلة مركّزة',
    text: 'شروحات قصيرة تذهب مباشرة إلى الفكرة، مع أمثلة محلولة خطوة بخطوة يمكنك إعادتها متى شئت.',
  },
  {
    icon: Layers,
    title: 'بنك أسئلة متدرّج',
    text: 'أسئلة مصنّفة على خمسة مستويات صعوبة، تبدأ بك من الأساس وتصل بك إلى مستوى الاختبار الفعلي.',
  },
  {
    icon: Timer,
    title: 'اختبارات محاكية',
    text: 'تدرّب تحت ضغط الوقت نفسه وبنفس توزيع الأقسام، لتدخل يوم الاختبار بثقة وهدوء.',
  },
  {
    icon: ChartLine,
    title: 'تحليل فوري للأداء',
    text: 'بعد كل محاولة تعرف أين أخطأت ولماذا، مع حلول مشروحة وتوصيات لما يجب أن تراجعه.',
  },
  {
    icon: Smartphone,
    title: 'مصمّمة للجوال أولاً',
    text: 'تجربة سلسة على أي جهاز، لتستثمر أوقات الانتظار القصيرة في حل بضعة أسئلة.',
  },
  {
    icon: Lock,
    title: 'دفع آمن واشتراك واضح',
    text: 'أسعار شفافة ومدة وصول محددة لكل باقة، مع فاتورة إلكترونية فور إتمام الدفع.',
  },
]

const steps = [
  { title: 'أنشئ حسابك', text: 'سجّل مجاناً خلال أقل من دقيقة.' },
  { title: 'اختر باقتك', text: 'حدّد المسار والمدة التي تناسب موعد اختبارك.' },
  { title: 'تدرّب بخطة', text: 'شاهد الدروس ثم ثبّت الفهم ببنك الأسئلة.' },
  { title: 'قِس تقدّمك', text: 'اختبارات محاكية تكشف جاهزيتك قبل الموعد.' },
]

const tracks: { icon: LucideIcon; title: string; parts: string[]; text: string }[] = [
  {
    icon: Target,
    title: 'القدرات العامة',
    parts: ['كمّي', 'لفظي'],
    text: 'استراتيجيات حل سريعة للمسائل الكمية، وتدريب مكثّف على التناظر اللفظي وإكمال الجمل والاستيعاب.',
  },
  {
    icon: BookOpen,
    title: 'التحصيلي',
    parts: ['رياضيات', 'فيزياء', 'كيمياء', 'أحياء'],
    text: 'مراجعة مركّزة لأهم مفاهيم المرحلة الثانوية، مع أسئلة تحاكي نمط الاختبار وتوزيع درجاته.',
  },
]

/** Decorative dashboard preview for the hero (not real data). */
function HeroPreview() {
  const levels = [92, 78, 64, 41, 22]

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-md">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-gradient-to-br from-primary/25 via-accent/20 to-transparent blur-2xl" />
      <div className="rounded-2xl border bg-card p-5 shadow-lift">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">مستوى الجاهزية</p>
            <p className="text-lg font-bold">اختبار محاكٍ — كمّي</p>
          </div>
          <div className="relative size-16">
            <svg viewBox="0 0 36 36" className="size-16 -rotate-90">
              <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="4" className="stroke-muted" />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="97.4"
                strokeDashoffset="22"
                className="stroke-primary"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">78%</span>
          </div>
        </div>
        <div className="mt-5 grid gap-3">
          {levels.map((value, i) => (
            <div key={i} className="grid grid-cols-[4.5rem_1fr] items-center gap-3 text-xs">
              <span className="text-muted-foreground">المستوى {i + 1}</span>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${value}%`, opacity: 1 - i * 0.12 }} />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center gap-3 rounded-xl bg-accent-soft p-3 text-sm">
          <Sparkles className="size-5 shrink-0 text-accent-foreground dark:text-accent" />
          <span>راجع «النسب والتناسب» قبل محاولتك القادمة.</span>
        </div>
      </div>
    </div>
  )
}

export function HomePage() {
  const { isAuthenticated } = useCurrentUser()

  return (
    <>
      <Seo
        jsonLd={[
          {
            '@context': 'https://schema.org',
            '@type': 'EducationalOrganization',
            name: config.appName,
            url: config.siteUrl,
            logo: `${config.siteUrl}/favicon.svg`,
          },
          {
            '@context': 'https://schema.org',
            '@type': 'WebSite',
            name: config.appName,
            url: config.siteUrl,
            inLanguage: 'ar',
          },
        ]}
      />

      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden">
        <div className="bg-lattice pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
        <div className="container-page relative grid items-center gap-12 py-14 sm:py-20 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6 text-center lg:text-start">
            <Badge variant="accent" className="mx-auto lg:mx-0">
              <Sparkles />
              تدريب ذكي بخطة واضحة
            </Badge>
            <h1 className="text-4xl leading-[1.25] font-bold sm:text-5xl lg:text-[3.4rem]">
              ارتقِ بدرجتك في <span className="text-primary">القدرات والتحصيلي</span> خطوة بخطوة
            </h1>
            <p className="mx-auto max-w-xl text-lg text-muted-foreground lg:mx-0">
              دروس مركّزة، وبنك أسئلة متدرّج، واختبارات محاكية تقيس جاهزيتك بدقة — كل ما تحتاجه للوصول إلى ذروة أدائك في
              مكان واحد.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row lg:justify-start">
              <Button asChild size="lg">
                <Link to={isAuthenticated ? '/dashboard' : '/register'}>
                  {isAuthenticated ? 'انتقل إلى لوحتك' : 'ابدأ مجاناً'}
                  <ArrowLeft />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/#how-it-works">كيف تعمل المنصة؟</Link>
              </Button>
            </div>
          </div>
          <HeroPreview />
        </div>
      </section>

      {/* ---- Tracks ---- */}
      <section aria-labelledby="tracks-title" className="container-page py-14">
        <h2 id="tracks-title" className="sr-only">
          مسارات التدريب
        </h2>
        <div className="grid gap-5 md:grid-cols-2">
          {tracks.map(({ icon: Icon, title, parts, text }) => (
            <article key={title} className="rounded-2xl border bg-card p-6 shadow-soft transition-shadow hover:shadow-lift">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <h3 className="text-xl font-bold">{title}</h3>
              </div>
              <p className="mt-4 leading-8 text-muted-foreground">{text}</p>
              <ul className="mt-5 flex flex-wrap gap-2">
                {parts.map((part) => (
                  <li key={part}>
                    <Badge variant="secondary">{part}</Badge>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {/* ---- Features ---- */}
      <section id="features" aria-labelledby="features-title" className="bg-card/60 py-16 sm:py-20">
        <div className="container-page">
          <div className="mx-auto max-w-2xl text-center">
            <h2 id="features-title" className="text-3xl font-bold sm:text-4xl">
              لماذا ذروة؟
            </h2>
            <p className="mt-4 text-muted-foreground">
              صمّمنا كل جزء من المنصة ليخدم هدفاً واحداً: أن تفهم أكثر، وتتدرّب أذكى، وتعرف مستواك الحقيقي قبل يوم الاختبار.
            </p>
          </div>
          <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-2xl border bg-background p-6">
                <span className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent-foreground dark:text-accent">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section id="how-it-works" aria-labelledby="how-title" className="container-page py-16 sm:py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="how-title" className="text-3xl font-bold sm:text-4xl">
            أربع خطوات نحو هدفك
          </h2>
          <p className="mt-4 text-muted-foreground">رحلة واضحة من التسجيل حتى الجاهزية الكاملة.</p>
        </div>
        <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <li key={step.title} className="relative rounded-2xl border bg-card p-6">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-primary-foreground">
                {i + 1}
              </span>
              <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* ---- CTA ---- */}
      {!isAuthenticated && (
        <section className="container-page pb-20">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-12">
            <div className="bg-lattice pointer-events-none absolute inset-0 opacity-20" aria-hidden="true" />
            <div className="relative mx-auto max-w-2xl space-y-5">
              <h2 className="text-3xl font-bold">جاهز لتبدأ؟</h2>
              <p className="text-primary-foreground/85">أنشئ حسابك الآن مجاناً، واستكشف المنصة قبل أن تختار باقتك.</p>
              <Button asChild size="lg" variant="accent">
                <Link to="/register">
                  <UserRound />
                  أنشئ حسابك المجاني
                </Link>
              </Button>
            </div>
          </div>
        </section>
      )}
    </>
  )
}
