// Singleton Google Maps script loader — prevents loading the API multiple times

let loadPromise: Promise<void> | null = null

export function loadGoogleMaps(): Promise<void> {
  if (window.google?.maps?.places) {
    return Promise.resolve()
  }

  if (loadPromise) {
    return loadPromise
  }

  const apiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY
  if (!apiKey) {
    return Promise.reject(new Error('Missing REACT_APP_GOOGLE_MAPS_API_KEY'))
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,marker`
    script.async = true
    script.onload = () => resolve()
    script.onerror = (err) => {
      loadPromise = null
      reject(err)
    }
    document.head.appendChild(script)
  })

  return loadPromise
}
