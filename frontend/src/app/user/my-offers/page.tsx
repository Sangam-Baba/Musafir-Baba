"use client";

import type React from "react";

import { useQuery } from "@tanstack/react-query";
import { getAllOffers } from "@/app/(user)/holidays/customised-tour-packages/[destination]/[pkgSlug]/[id]/page";
import { useAuthStore } from "@/store/useAuthStore";
import {
  IndianRupee,
  Tag,
  Percent,
  Sparkles,
  Clock,
  Copy,
  Check,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

interface Offer {
  _id: string;
  code: string;
  description: string;
  value: string;
  type: string;
}

function OfferPage() {
  const accessToken = useAuthStore((state) => state.accessToken) as string;
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { data: offers, isLoading } = useQuery({
    queryKey: ["user-offers"],
    queryFn: () => getAllOffers(accessToken),
  });

  const handleCopyCode = (code: string, e: React.MouseEvent) => {
    e.preventDefault();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-12">
        {/* Header Section */}
        <div className="mb-8 md:mb-12">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-6 h-6 text-primary" />
            <Badge variant="secondary" className="text-xs font-medium">
              Exclusive Deals
            </Badge>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3 text-balance">
            Your Special Offers
          </h1>
          <p className="text-muted-foreground text-base md:text-lg max-w-2xl text-pretty">
            Save on your next adventure with these exclusive promotional codes.
            Click any offer to start booking your dream holiday.
          </p>
        </div>

        {/* Offers Grid */}
        {!offers || offers.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Tag className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No offers available yet
              </h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Check back soon for exclusive deals and promotional codes on
                your favorite destinations.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:gap-6">
            {offers.map((offer: Offer) => (
              <Link
                href={`/holidays`}
                key={offer._id}
                className="group block transition-transform hover:scale-[1.01] focus:scale-[1.01] outline-none"
              >
                <Card className="border-2 hover:border-primary/50 transition-colors overflow-hidden h-full">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      {/* Left Section - Discount Display */}
                      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 md:p-8 md:w-64 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border">
                        <div className="text-center">
                          {offer.type === "FLAT" ? (
                            <>
                              <div className="flex items-center justify-center mb-2">
                                <IndianRupee className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                                <span className="text-4xl md:text-5xl font-bold text-primary">
                                  {offer.value}
                                </span>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                Flat Discount
                              </Badge>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center justify-center mb-2">
                                <span className="text-4xl md:text-5xl font-bold text-primary">
                                  {offer.value}
                                </span>
                                <Percent className="w-8 h-8 md:w-10 md:h-10 text-primary" />
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                Percentage Off
                              </Badge>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right Section - Offer Details */}
                      <div className="flex-1 p-6 md:p-8">
                        <div className="flex flex-col h-full justify-between gap-4">
                          <div>
                            <div className="flex items-start justify-between gap-4 mb-3">
                              <h3 className="text-xl md:text-2xl font-bold text-foreground group-hover:text-primary transition-colors">
                                Special Savings
                              </h3>
                              <Badge variant="outline" className="shrink-0">
                                <Clock className="w-3 h-3 mr-1" />
                                Limited
                              </Badge>
                            </div>
                            <p className="text-muted-foreground text-sm md:text-base leading-relaxed text-pretty">
                              {offer.description}
                            </p>
                          </div>

                          {/* Promo Code Section */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex-1 bg-muted/50 rounded-lg px-4 py-3 border border-border">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Tag className="w-4 h-4 text-muted-foreground shrink-0" />
                                  <span className="font-mono font-bold text-base md:text-lg text-foreground tracking-wide truncate">
                                    {offer.code}
                                  </span>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="shrink-0 h-8 px-3"
                                  onClick={(e) => handleCopyCode(offer.code, e)}
                                >
                                  {copiedCode === offer.code ? (
                                    <>
                                      <Check className="w-4 h-4 mr-1" />
                                      Copied
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-4 h-4 mr-1" />
                                      Copy
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                            <Button
                              variant="default"
                              className="sm:w-auto whitespace-nowrap"
                              asChild
                            >
                              <span>Book Now</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Footer Note */}
        {offers && offers.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Terms and conditions apply. Offers valid while supplies last.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default OfferPage;
