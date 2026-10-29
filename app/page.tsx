"use client";

import { useEffect, useRef, useState } from "react";

type Facing = "environment" | "user";

// Shortest signed turn from current heading to target, in degrees (-180..180).
// Positive = turn right (clockwise), negative = turn left.
function headingDelta(target: number, current: number) {
  return ((target - current + 540) % 360) - 180;
}

// Compass direction the BACK of the phone points to, from the three
// orientation angles. Works when the phone is held upright, which
// reading "alpha" alone does not.
function cameraHeading(alpha: number, beta: number, gamma: number) {
  const rad = Math.PI / 180;
  const a = alpha * rad;
  const b = beta * rad;
  const g = gamma * rad;
  const rA = -Math.cos(a) * Math.sin(g) - Math.sin(a) * Math.sin(b) * Math.cos(g);
  const rB = -Math.sin(a) * Math.sin(g) + Math.cos(a) * Math.sin(b) * Math.cos(g);
  const deg = Math.atan2(rA, rB) / rad;
  return (deg + 360) % 360;
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>("environment");
  const [error, setError] = useState("");
  const [heading, setHeading] = useState<number | null>(null);
  const [tilt, setTilt] = useState<number | null>(null);
  const [target, setTarget] = useState<number | null>(null);

  // Camera
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

  // Compass and tilt sensors
  useEffect(() => {
    function onOrientation(e: DeviceOrientationEvent) {
      if (e.alpha === null || e.beta === null || e.gamma === null) return;
      setHeading(cameraHeading(e.alpha, e.beta, e.gamma));
      setTilt(e.beta - 90); // 0 = upright, positive = camera looking up
    }
    // "absolute" = relative to real north (Chrome on Android)
    window.addEventListener("deviceorientationabsolute", onOrientation as EventListener);
    return () => {
      window.removeEventListener("deviceorientationabsolute", onOrientation as EventListener);
    };
  }, []);

  const delta =
    heading !== null && target !== null ? headingDelta(target, heading) : null;
  const onTarget = delta !== null && Math.abs(delta) < 5;

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

      <div className="w-full max-w-md rounded-xl bg-neutral-900 p-4 text-center">
        {heading === null ? (
          <p className="text-neutral-400">No sensor data yet (open this on your phone)</p>
        ) : (
          <>
            <p>Heading: {heading.toFixed(0)}°</p>
            <p>Tilt: {tilt?.toFixed(0)}° (positive = looking up)</p>
          </>
        )}

        <button
          onClick={() => heading !== null && setTarget(heading)}
          className="mt-3 rounded-full bg-emerald-500 px-4 py-2 font-medium text-black"
        >
          Set target direction here
        </button>

        {delta !== null && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <div
              className="text-6xl"
              style={{ transform: `rotate(${delta}deg)`, transition: "transform 0.1s" }}
            >
              {onTarget ? "✅" : "⬆️"}
            </div>
            <p>
              {onTarget
                ? "On target!"
                : `Turn ${delta > 0 ? "right" : "left"} ${Math.abs(delta).toFixed(0)}°`}
            </p>
          </div>
        )}
      </div>

      {error && <p className="text-red-400">{error}</p>}
    </main>
  );
}