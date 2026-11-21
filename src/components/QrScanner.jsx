import { useCallback, useEffect, useRef, useState } from 'react'
import { useLanguage } from '../i18n/language'
import { Button, Icon } from './ui'

/**
 * Scanner de pass QR pour le comptoir.
 * Utilise l'API BarcodeDetector du navigateur (Chrome, Edge, Android) ; si elle
 * n'existe pas ou si la caméra est refusée, le composant l'indique et la saisie
 * manuelle du code reste disponible juste en dessous.
 */
export default function QrScanner({ onScan, busy = false }) {
  const { t } = useLanguage()
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)

  const stop = useCallback(() => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setStatus('idle')
  }, [])

  useEffect(() => () => stop(), [stop])

  const start = async () => {
    setError(null)
    setOpen(true)

    // Contexte non sécurisé (http:// hors localhost) : getUserMedia est interdit
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
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }

      if (typeof window.BarcodeDetector !== 'function') {
        setStatus('unsupported')
        return
      }

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      setStatus('scanning')

      timerRef.current = window.setInterval(async () => {
        if (!videoRef.current || busy) return
        if (videoRef.current.readyState < 2) return
        try {
          const codes = await detector.detect(videoRef.current)
          const value = codes?.[0]?.rawValue
          if (value) {
            stop()
            onScan?.(value)
          }
        } catch {
          // image pas encore nette : on réessaie au prochain tick
        }
      }, 300)
    } catch (cameraError) {
      const name = cameraError?.name ?? ''
      setStatus(name === 'NotAllowedError' || name === 'SecurityError' ? 'denied' : 'failed')
      setError(cameraError?.message ?? null)
      stop()
    }
  }

  const close = () => {
    stop()
    setOpen(false)
  }

  return (
    <div className="space-y-2">
      {open ? (
        <div className="overflow-hidden rounded-2xl bg-slate-900">
          <video
            ref={videoRef}
            playsInline
            autoPlay
            muted
            className="h-56 w-full bg-black object-cover"
          />
          <div className="bg-slate-900 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-white/80">
                {status === 'scanning'
                  ? t('scan.hint')
                  : status === 'starting'
                    ? t('scan.starting')
                    : status === 'unsupported'
                      ? t('scan.unsupported')
                      : status === 'insecure'
                        ? t('scan.insecure')
                        : status === 'denied'
                          ? t('scan.denied')
                          : status === 'failed'
                            ? t('scan.failed')
                            : t('scan.idle')}
              </p>
              <button
                type="button"
                onClick={close}
                className="shrink-0 rounded-full bg-white/10 px-2.5 py-1 font-display text-[11px] font-semibold text-white"
              >
                {t('common.close')}
              </button>
            </div>
            {status === 'unsupported' ? (
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
