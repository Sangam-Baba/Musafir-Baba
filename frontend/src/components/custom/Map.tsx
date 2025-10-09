"use client";
declare global {
  interface Window {
    google: typeof google;
  }
}
import { useEffect, useRef } from "react";
import { Loader } from "@googlemaps/js-api-loader";

function Map({ address }: { address: string }) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string,
      version: "weekly",
    });

    loader.load().then(() => {
      if (!mapRef.current) return;

      const geocoder = new google.maps.Geocoder();

      geocoder.geocode({ address }, (results, status) => {
        if (status === "OK" && results[0]) {
          const map = new google.maps.Map(mapRef.current, {
            center: results[0].geometry.location,
            zoom: 8,
          });

          new google.maps.Marker({
            map,
            position: results[0].geometry.location,
          });
        } else {
          console.error("Geocode error:", status);
        }
      });
    });
  }, [address]);

  return <div ref={mapRef} style={{ height: "100%", width: "100%" }} />;
}

export default Map;
