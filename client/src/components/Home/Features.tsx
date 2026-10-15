import { CreditCard, ShieldCheck, Sparkles, Truck } from "lucide-react";

export default function Features() {
  return (
      <section className="border-b bg-card/50">
        <div className="container py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Truck, label: "Fast Delivery", desc: "All over Bangladesh" },
              { icon: ShieldCheck, label: "Quality Assured", desc: "Premium fabrics" },
              { icon: CreditCard, label: "Cash on Delivery", desc: "Pay when received" },
              { icon: Sparkles, label: "Latest Trends", desc: "Updated weekly" },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 px-3 py-2">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
  );
}