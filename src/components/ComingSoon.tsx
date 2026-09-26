export default function ComingSoon({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <>
      <h1 className="text-xl font-bold">{title}</h1>
      <div className="card mt-4 text-sm text-slate-600">{children}</div>
    </>
  );
}
