import { useState, useEffect } from 'react'

interface HeroVideoProps {
  videoUrl?: string;
  fallbackPoster?: string;
}

const DEFAULT_VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260815_030633_1712fc71-4979-4e14-98f9-9f95702ab3da.mp4'

export function HeroVideo({ videoUrl = DEFAULT_VIDEO }: HeroVideoProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
  const [videoLoaded, setVideoLoaded] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  if (prefersReducedMotion) {
    return (
      <div className="hero-video-wrap" aria-hidden="true">
        <div className="hero-video-overlay" />
        <div className="hero-video-glow" />
      </div>
    )
  }

  return (
    <div className="hero-video-wrap" aria-hidden="true">
      <video
        className="hero-video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onLoadedData={() => setVideoLoaded(true)}
        style={{ opacity: videoLoaded ? 0.75 : 0 }}
      >
        <source src={videoUrl} type="video/mp4" />
      </video>
      <div className="hero-video-overlay" />
      <div className="hero-video-glow" />
    </div>
  )
}
