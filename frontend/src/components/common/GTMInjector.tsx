"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

export default function GTMInjector() {
  const [loadGTM, setLoadGTM] = useState(false);

  useEffect(() => {
    // If GTM is already loaded, do nothing
    if (loadGTM) return;

    const handleInteraction = () => {
      setLoadGTM(true);
      // Clean up event listeners after first interaction
      window.removeEventListener("scroll", handleInteraction);
      window.removeEventListener("mousemove", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };

    window.addEventListener("scroll", handleInteraction, { passive: true });
    window.addEventListener("mousemove", handleInteraction, { passive: true });
    window.addEventListener("touchstart", handleInteraction, { passive: true });
    window.addEventListener("keydown", handleInteraction, { passive: true });

    // Fallback: load GTM after 5 seconds if no interaction
    const timeout = setTimeout(() => {
      handleInteraction();
    }, 5000);

    return () => {
      window.removeEventListener("scroll", handleInteraction);
      window.removeEventListener("mousemove", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
      clearTimeout(timeout);
    };
  }, [loadGTM]);

  if (!loadGTM) return null;

  return (
    <>
      <Script
        id="gtm-script"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-KW5RGQR6');`,
        }}
      />
      <noscript>
        <iframe
          src="https://www.googletagmanager.com/ns.html?id=GTM-KW5RGQR6"
          height="0"
          width="0"
          style={{ display: "none", visibility: "hidden" }}
        ></iframe>
      </noscript>
    </>
  );
}
