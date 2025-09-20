import BookingClient from '@/components/custom/BookingClient';

type Params = { params: { country: string; slug: string } }; 

export default async function Page({ params }: Params) {
  const { country, slug } = params;
  const decodedCountry = decodeURIComponent(country || '');

  // fetch package server-side (SSR)
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/packages/?destination=${encodeURIComponent(decodedCountry)}&slug=${encodeURIComponent(slug)}`,
    { next: { revalidate: 60 } } // cache for 60s; adjust if needed
  );

  if (!res.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Package not found.</p>
      </div>
    );
  }

  const json = await res.json();
  const pkg = json?.data?.[0] ?? null;

  if (!pkg) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Package not found.</p>
      </div>
    );
  }

  return (
    <BookingClient pkg={pkg} />
  );
}