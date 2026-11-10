"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, RefreshCw, X, Zap } from "lucide-react";

type ImageCaptureCtor = new (track: MediaStreamTrack) => { takePhoto: (o?: object) => Promise<Blob> };

/** Full-screen document camera. Uses the highest resolution the camera offers. */
export function CameraCapture({ onCapture, onClose }: { onCapture: (b: Blob) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceId, setDeviceId] = useState<string>();
  const [error, setError] = useState<string>();
  const [flash, setFlash] = useState(false);
  const [torch, setTorch] = useState(false);
  const [count, setCount] = useState(0);

  const stop = () => streamRef.current?.getTracks().forEach((t) => t.stop());

  const start = useCallback(async (id?: string) => {
    stop();
    setError(undefined);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          ...(id ? { deviceId: { exact: id } } : { facingMode: { ideal: "environment" } }),
          width: { ideal: 4096 },
          height: { ideal: 3072 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      // Labels are only available after permission is granted.
      const all = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
      setDevices(all);
      setDeviceId(stream.getVideoTracks()[0]?.getSettings().deviceId);
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser settings."
          : "No camera found. Use “Upload” or the scanner folder instead.",
      );
    }
  }, []);

  useEffect(() => {
    start();
    return stop;
  }, [start]);

  async function capture() {
    const track = streamRef.current?.getVideoTracks()[0];
    const video = videoRef.current;
    if (!track || !video) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 150);
    let blob: Blob | null = null;
    const IC = (window as unknown as { ImageCapture?: ImageCaptureCtor }).ImageCapture;
    if (IC) {
      try {
        blob = await new IC(track).takePhoto();
      } catch {
        blob = null;
      }
    }
    if (!blob) {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")!.drawImage(video, 0, 0);
      blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.95));
    }
    if (blob) {
      onCapture(blob);
      setCount((c) => c + 1);
    }
  }

  async function toggleTorch() {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    try {
      await track.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] });
      setTorch(!torch);
    } catch {}
  }

  const hasTorch = (() => {
    const caps = streamRef.current?.getVideoTracks()[0]?.getCapabilities?.() as { torch?: boolean } | undefined;
    return Boolean(caps?.torch);
  })();

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black text-white">
      <div className="flex items-center gap-2 p-3">
        <button onClick={onClose} className="rounded-full bg-white/10 p-2.5" aria-label="Close camera">
          <X size={20} />
        </button>
        {devices.length > 1 && (
          <select
            className="ml-2 max-w-[60%] truncate rounded-xl bg-white/10 px-3 py-2 text-sm"
            value={deviceId}
            onChange={(e) => {
              setDeviceId(e.target.value);
              start(e.target.value);
            }}
          >
            {devices.map((d, i) => (
              <option key={d.deviceId} value={d.deviceId} className="text-black">
                {d.label || `Camera ${i + 1}`}
              </option>
            ))}
          </select>
        )}
        <span className="ml-auto text-xs text-white/70">{devices.length ? `${devices.length} camera${devices.length > 1 ? "s" : ""} found` : ""}</span>
        {hasTorch && (
          <button onClick={toggleTorch} className={`rounded-full p-2.5 ${torch ? "bg-amber-400 text-black" : "bg-white/10"}`} aria-label="Flashlight">
            <Zap size={20} />
          </button>
        )}
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="h-full w-full object-contain" />
        {/* Document guide frame */}
        <div className="pointer-events-none absolute inset-[8%] rounded-2xl border-2 border-white/60 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
          {["left-0 top-0 border-l-4 border-t-4", "right-0 top-0 border-r-4 border-t-4", "left-0 bottom-0 border-l-4 border-b-4", "right-0 bottom-0 border-r-4 border-b-4"].map((c) => (
            <span key={c} className={`absolute h-8 w-8 rounded-sm border-sky-400 ${c}`} />
          ))}
        </div>
        <p className="absolute inset-x-0 top-3 text-center text-sm text-white/80">Fit the document inside the frame · good light, no shadows</p>
        {flash && <div className="absolute inset-0 bg-white/80" />}
        {error && <div className="absolute inset-0 grid place-items-center p-8 text-center">{error}</div>}
      </div>

      <div className="safe-bottom flex items-center justify-between px-8 py-6">
        <button onClick={() => start(deviceId)} className="rounded-full bg-white/10 p-3" aria-label="Restart camera">
          <RefreshCw size={22} />
        </button>
        <button onClick={capture} disabled={!!error} className="grid h-20 w-20 place-items-center rounded-full bg-white p-1.5 disabled:opacity-40" aria-label="Capture page">
          <span className="grid h-full w-full place-items-center rounded-full border-4 border-black/80 text-black">
            <Camera size={28} />
          </span>
        </button>
        <button onClick={onClose} className="min-w-14 rounded-full bg-indigo-500 px-4 py-3 text-sm font-semibold">
          {count ? `Done (${count})` : "Done"}
        </button>
      </div>
    </div>
  );
}
