import SecondSection from "./SecondSection";

export default async function SecondSectionServer() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_BASE_URL}/counter/68e6549442582b78aea7c191`,
    { cache: "no-store" }
  );

  const data = await res.json();

  return <SecondSection initialCount={data.count} />;
}
