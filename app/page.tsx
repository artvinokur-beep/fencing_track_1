import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: 24, fontFamily: 'Arial, sans-serif' }}>
      <h1>Fencing Utilities</h1>
      <p>
        Open the pool scout tool at <Link href="/pool-scout">/pool-scout</Link>.
      </p>
    </main>
  );
}
