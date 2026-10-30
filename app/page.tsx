"use client";

import { useEffect, useRef, useState } from "react";

type Facing = "environment" | "user";
type Target = { heading: number; tilt: number };
type Dir = "left" | "right" | "up" | "down";

const TOLERANCE = 5; // degrees allowed on each axis
const ARROWS_ON_FAR_SIDE = true; // false = arrow sits on the side it points to
const MIRROR_SELFIE_ARROWS = true; // false = show the camera's true left/right in selfie mode

const ROTATION: Record<Dir, number> = { right: 0, down: 90, left: 180, up: 270 };
const OPPOSITE: Record<Dir, Dir> = { left: "right", right: "left", up: "down", down: "up" };
const EDGE_POSITION: Record<Dir, string> = {
  left: "left-4 top-1/2 -translate-y-1/2",
  right: "right-4 top-1/2 -translate-y-1/2",
  up: "top-24 left-1/2 -translate-x-1/2",
  down: "bottom-40 left-1/2 -translate-x-1/2",
};

// Shortest signed turn from current to target (-180..180). + = turn right.
function headingDelta(target: number, current: number) {
  return ((target - current + 540) % 360) - 180;
}

// Compass direction the BACK of the phone points to.
function cameraHeading(alpha: number, beta: number, gamma: number) {
  const rad = Math.PI / 180;
  const a = alpha * rad;
  const b = beta * rad;
  const g = gamma * rad;
  const rA = -Math.cos(a) * Math.sin(g) - Math.sin(a) * Math.sin(b) * Math.cos(g);
  const rB = -Math.sin(a) * Math.sin(g) + Math.sin(b) * Math.cos(a) * Math.cos(g);
  const deg = Math.atan2(rA, rB) / rad;
  return (deg + 360) % 360;
}

function instruction(dYaw: number, dPitch: number) {
  const parts: string[] = [];
  if (Math.abs(dYaw) >= TOLERANCE)
    parts.push(`Turn ${dYaw > 0 ? "right" : "left"} ${Math.abs(dYaw).toFixed(0)}°`);
  if (Math.abs(dPitch) >= TOLERANCE)
    parts.push(`Tilt ${dPitch > 0 ? "up" : "down"} ${Math.abs(dPitch).toFixed(0)}°`);
  return parts.join("  ·  ");
}

