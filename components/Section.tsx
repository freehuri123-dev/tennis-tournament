export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-line py-5">
      <h2 className="text-xl font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}
