import { useEffect, useRef, useState } from 'react'

interface VideoPlayerProps {
  url: string | null
  autoPlay?: boolean
  onEnded?: () => void
}

export function VideoPlayer({ url, autoPlay = true, onEnded }: VideoPlayerProps): React.JSX.Element {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [errorUrl, setErrorUrl] = useState<string | null>(null)
  const [unmutedUrl, setUnmutedUrl] = useState<string | null>(null)
  const hasError = url !== null && errorUrl === url
  const muted = !url || unmutedUrl !== url

  useEffect(() => {
    if (!autoPlay || !url || hasError) {
      return
    }

    const timeout = window.setTimeout(() => {
      const video = videoRef.current
      if (!video) {
        return
      }
      video.muted = false
      setUnmutedUrl(url)
    }, 1000)

    return () => window.clearTimeout(timeout)
  }, [autoPlay, hasError, url])

  const handleReplay = async (): Promise<void> => {
    const video = videoRef.current
    if (!video) {
      return
    }
    video.currentTime = 0
    await video.play()
  }

  if (!url || hasError) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-2xl border border-slate-700 bg-gradient-to-r from-purple-600/30 via-slate-900 to-orange-500/30 p-6">
        <div className="animate-pulse text-center">
          <p className="text-5xl">🏆</p>
          <p className="mt-2 text-sm text-slate-200">Vídeo do vencedor indisponível</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-black">
      <video
        ref={videoRef}
        className="aspect-video w-full object-cover"
        controls={false}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        loop={false}
        onEnded={onEnded}
        onError={() => setErrorUrl(url)}
      >
        <source src={url} />
      </video>
      <button
        type="button"
        className="absolute right-3 top-3 rounded-md bg-black/60 px-3 py-1 text-xs text-white"
        onClick={() => void handleReplay()}
      >
        Replay
      </button>
    </div>
  )
}
