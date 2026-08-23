import { useEffect, useRef, useState } from "react"
import { loadScanner } from "@/lib/scanner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

interface DocumentScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanned: (file: File) => void
}

type Status = "loading" | "live" | "preview" | "error"

interface Point {
  x: number
  y: number
}

interface Corners {
  topLeftCorner: Point
  topRightCorner: Point
  bottomLeftCorner: Point
  bottomRightCorner: Point
}

// Raw frame-to-frame corner detection is noisy (camera shake, lighting, background
// clutter all shift which contour point reads as "farthest corner"), which is what
// made the live highlight look like it was jumping around. Blending each corner
// toward its newly-detected position instead of snapping to it directly smooths that
// out; lower = calmer but slower to react to an actually-moved document.
const SMOOTHING = 0.25

function lerpPoint(prev: Point, next: Point, t: number): Point {
  return { x: prev.x + (next.x - prev.x) * t, y: prev.y + (next.y - prev.y) * t }
}

function lerpCorners(prev: Corners, next: Corners, t: number): Corners {
  return {
    topLeftCorner: lerpPoint(prev.topLeftCorner, next.topLeftCorner, t),
    topRightCorner: lerpPoint(prev.topRightCorner, next.topRightCorner, t),
    bottomLeftCorner: lerpPoint(prev.bottomLeftCorner, next.bottomLeftCorner, t),
    bottomRightCorner: lerpPoint(prev.bottomRightCorner, next.bottomRightCorner, t),
  }
}

function drawQuad(ctx: CanvasRenderingContext2D, corners: Corners) {
  const { topLeftCorner: tl, topRightCorner: tr, bottomRightCorner: br, bottomLeftCorner: bl } = corners
  ctx.strokeStyle = "orange"
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(tl.x, tl.y)
  ctx.lineTo(tr.x, tr.y)
  ctx.lineTo(br.x, br.y)
  ctx.lineTo(bl.x, bl.y)
  ctx.lineTo(tl.x, tl.y)
  ctx.stroke()
}

