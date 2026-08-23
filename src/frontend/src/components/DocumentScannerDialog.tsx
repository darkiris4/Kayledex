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

export function DocumentScannerDialog({ open, onOpenChange, onScanned }: DocumentScannerDialogProps) {
  const [status, setStatus] = useState<Status>("loading")
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null)
  const resultCanvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameRef = useRef<number | null>(null)
  const scannerRef = useRef<any>(null)

  useEffect(() => {
    if (!open) return

    let cancelled = false
    setStatus("loading")
    setError(null)

    async function start() {
      try {
        await loadScanner()
        if (cancelled) return
        scannerRef.current = new window.jscanify()

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
        setStatus("live")
        runLiveLoop()
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

    function runLiveLoop() {
      const video = videoRef.current
      const overlay = overlayCanvasRef.current
      if (!video || !overlay) return
      const ctx = overlay.getContext("2d")
      if (!ctx) return

      const tick = () => {
        if (cancelled || !video.videoWidth) {
          frameRef.current = requestAnimationFrame(tick)
          return
        }
        overlay.width = video.videoWidth
        overlay.height = video.videoHeight
        ctx.drawImage(video, 0, 0, overlay.width, overlay.height)
        try {
          const highlighted = scannerRef.current.highlightPaper(overlay)
          ctx.drawImage(highlighted, 0, 0, overlay.width, overlay.height)
        } catch {
          // No paper-like contour found in this frame — leave the plain frame showing.
        }
        frameRef.current = requestAnimationFrame(tick)
      }
      frameRef.current = requestAnimationFrame(tick)
    }

    start()

    return () => {
      cancelled = true
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      streamRef.current?.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [open])

  function handleCapture() {
    const video = videoRef.current
    const result = resultCanvasRef.current
    if (!video || !result || !scannerRef.current) return

    const source = document.createElement("canvas")
    source.width = video.videoWidth
    source.height = video.videoHeight
    source.getContext("2d")?.drawImage(video, 0, 0)

    const extracted = scannerRef.current.extractPaper(source, source.width, source.height)
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
          {status === "loading" && (
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

          {status === "live" && (
            <p className="text-xs text-muted-foreground">
              Line up the document so its edges are highlighted, then capture.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          {status === "live" && <Button onClick={handleCapture}>Capture</Button>}
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
