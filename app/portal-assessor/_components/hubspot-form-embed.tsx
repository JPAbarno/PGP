"use client";
import Script from "next/script";

export function HubspotFormEmbed() {
  return (
    <>
      <Script
        src="https://js.hsforms.net/forms/embed/4369819.js"
        strategy="afterInteractive"
      />
      <div
        className="hs-form-frame"
        data-region="na1"
        data-form-id="07989d6e-a041-4d4d-a4b0-2e52017a9405"
        data-portal-id="4369819"
      />
    </>
  );
}
