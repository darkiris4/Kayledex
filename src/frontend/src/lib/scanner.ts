// Lazy-loads the vendored OpenCV.js + jscanify scripts (see public/vendor/README.md)
// on first use, so the ~13MB OpenCV bundle never touches anyone who doesn't open the
// document scanner. Both expose plain globals (window.cv, window.jscanify) rather than
// being real ES modules, to sidestep bundling an Emscripten build through Vite/Rollup.

declare global {
  interface Window {
    cv: any
    jscanify: any
  }
}

let loadPromise: Promise<void> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

export function loadScanner(): Promise<void> {
  if (loadPromise) return loadPromise

  loadPromise = (async () => {
    await loadScript("/vendor/opencv.js")
    // opencv.js's UMD build assigns window.cv synchronously, but the WASM runtime
    // underneath initializes asynchronously — cv.Mat etc. aren't usable until then.
    if (!window.cv.Mat) {
      await new Promise<void>((resolve) => {
        window.cv.onRuntimeInitialized = () => resolve()
      })
    }
    await loadScript("/vendor/jscanify.js")
  })().catch((err) => {
    loadPromise = null
    throw err
  })

  return loadPromise
}
