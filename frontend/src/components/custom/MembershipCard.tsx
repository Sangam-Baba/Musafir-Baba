"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Check, X, Sparkles } from "lucide-react";
import { Loader } from "./loader";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/useAuthStore";
import { useRouter } from "next/navigation";
import { AuthDialog } from "@/components/auth/AuthDialog";
import { useAuthDialogStore } from "@/store/useAuthDialogStore";

interface Membership {
  _id: string;
  name: string;
  price: number;
  duration: string;
  include: [{ item: string }];
  exclude: [{ item: string }];
  isActive: boolean;
  slug: string;
}

const getMembership = async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/membership`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) throw new Error("Failed to get membership");
  const data = await res.json();
  return data?.data;
};

function MembershipCard() {
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const router = useRouter();
  const { data, isLoading, isError, error } = useQuery<Membership[]>({
    queryKey: ["membership"],
    queryFn: getMembership,
  });

  const handleSubmit = (id: string) => {
    if (!accessToken) {
      useAuthDialogStore
        .getState()
        .openDialog("login", undefined, `/membership/${id}`);
      return;
    }
    router.push(`/membership/${id}`);
  };

  const featuredIndex = data && data.length === 3 ? 1 : -1;

  if (isLoading) return <Loader size="lg" message="Loading membership..." />;
  if (isError) return <h1>{(error as Error).message}</h1>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 px-4 py-8">
      {data?.map((membership: Membership, idx: number) => {
        const isFeatured = idx === featuredIndex;

        return (
          <Card
            key={idx}
            className={`relative h-full flex flex-col transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${
              isFeatured
                ? "border-2 border-primary shadow-xl scale-105 bg-gradient-to-b from-card to-secondary/20"
                : "border border-border hover:border-primary/50"
            }`}
          >
            {isFeatured && (
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                <div className="flex items-center gap-1.5 bg-primary text-primary-foreground px-4 py-1.5 rounded-full text-sm font-semibold shadow-lg">
                  <Sparkles className="w-4 h-4" />
                  Popular Choice
                </div>
              </div>
            )}

            <CardHeader className="pb-2 pt-4">
              <CardTitle className="flex flex-col items-center justify-center gap-4">
                <div className="text-center space-y-2">
                  <h3 className="text-3xl font-bold tracking-tight text-foreground">
                    {membership.name}
                  </h3>
                  <p className="text-sm text-muted-foreground uppercase tracking-wider font-medium">
                    {membership.duration.charAt(0).toUpperCase() +
                      membership.duration.slice(1)}{" "}
                    Plan
                  </p>
                </div>

                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-2xl font-semibold text-muted-foreground">
                    ₹
                  </span>
                  <span className="text-6xl font-bold text-primary tracking-tight">
                    {membership.price.toLocaleString()}
                  </span>
                </div>
              </CardTitle>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col gap-6 px-8">
              <div className="space-y-3 flex-1">
                {membership.include?.map((include, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 group transition-colors"
                  >
                    <div className="mt-0.5 shrink-0">
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />
                      </div>
                    </div>
                    <p className="text-foreground leading-relaxed text-base">
                      {include.item}
                    </p>
                  </div>
                ))}

                {membership.exclude?.map((exclude, i: number) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 opacity-60 group transition-opacity hover:opacity-80"
                  >
                    <div className="mt-0.5 shrink-0">
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center">
                        <X className="w-3.5 h-3.5 text-muted-foreground stroke-[3]" />
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed text-base line-through">
                      {exclude.item}
                    </p>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-border">
                <Button
                  className={`w-full h-12 text-base font-semibold transition-all duration-200 ${
                    isFeatured
                      ? "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl"
                      : "bg-primary hover:bg-primary/90 text-primary-foreground"
                  }`}
                  onClick={() => handleSubmit(membership._id)}
                >
                  Get Started
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
      <AuthDialog />
    </div>
  );
}

export default MembershipCard;
