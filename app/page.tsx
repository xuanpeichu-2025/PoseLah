"use client";

import { useEffect, useRef, useState } from "react";

type Facing = "environment" | "user";

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>("environment");
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setError("");
      } catch (e) {
        setError("Could not open the camera: " + (e as Error).message);
      }
    }

    start();

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [facing]);

  return (
    <main className="flex min-h-screen flex-col items-center gap-4 bg-black p-4 text-white">
      <h1 className="text-xl font-bold">PoseLah 📸</h1>

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full max-w-md rounded-xl bg-neutral-900"
        style={{ transform: facing === "user" ? "scaleX(-1)" : "none" }}
      />

      <button
        onClick={() => setFacing(facing === "user" ? "environment" : "user")}
        className="rounded-full bg-white px-5 py-2 font-medium text-black"
      >
        Switch to {facing === "user" ? "back" : "front"} camera
      </button>

      {error && <p className="text-red-400">{error}</p>}
    </main>
  );
}