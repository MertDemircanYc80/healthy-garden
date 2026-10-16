// Temporary screen placeholder. Delete it from a screen once that screen is built.
export function Placeholder({ title, owner, todo }: { title: string; owner: string; todo: string[] }) {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="rounded-2xl border border-dashed border-leaf p-4 text-sm">
        <p className="mb-2 text-muted">Not built yet — owner: {owner}</p>
        <ul className="list-disc space-y-1 pl-5">
          {todo.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
