import Link from 'next/link';
import { LinkButton } from '@/components/ui/link-button';
import { DemoBanner } from '@/components/wallet/demo-banner';
import {
  ArrowRight,
  Smartphone,
  Zap,
  Shield,
  Globe,
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <DemoBanner />

      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-2xl font-bold">
            <span className="text-emerald-600">Eastern</span>Block
          </Link>
          <div className="flex items-center gap-3">
            <LinkButton variant="ghost" href="/login">Log in</LinkButton>
            <LinkButton href="/signup" className="bg-emerald-600 hover:bg-emerald-700">
              Get Started
            </LinkButton>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-emerald-50/80 to-background px-4 py-20 dark:from-emerald-950/20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border bg-background px-4 py-1.5 text-sm">
              🇿🇲 Built for Zambia
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
              Bitcoin made simple for{' '}
              <span className="text-emerald-600">Zambia</span>
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
              Buy, send, receive and spend Bitcoin through Lightning using a simple
              Zambian wallet.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <LinkButton size="lg" href="/signup" className="h-12 bg-emerald-600 px-8 hover:bg-emerald-700">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </LinkButton>
              <LinkButton size="lg" variant="outline" href="/login" className="h-12 px-8">
                Explore Demo
              </LinkButton>
            </div>
          </div>
        </section>

        {/* Demo notice */}
        <section className="border-y bg-amber-50 px-4 py-8 dark:bg-amber-950/20">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-lg font-semibold text-amber-800 dark:text-amber-200">
              DEMO MODE
            </h2>
            <p className="mt-2 text-sm text-amber-700 dark:text-amber-300">
              This is a demonstration application. No real money or Bitcoin is being
              transferred. All payment methods are planned integrations.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-bold">How EasternBlock works</h2>
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  step: '1',
                  title: 'Add ZMW',
                  desc: 'Choose a supported payment method.',
                  icon: Smartphone,
                },
                {
                  step: '2',
                  title: 'Buy Bitcoin',
                  desc: 'Convert ZMW into Bitcoin.',
                  icon: Zap,
                },
                {
                  step: '3',
                  title: 'Send instantly',
                  desc: 'Send Bitcoin using Lightning.',
                  icon: Globe,
                },
                {
                  step: '4',
                  title: 'Spend anywhere',
                  desc: 'Pay merchants using Lightning.',
                  icon: Shield,
                },
              ].map((item) => (
                <div key={item.step} className="rounded-2xl border p-6 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-xs font-medium text-emerald-600">
                    Step {item.step}
                  </p>
                  <h3 className="mt-1 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Payment methods */}
        <section className="bg-muted/30 px-4 py-20">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-center text-3xl font-bold">Payment methods</h2>
            <p className="mx-auto mt-3 max-w-lg text-center text-muted-foreground">
              Planned integrations for Zambia&apos;s most popular payment options
            </p>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                'MTN Mobile Money',
                'Airtel Money',
                'Zamtel Money',
                'Bank Account',
                'Visa',
              ].map((method) => (
                <div
                  key={method}
                  className="flex items-center justify-between rounded-xl border bg-background p-5"
                >
                  <span className="font-medium">{method}</span>
                  <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                    Planned
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-4 py-20">
          <div className="mx-auto max-w-2xl rounded-2xl bg-emerald-600 p-10 text-center text-white">
            <h2 className="text-2xl font-bold">Ready to try EasternBlock?</h2>
            <p className="mt-3 text-emerald-100">
              Create a free demo account and explore Bitcoin Lightning for Zambia.
            </p>
            <LinkButton
              size="lg"
              href="/signup"
              className="mt-6 bg-white text-emerald-700 hover:bg-emerald-50"
            >
              Create Demo Account
            </LinkButton>
          </div>
        </section>
      </main>

      <footer className="border-t px-4 py-8 text-center text-sm text-muted-foreground">
        <p>
          <strong>EasternBlock</strong> — Bitcoin made simple for Zambia.
        </p>
        <p className="mt-1">Demo application. Not authorized for real financial services.</p>
      </footer>
    </div>
  );
}
