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

    if (typeof window.BarcodeDetector !== 'function') {
      setStatus('unsupported')
      return
    }

    try {
      setStatus('starting')
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      const detector = new window.BarcodeDetector({ formats: ['qr_code'] })
      setStatus('scanning')

      timerRef.current = window.setInterval(async () => {
        if (!videoRef.current || busy) return
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
      }, 350)
    } catch (cameraError) {
      setStatus('denied')
      setError(cameraError.message ?? null)
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
            muted
            className="h-52 w-full object-cover opacity-95"
          />
          <div className="flex items-center justify-between gap-2 bg-slate-900 px-3 py-2.5">
            <p className="text-[11px] text-white/80">
              {status === 'scanning'
                ? t('scan.hint')
                : status === 'starting'
                  ? t('scan.starting')
                  : status === 'unsupported'
                    ? t('scan.unsupported')
                    : status === 'denied'
                      ? t('scan.denied')
                      : t('scan.idle')}
            </p>
            <button
              type="button"
              onClick={close}
              className="rounded-full bg-white/10 px-2.5 py-1 font-display text-[11px] font-semibold text-white"
            >
              {t('common.close')}
            </button>
          </div>
          {error ? <p className="px-3 pb-2 text-[10px] text-coral-300">{error}</p> : null}
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
