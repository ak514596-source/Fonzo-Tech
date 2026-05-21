import { ShieldCheck, Truck, RotateCcw, Headphones, Mail, Phone, MapPin, CheckCircle2 } from "lucide-react";
import { FonzoLogo } from "@/components/brand/logo";

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16" data-testid="page-about">
      <header className="mb-12">
        <FonzoLogo size={36} />
        <h1 className="font-display text-3xl lg:text-4xl font-bold tracking-tight mt-6 max-w-2xl">
          Built for people who want premium tech without the premium markup.
        </h1>
        <p className="text-base text-muted-foreground mt-4 max-w-2xl leading-relaxed">
          Fonzo Tech is an independent UK retailer at{" "}
          <span className="font-mono text-foreground">fonzotech.co.uk</span>. We source verified
          consumer electronics — sealed and certified pre-owned — from trusted channels, then put
          every device through a 30-point engineer inspection before listing. Plain, honest,
          warranty-backed.
        </p>
      </header>

      <section id="warranty" className="grid sm:grid-cols-2 gap-4 mb-12">
        <Card icon={ShieldCheck} title="12-month Fonzo warranty">
          Every device sold ships with our own 12-month warranty. If something goes wrong, we
          repair, replace or refund — no quibbles.
        </Card>
        <Card icon={RotateCcw} title="14-day returns, no fees">
          Change your mind within 14 days and we'll cover return shipping. Devices are inspected
          on return and refunded to your original payment method.
        </Card>
        <Card icon={Truck} title="Fast UK delivery & collection" id="delivery">
          Free tracked UK delivery on orders over £100. Or collect from our verification hub —
          you'll see your device tested in front of you before you take it home.
        </Card>
        <Card icon={Headphones} title="Real human support">
          UK-based humans, 7 days a week. Email or call us — most questions are answered the
          same day.
        </Card>
      </section>

      <section className="rounded-2xl border border-card-border bg-card p-6 lg:p-10 mb-12" data-testid="section-verification">
        <h2 className="font-display text-xl lg:text-2xl font-bold tracking-tight">The Fonzo 30-point check</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
          Before any device gets listed at fonzotech.co.uk, it passes through this checklist. We
          publish the inspection certificate inside every box.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 mt-6">
          {[
            "IMEI & serial verification",
            "Battery health diagnostics",
            "Display dead-pixel scan",
            "Touch & multitouch test",
            "Front & rear camera capture",
            "Microphone & speaker tone test",
            "Wi-Fi & Bluetooth pairing",
            "GPS / cellular signal lock",
            "Fast-charge & USB-C handshake",
            "Face/Touch ID enrolment",
            "Factory wipe & OS install",
            "Cosmetic grading review",
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-sm py-1.5">
              <CheckCircle2 className="h-4 w-4 text-brand-accent shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="contact" className="rounded-2xl bg-primary text-primary-foreground p-6 lg:p-10" data-testid="section-contact">
        <h2 className="font-display text-xl lg:text-2xl font-bold tracking-tight">Talk to a human</h2>
        <p className="text-sm opacity-80 mt-2 max-w-xl">
          Got a question about a device, an order, or a trade-in? Reach our UK team directly.
        </p>
        <div className="grid sm:grid-cols-3 gap-4 mt-6 text-sm">
          <ContactRow icon={Mail} label="Email" value="support@fonzotech.co.uk" />
          <ContactRow icon={Phone} label="Phone" value="0800 123 4567" />
          <ContactRow icon={MapPin} label="Address" value="Fonzo Tech, United Kingdom" />
        </div>
      </section>
    </div>
  );
}

function Card({ icon: Icon, title, id, children }: { icon: any; title: string; id?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="rounded-xl border border-card-border bg-card p-5">
      <div className="h-9 w-9 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center mb-3">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="font-display font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{children}</p>
    </div>
  );
}

function ContactRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className="h-4 w-4 mt-0.5 opacity-80" />
      <div>
        <p className="text-xs uppercase tracking-wider opacity-70">{label}</p>
        <p className="font-mono text-sm">{value}</p>
      </div>
    </div>
  );
}