// A thin white double chevron that points in `dir` and fades as `strength` drops.
function Chevrons({ dir, strength }: { dir: Dir; strength: number }) {
  return (
    <div style={{ transform: `rotate(${ROTATION[dir]}deg)`, opacity: 0.35 + 0.65 * strength }}>
      <svg
        viewBox="0 0 48 48"
        width="56"
        height="56"
        fill="none"
        stroke="white"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          animation: "pl-nudge 1.1s ease-in-out infinite",
          filter: "drop-shadow(0 1px 6px rgba(0,0,0,0.55))",
        }}
      >
        <path d="M14 10 L28 24 L14 38" />
        <path d="M26 10 L40 24 L26 38" opacity="0.55" />
      </svg>
    </div>
  );
}

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<Facing>("environment");
  const [error, setError] = useState("");
  const [res, setRes] = useState("");
  const [heading, setHeading] = useState<number | null>(null); // back camera
  const [tilt, setTilt] = useState<number | null>(null); // back camera
  const [target, setTarget] = useState<Target | null>(null);

  // Camera
  useEffect(() => {
    let cancelled = false;

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const s = stream.getVideoTracks()[0].getSettings();
        setRes(s.width && s.height ? `${s.width}×${s.height}` : "");
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
      setTilt(e.beta - 90); // 0 = upright, positive = back camera looking up
    }
    window.addEventListener("deviceorientationabsolute", onOrientation as EventListener);
    return () => {
      window.removeEventListener("deviceorientationabsolute", onOrientation as EventListener);
    };
  }, []);

  // The front camera looks the opposite way: heading + 180, tilt flipped.
  const camHeading =
    heading === null ? null : facing === "user" ? (heading + 180) % 360 : heading;
  const camTilt = tilt === null ? null : facing === "user" ? -tilt : tilt;

  const guide =
    camHeading !== null && camTilt !== null && target
      ? {
          dYaw: headingDelta(target.heading, camHeading),
          dPitch: target.tilt - camTilt,
        }
      : null;

  const turnDir: Dir | null =
    guide && Math.abs(guide.dYaw) >= TOLERANCE ? (guide.dYaw > 0 ? "right" : "left") : null;
  const tiltDir: Dir | null =
    guide && Math.abs(guide.dPitch) >= TOLERANCE ? (guide.dPitch > 0 ? "up" : "down") : null;
  const onTarget = guide !== null && turnDir === null && tiltDir === null;
    // In selfie mode the preview is mirrored, so flip left/right to match what the user sees.
  const flip = facing === "user" && MIRROR_SELFIE_ARROWS;
  const shownTurnDir: Dir | null = turnDir && flip ? OPPOSITE[turnDir] : turnDir;

  const sideOf = (d: Dir): Dir => (ARROWS_ON_FAR_SIDE ? OPPOSITE[d] : d);
  const strength = (delta: number) => Math.min(Math.abs(delta) / 45, 1);

  function switchCamera() {
    setFacing(facing === "user" ? "environment" : "user");
    setTarget(null); // a target only makes sense for the camera it was set on
  }

  function lockTarget() {
    if (camHeading !== null && camTilt !== null) {
      setTarget({ heading: camHeading, tilt: camTilt });
    }
  }

  return (
    <main className="fixed inset-0 overflow-hidden bg-black text-white">
      <style>{`
        @keyframes pl-nudge { 0%,100% { transform: translateX(0); } 50% { transform: translateX(7px); } }
        @keyframes pl-pulse { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.8; } }
      `}</style>

      {/* Camera, full screen */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
        style={{ transform: facing === "user" ? "scaleX(-1)" : "none" }}
      />

      {/* Rule-of-thirds grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-y-0 left-1/3 w-px bg-white/15" />
        <div className="absolute inset-y-0 left-2/3 w-px bg-white/15" />
        <div className="absolute inset-x-0 top-1/3 h-px bg-white/15" />
        <div className="absolute inset-x-0 top-2/3 h-px bg-white/15" />
      </div>

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 flex items-start justify-between px-4 pt-4 text-xs">
        <span className="font-medium tracking-[0.25em] text-white/90">POSELAH</span>
        <span className="tabular-nums text-white/60">
          {camHeading === null || camTilt === null
            ? "no sensors"
            : `${res} · ${camHeading.toFixed(0)}° · ${camTilt.toFixed(0)}°`}
        </span>
      </div>

      {/* Edge arrows */}
            {shownTurnDir && guide && (
        <div className={`pointer-events-none absolute ${EDGE_POSITION[sideOf(shownTurnDir)]}`}>
          <Chevrons dir={shownTurnDir} strength={strength(guide.dYaw)} />
        </div>
      )}
      {tiltDir && guide && (
        <div className={`pointer-events-none absolute ${EDGE_POSITION[sideOf(tiltDir)]}`}>
          <Chevrons dir={tiltDir} strength={strength(guide.dPitch)} />
        </div>
      )}

      {/* On target */}
      {onTarget && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            width="110"
            height="110"
            style={{
              animation: "pl-pulse 1.4s ease-in-out infinite",
              filter: "drop-shadow(0 1px 8px rgba(0,0,0,0.5))",
            }}
          >
            <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="3" />
            <path
              d="M31 52 L45 66 L71 37"
              fill="none"
              stroke="white"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {/* Instruction pill */}
      {(guide || error) && (
        <div className="absolute inset-x-0 bottom-28 flex justify-center px-6">
          <div className="rounded-full bg-white/15 px-5 py-2 text-sm font-medium backdrop-blur-md">
            {error
              ? error
              : onTarget
                ? "Hold it there"
                : instruction(flip ? -guide!.dYaw : guide!.dYaw, guide!.dPitch)}
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="absolute inset-x-0 bottom-6 flex items-center justify-center gap-8">
        <button
          onClick={switchCamera}
          aria-label="Flip camera"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md"
        >
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="white"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 12a8 8 0 0 1 13.66-5.66L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.66 5.66L4 16M4 20v-4h4" />
          </svg>
        </button>

        <button
          onClick={lockTarget}
          aria-label="Lock this view as target"
          className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-white"
        >
          <span className="h-11 w-11 rounded-full bg-white" />
        </button>

        {target ? (
          <button
            onClick={() => setTarget(null)}
            aria-label="Clear target"
            className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 backdrop-blur-md"
          >
            <svg
              viewBox="0 0 24 24"
              width="20"
              height="20"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M6 6 L18 18 M18 6 L6 18" />
            </svg>
          </button>
        ) : (
          <div className="h-12 w-12" />
        )}
      </div>
    </main>
  );
}