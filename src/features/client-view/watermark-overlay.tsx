"use client";

import { useEffect, useState } from "react";

type WatermarkProps = {
  clientName?: string | null;
  clientEmail?: string | null;
  brandName?: string | null;
};

export function WatermarkOverlay({ clientName, clientEmail, brandName }: WatermarkProps) {
  const [position, setPosition] = useState({ top: "10%", left: "10%" });
  const [opacity, setOpacity] = useState(0.15);

  useEffect(() => {
    // Reposition watermark every 20 seconds to prevent easy removal
    const interval = setInterval(() => {
      const top = Math.floor(Math.random() * 80) + 10; // 10% to 90%
      const left = Math.floor(Math.random() * 70) + 10; // 10% to 80%
      
      setPosition({ top: `${top}%`, left: `${left}%` });
      
      // Slight opacity shifts to prevent blending algorithms from easily removing it
      setOpacity(0.12 + Math.random() * 0.08); 
    }, 20000);

    return () => clearInterval(interval);
  }, []);

  const displayText = [
    clientName,
    clientEmail,
    brandName,
  ].filter(Boolean).join(" • ");

  if (!displayText) return null;

  return (
    <div
      className="pointer-events-none absolute z-50 transition-all duration-1000 ease-in-out text-white font-mono text-xs sm:text-sm whitespace-nowrap"
      style={{
        top: position.top,
        left: position.left,
        opacity: opacity,
        textShadow: "1px 1px 2px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.8)",
        transform: "rotate(-15deg)"
      }}
    >
      <p>{displayText}</p>
      <p className="opacity-70 mt-1">{new Date().toISOString()}</p>
    </div>
  );
}
