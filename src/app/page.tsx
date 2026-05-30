export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold mb-4">Dienstagskicken</h1>
      <p className="text-lg text-gray-600">
        Fußball-Tracker für den Verein Weißkirchen
      </p>
      <div className="mt-8 flex gap-4">
        <span
          className="px-4 py-2 rounded text-white font-semibold"
          style={{ backgroundColor: "var(--rot)" }}
        >
          Rot
        </span>
        <span
          className="px-4 py-2 rounded text-white font-semibold"
          style={{ backgroundColor: "var(--gelb)" }}
        >
          Gelb
        </span>
      </div>
    </main>
  );
}
