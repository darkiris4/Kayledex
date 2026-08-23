// Lazy-loads the vendored OpenCV.js + jscanify scripts (see public/vendor/README.md)
// on first use, so the ~13MB OpenCV bundle never touches anyone who doesn't open the
// document scanner. Both expose plain globals (window.cv, window.jscanify) rather than
// being real ES modules, to sidestep bundling an Emscripten build through Vite/Rollup.
//
// opencv.js alone is ~13MB - on a slow mobile connection that can take well over a
// minute, so callers get progress (0-1) rather than a single opaque "loading" state.

declare global {
  interface Window {
    cv: any
    jscanify: any
  }
}

let loadPromise: Promise<void> | null = null

function loadScriptTag(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

// Fetches the URL first (reporting byte progress) purely to warm the HTTP cache, then
// appends a <script src> tag for actual execution - loading via a real script tag
// (rather than eval-ing the fetched text) avoids CSP/eval complications, and the
// script tag's own request is served from the cache we just warmed.
async function loadScriptWithProgress(
  src: string,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  const res = await fetch(src)
  if (!res.ok) throw new Error(`Failed to load ${src}`)
  const total = Number(res.headers.get("content-length")) || null
  if (res.body && onProgress) {
    const reader = res.body.getReader()
    let loaded = 0
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      loaded += value.length
      onProgress(total ? loaded / total : 0)
    }
  } else {
    await res.arrayBuffer()
  }
  onProgress?.(1)
  await loadScriptTag(src)
}

export function loadScanner(onProgress?: (fraction: number) => void): Promise<void> {
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    // opencv.js is ~13MB and jscanify.js is ~8KB - weight progress accordingly rather
    // than reporting 50% after the tiny file and 50% for the huge one.
    await loadScriptWithProgress("/vendor/opencv.js", (f) => onProgress?.(f * 0.97))
    // opencv.js's UMD build assigns window.cv synchronously, but the WASM runtime
    // underneath initializes asynchronously. If it hasn't finished by the time the
    // script's own top-level code returns (virtually guaranteed for a ~13MB WASM
    // bundle), window.cv is actually a Promise that resolves to the real module —
    // NOT the module itself. Awaiting it is required, not optional: assigning
    // onRuntimeInitialized onto that Promise object is a silent no-op, since the
    // runtime looks for that callback on its own internal Module object, not on
    // whatever a caller happens to hold — which is exactly what hung at 97% here.
    if (window.cv instanceof Promise) {
      window.cv = await window.cv
    } else if (!window.cv.Mat) {
      await new Promise<void>((resolve) => {
        window.cv.onRuntimeInitialized = () => resolve()
      })
    }
    onProgress?.(0.98)
    await loadScriptWithProgress("/vendor/jscanify.js")
    onProgress?.(1)
  })().catch((err) => {
    loadPromise = null
    throw err
  })

  return loadPromise
}
