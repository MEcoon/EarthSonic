import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'

const EARTH_TEXTURE = '/nasa/ocean-currents/images/global_ecco2_temperature_currents.jpg'
const locations = [
  { name: 'North Atlantic', lat: 42, lon: -42, detail: 'Explore the Gulf Stream region in NASA’s ocean current visualization.' },
  { name: 'North Pacific', lat: 35, lon: 165, detail: 'Explore North Pacific flow patterns in NASA’s ocean current visualization.' },
  { name: 'Southern Ocean', lat: -52, lon: 55, detail: 'Explore Southern Ocean circulation in NASA’s ocean current visualization.' },
]

function spherePosition(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * Math.PI / 180
  const theta = (lon + 180) * Math.PI / 180
  return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta))
}

export function EarthGlobe() {
  const hostRef = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(locations[0])
  const [textureState, setTextureState] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [webglAvailable, setWebglAvailable] = useState(true)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let frameId = 0
    let dragging = false
    let lastX = 0
    let lastY = 0
    let velocity = 0
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100)
    camera.position.z = 5.25
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    } catch {
      setWebglAvailable(false)
      setTextureState('fallback')
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    host.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-hidden', 'true')

    const earth = new THREE.Group()
    scene.add(earth)
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.55, 64, 48),
      new THREE.MeshPhongMaterial({ color: 0x316a9b, shininess: 14, specular: new THREE.Color(0x3a759b) }),
    )
    earth.add(sphere)
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.59, 48, 36),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.09, side: THREE.BackSide }),
    )
    earth.add(atmosphere)
    const ambient = new THREE.AmbientLight(0x8eaac9, 1.2)
    const sun = new THREE.DirectionalLight(0xd9efff, 2.4)
    sun.position.set(-3, 2, 4)
    scene.add(ambient, sun)
    const markers = locations.map((location, index) => {
      const point = new THREE.Mesh(
        new THREE.SphereGeometry(0.045, 12, 12),
        new THREE.MeshBasicMaterial({ color: index === 0 ? 0x4ade80 : 0x38bdf8 }),
      )
      point.position.copy(spherePosition(location.lat, location.lon, 1.57))
      point.userData.location = location
      earth.add(point)
      return point
    })
    let texture: THREE.Texture | undefined
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    loader.load(EARTH_TEXTURE, (loaded) => {
      if (disposed) { loaded.dispose(); return }
      texture = loaded
      texture.colorSpace = THREE.SRGBColorSpace
      ;(sphere.material as THREE.MeshPhongMaterial).map = loaded
      ;(sphere.material as THREE.MeshPhongMaterial).color.set(0xffffff)
      ;(sphere.material as THREE.MeshPhongMaterial).needsUpdate = true
      setTextureState('ready')
    }, undefined, () => { if (!disposed) setTextureState('fallback') })

    const resize = () => {
      const width = host.clientWidth || 1
      const height = host.clientHeight || 1
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(host)
    resize()
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const animate = () => {
      frameId = window.requestAnimationFrame(animate)
      if (!dragging && !prefersReducedMotion.matches) earth.rotation.y += 0.00045 + velocity
      else if (!dragging) earth.rotation.y += velocity
      velocity *= 0.96
      renderer.render(scene, camera)
    }
    animate()
    const onDown = (event: PointerEvent) => { dragging = true; lastX = event.clientX; lastY = event.clientY; renderer.domElement.setPointerCapture(event.pointerId) }
    const onMove = (event: PointerEvent) => {
      if (!dragging) return
      const dx = event.clientX - lastX
      const dy = event.clientY - lastY
      earth.rotation.y += dx * 0.006
      earth.rotation.x = Math.max(-0.5, Math.min(0.5, earth.rotation.x + dy * 0.004))
      velocity = dx * 0.0008
      lastX = event.clientX; lastY = event.clientY
    }
    const onUp = () => { dragging = false }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      camera.position.z = Math.max(3.8, Math.min(6.6, camera.position.z + event.deltaY * 0.003))
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const step = event.shiftKey ? 0.2 : 0.08
      if (event.key === 'ArrowLeft') earth.rotation.y -= step
      else if (event.key === 'ArrowRight') earth.rotation.y += step
      else if (event.key === 'ArrowUp') earth.rotation.x = Math.min(0.5, earth.rotation.x + step)
      else if (event.key === 'ArrowDown') earth.rotation.x = Math.max(-0.5, earth.rotation.x - step)
      else if (event.key === '+' || event.key === '=') camera.position.z = Math.max(3.8, camera.position.z - 0.25)
      else if (event.key === '-') camera.position.z = Math.min(6.6, camera.position.z + 0.25)
      else return
      event.preventDefault()
    }
    const onClick = (event: MouseEvent) => {
      if (Math.abs(event.clientX - lastX) > 8) return
      const rect = renderer.domElement.getBoundingClientRect()
      const pointer = new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(pointer, camera)
      const selected = raycaster.intersectObjects(markers)[0]?.object.userData.location as typeof locations[number] | undefined
      if (selected) setActive(selected)
    }
    const canvas = renderer.domElement
    canvas.tabIndex = 0
    canvas.setAttribute('role', 'application')
    canvas.setAttribute('aria-label', 'Interactive 3D Earth globe. Use arrow keys to rotate and plus or minus to zoom. You can also drag to rotate and scroll to zoom.')
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onUp)
    canvas.addEventListener('wheel', onWheel, { passive: false })
    canvas.addEventListener('click', onClick)
    canvas.addEventListener('keydown', onKeyDown)
    return () => {
      disposed = true
      window.cancelAnimationFrame(frameId)
      observer.disconnect()
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('wheel', onWheel); canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('keydown', onKeyDown)
      texture?.dispose()
      sphere.geometry.dispose(); atmosphere.geometry.dispose()
      ;(sphere.material as THREE.Material).dispose(); (atmosphere.material as THREE.Material).dispose()
      markers.forEach((marker) => { marker.geometry.dispose(); (marker.material as THREE.Material).dispose() })
      renderer.dispose(); host.removeChild(canvas)
    }
  }, [])

  return <div className="globe-explorer">
    <div className="globe-canvas" ref={hostRef} aria-label="Interactive 3D Earth globe. Drag to rotate, scroll to zoom, or use arrow keys and plus or minus to adjust the view.">
      {!webglAvailable && <div className="globe-fallback" role="img" aria-label="Static Earth globe illustration">
        <div className="earth-globe"><div className="earth-shade" /><div className="earth-grid" /></div>
      </div>}
    </div>
    <div className="globe-hint"><span className="live-dot" /> DRAG TO ROTATE · SCROLL TO ZOOM</div>
    <div className="globe-status"><span>{textureState === 'ready' ? 'NASA SVS #3912' : textureState === 'loading' ? 'LOADING OCEAN VISUALIZATION' : 'NASA IMAGE UNAVAILABLE · GLOBE FALLBACK'}</span><span>ECCO2 · 2007–2008</span></div>
    <div className="globe-region"><span className="eyebrow">SELECTED REGION</span><h3>{active.name}</h3><p>{active.detail}</p>
      <div className="region-pills" role="group" aria-label="Select region">{locations.map((location) => <button key={location.name} className={active.name === location.name ? 'selected' : ''} aria-pressed={active.name === location.name} onClick={() => { setActive(location); const canvas = hostRef.current?.querySelector('canvas'); canvas?.focus() }}>{location.name}</button>)}</div>
    </div>
    <p className="globe-credit">Globe texture: NASA SVS #3912. Region markers are exploration entry points, not localized measurements.</p>
  </div>
}
