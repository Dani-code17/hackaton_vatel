import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { useLanguage } from '../i18n/language'
import { Button, Icon } from './ui'

const SCAN_INTERVAL_MS = 280

/**
 * Scanner de pass QR pour le comptoir.
 *
 * Deux décodeurs, dans cet ordre :
 *   1. l'API native `BarcodeDetector` (Chrome, Edge, Android) ;
 *   2. `jsQR` sur une capture canvas — indispensable sur Safari / iOS, où
 *      `BarcodeDetector` n'existe pas.
 *
 * Si la caméra est refusée, indisponible, ou si la page n'est pas en HTTPS, un
 * message clair s'affiche et la saisie manuelle du code reste disponible.
 */
export default function QrScanner({ onScan, busy = false }) {
  const { t } = useLanguage()
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const seenRef = useRef(new Set())
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const stop = useCallback((nextStatus = 'idle') => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setStatus(nextStatus)
  }, [])

  useEffect(() => () => stop(), [stop])

  // Un seul appel par code lu, même si plusieurs frames le détectent
  const handleCode = useCallback(
    (value) => {
      const code = value.trim()
      if (!code || seenRef.current.has(code)) return
      seenRef.current.add(code)
      stop('scanned')
      onScan?.(code)
    },
    [onScan, stop],
  )

  const decodeFrame = useCallback(async (detector) => {
    const video = videoRef.current
    if (!video || video.readyState < 2) return null

    if (detector) {
      try {
        const codes = await detector.detect(video)
        return codes?.[0]?.rawValue ?? null
      } catch {
        return null
      }
    }

    const canvas = canvasRef.current
    const width = video.videoWidth || 0
    const height = video.videoHeight || 0
    if (!canvas || !width || !height) return null

    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    context.drawImage(video, 0, 0, width, height)
    const image = context.getImageData(0, 0, width, height)
    return jsQR(image.data, width, height, { inversionAttempts: 'attemptBoth' })?.data ?? null
  }, [])

  const start = async () => {
    setError(null)
    seenRef.current = new Set()
    setOpen(true)

    if (!window.isSecureContext) {
      setStatus('insecure')
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported')
      return
    }

    try {
      setStatus('starting')

      // Contraintes volontairement souples : Safari iOS refuse facingMode: { exact }
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 } },
          audio: false,
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      }

      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await video.play().catch(() => {})
      }

      const detector =
        typeof window.BarcodeDetector === 'function'
          ? new window.BarcodeDetector({ formats: ['qr_code'] })
          : null

      setStatus('scanning')

      timerRef.current = window.setInterval(async () => {
        if (busy) return
        try {
          const value = await decodeFrame(detector)
          if (value) handleCode(value)
        } catch {
          // image pas encore nette : on réessaie au prochain tick
        }
      }, SCAN_INTERVAL_MS)
    } catch (cameraError) {
      const name = cameraError?.name ?? ''
      const next = name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'failed'
      setError(cameraError?.message ?? null)
      stop(next)
    }
  }

  const close = () => {
    stop()
    setOpen(false)
  }

  const messages = {
    idle: t('scan.idle'),
    starting: t('scan.starting'),
    scanning: t('scan.hint'),
    scanned: t('scan.scanned'),
    insecure: t('scan.insecure'),
    unsupported: t('scan.unsupported'),
    denied: t('scan.denied'),
    failed: t('scan.failed'),
  }

  return (
    <div className="space-y-2">
      {open ? (
        <div className="overflow-hidden rounded-2xl bg-slate-900">
          <div className="relative">
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="h-56 w-full bg-black object-cover"
            />
            {status === 'scanning' ? (
              <span className="pointer-events-none absolute inset-6 rounded-xl border-2 border-white/70" />
            ) : null}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          <div className="bg-slate-900 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-white/80">{messages[status] ?? messages.idle}</p>
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 font-display text-[11px] font-semibold text-white"
              >
                {t('common.close')}
              </button>
            </div>

            {['unsupported', 'failed', 'denied', 'insecure', 'scanned'].includes(status) ? (
              <button
                type="button"
                onClick={start}
                className="mt-2 w-full rounded-xl bg-white/10 py-1.5 font-display text-[11px] font-semibold text-white"
              >
                {t('scan.retry')}
              </button>
            ) : null}
          </div>

          {error && status !== 'unsupported' ? (
            <p className="px-3 pb-2 text-[10px] text-coral-300">{error}</p>
          ) : null}
        </div>
      ) : (
        <Button variant="secondary" className="w-full" onClick={start} disabled={busy}>
          <Icon name="qr_code_scanner" className="text-[19px]" />
          {t('scan.open')}
        </Button>
      )}
    </div>
  )
}