export function DocumentScannerDialog({ open, onOpenChange, onScanned }: DocumentScannerDialogProps) {
  const [status, setStatus] = useState<Status>("loading")
  const [error, setError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [scannerProgress, setScannerProgress] = useState(0)
  const [scannerReady, setScannerReady] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const resultCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const scannerRef = useRef<any>(null)
  const smoothedCornersRef = useRef<Corners | null>(null)
  const lastDetectRef = useRef(0)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setStatus("loading")
    setError(null)
    setCameraReady(false)
    setScannerReady(false)
    setScannerProgress(0)

    // Camera and the OpenCV/jscanify download run in parallel rather than the camera
    // waiting on a ~13MB library to finish first - the video feed can show up in
    // under a second, well before edge detection is ready to run on top of it.
    async function startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        if (cancelled) return
        setCameraReady(true)
        setStatus("live")
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't start the camera. You can still attach a file directly instead.",
        )
        setStatus("error")
      }
    }

    async function startScanner() {
      try {
        await loadScanner((fraction) => {
          if (!cancelled) setScannerProgress(fraction)
        })
        if (cancelled) return
        scannerRef.current = new window.jscanify()
        setScannerReady(true)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't load the scanner engine — check your connection and try again.",
        )
        setStatus("error")
      }
    }

    startCamera()
    startScanner()

    return () => {
      cancelled = true
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [open])

  // Starts the live edge-highlighting loop only once both the camera feed and the
  // scanner engine are ready - runs independently of the two async loads above.
  useEffect(() => {
    if (!cameraReady || !scannerReady) return
    let cancelled = false
    smoothedCornersRef.current = null
    lastDetectRef.current = 0

    const DETECT_INTERVAL_MS = 150

    function tick(now: number) {
      const video = videoRef.current
      const overlay = overlayCanvasRef.current
      if (cancelled || !video || !overlay || !video.videoWidth) {
        frameRef.current = requestAnimationFrame(tick)
        return
      }
      const ctx = overlay.getContext("2d")
      if (!ctx) return
      overlay.width = video.videoWidth
      overlay.height = video.videoHeight
      ctx.drawImage(video, 0, 0, overlay.width, overlay.height)

      // Detection (Canny edge + contour search) runs on OpenCV's WASM heap and is
      // the expensive part - throttling it independently of the render rate keeps
      // the video feed itself smooth while cutting how often noisy new corner
      // readings arrive, which is most of what made the highlight feel jumpy.
      if (now - lastDetectRef.current >= DETECT_INTERVAL_MS) {
        lastDetectRef.current = now
        const mat = window.cv.imread(overlay)
        try {
          const contour = scannerRef.current.findPaperContour(mat)
          if (contour) {
            const corners = scannerRef.current.getCornerPoints(contour) as Partial<Corners>
            contour.delete()
            if (
              corners.topLeftCorner &&
              corners.topRightCorner &&
              corners.bottomLeftCorner &&
              corners.bottomRightCorner
            ) {
              const detected = corners as Corners
              smoothedCornersRef.current = smoothedCornersRef.current
                ? lerpCorners(smoothedCornersRef.current, detected, SMOOTHING)
                : detected
            }
          }
        } catch {
          // No paper-like contour found in this frame - keep showing the last
          // smoothed position rather than clearing it.
        } finally {
          mat.delete()
        }
      }

      if (smoothedCornersRef.current) {
        drawQuad(ctx, smoothedCornersRef.current)
      }
      frameRef.current = requestAnimationFrame(tick)
    }
    frameRef.current = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [cameraReady, scannerReady])

  function handleCapture() {
    const video = videoRef.current
    const result = resultCanvasRef.current
    if (!video || !result || !scannerRef.current) return

    const source = document.createElement("canvas")
    source.width = video.videoWidth
    source.height = video.videoHeight
    source.getContext("2d")?.drawImage(video, 0, 0)

    // Use the smoothed corners rather than re-detecting fresh on this one frame,
    // which is exactly as noise-prone as any other single frame was.
    const extracted = scannerRef.current.extractPaper(
      source,
      source.width,
      source.height,
      smoothedCornersRef.current ?? undefined,
    )
    if (!extracted) {
      window.alert("No document detected — line up the page fully in frame and try again.")
      return
    }
    result.width = extracted.width
    result.height = extracted.height
    result.getContext("2d")?.drawImage(extracted, 0, 0)

    if (frameRef.current) cancelAnimationFrame(frameRef.current)
    streamRef.current?.getTracks().forEach((t) => t.stop())
    setStatus("preview")
  }

  function handleRetake() {
    onOpenChange(false)
    // Re-opening re-runs the effect from scratch, restarting the camera.
    requestAnimationFrame(() => onOpenChange(true))
  }

  function handleUse() {
    const result = resultCanvasRef.current
    if (!result) return
    result.toBlob(
      (blob) => {
        if (!blob) return
        onScanned(new File([blob], `scan-${Date.now()}.jpg`, { type: "image/jpeg" }))
        onOpenChange(false)
      },
      "image/jpeg",
      0.9,
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Scan Document</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {status === "loading" && !cameraReady && (
            <p className="text-sm text-muted-foreground">Starting camera…</p>
          )}

          {status === "error" && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <video ref={videoRef} className="hidden" muted playsInline />
          <canvas
            ref={overlayCanvasRef}
            className={`w-full rounded-md border ${status === "live" ? "" : "hidden"}`}
          />
          <canvas
            ref={resultCanvasRef}
            className={`w-full rounded-md border ${status === "preview" ? "" : "hidden"}`}
          />

          {status === "live" && !scannerReady && (
            <p className="text-xs text-muted-foreground">
              Loading scanner engine… {Math.round(scannerProgress * 100)}%
              {scannerProgress < 1 && " (first use only — this is a one-time ~13MB download)"}
            </p>
          )}
          {status === "live" && scannerReady && (
            <p className="text-xs text-muted-foreground">
              Line up the document so its edges are highlighted, then capture.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {status === "live" && (
            <Button onClick={handleCapture} disabled={!scannerReady}>
              Capture
            </Button>
          )}
          {status === "preview" && (
            <>
              <Button variant="outline" onClick={handleRetake}>
                Retake
              </Button>
              <Button onClick={handleUse}>Use This Scan</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
