import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { oceanRegions } from '../../data/oceanRegions'

const EARTH_TEXTURE = '/nasa/ocean-currents/images/global_ecco2_temperature_currents.jpg'
const MIN_CAMERA_DISTANCE = 3.8
const MAX_CAMERA_DISTANCE = 6.6

function spherePosition(lat: number, lon: number, radius: number) {
  const phi = (90 - lat) * Math.PI / 180
  const theta = (lon + 180) * Math.PI / 180
  return new THREE.Vector3(-radius * Math.sin(phi) * Math.cos(theta), radius * Math.cos(phi), radius * Math.sin(phi) * Math.sin(theta))
}

type EarthGlobeProps = {
  selectedRegionId: string
  onRegionSelect: (regionId: string) => void
}

export function EarthGlobe({ selectedRegionId, onRegionSelect }: EarthGlobeProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const selectedRegionIdRef = useRef(selectedRegionId)
  const onRegionSelectRef = useRef(onRegionSelect)
  const targetCameraDistanceRef = useRef(5.25)
  const hoveredRegionIdRef = useRef<string | null>(null)
  const [textureState, setTextureState] = useState<'loading' | 'ready' | 'fallback'>('loading')
  const [webglAvailable, setWebglAvailable] = useState(true)

  selectedRegionIdRef.current = selectedRegionId
  onRegionSelectRef.current = onRegionSelect

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let disposed = false
    let frameId = 0
    let dragging = false
    let lastX = 0
    let lastY = 0
    let startX = 0
    let startY = 0
    let pointerMoved = false
    let pinchDistance = 0
    let velocity = 0
    let focusedRegionId: string | null = null
    let focusAnimating = false
    let focusStartedAt = 0
    const focusDuration = 1050
    const focusStart = new THREE.Quaternion()
    const focusTarget = new THREE.Quaternion()
    const cameraDirection = new THREE.Vector3(0, 0, 1)
    let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('user-reduced-motion')
    const pointers = new Map<number, { x: number; y: number }>()
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100)
    camera.position.z = targetCameraDistanceRef.current
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' })
    } catch {
      setWebglAvailable(false)
      setTextureState('fallback')
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.setClearColor(0x000000, 0)
    host.appendChild(renderer.domElement)
    const canvas = renderer.domElement
    canvas.setAttribute('aria-hidden', 'true')

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
    const ambient = new THREE.AmbientLight(0x8eaac9, 0.95)
    const sun = new THREE.DirectionalLight(0xe6f4ff, 2.2)
    sun.position.set(-3, 2, 4)
    const rim = new THREE.PointLight(0x38bdf8, 1.15, 0)
    rim.position.set(3, -1.5, -2.5)
    scene.add(ambient, sun, rim)

    const markers = oceanRegions.filter((region) => region.availabilityStatus === 'available').map((region) => {
      const point = new THREE.Mesh(
        new THREE.SphereGeometry(0.047, 16, 12),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 }),
      )
      point.position.copy(spherePosition(region.latitude, region.longitude, 1.575))
      point.userData.regionId = region.id
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.075, 0.092, 28),
        new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.95 }),
      )
      ring.position.copy(point.position.clone().normalize().multiplyScalar(0.012))
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), point.position.clone().normalize())
      ring.visible = false
      point.add(ring)
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

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updateReducedMotion = () => { reducedMotion = motionQuery.matches || document.documentElement.classList.contains('user-reduced-motion') }
    const preferenceObserver = new MutationObserver(updateReducedMotion)
    preferenceObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    motionQuery.addEventListener('change', updateReducedMotion)

    const animate = () => {
      frameId = window.requestAnimationFrame(animate)
      const selectedId = selectedRegionIdRef.current
      if (selectedId !== focusedRegionId) {
        focusedRegionId = selectedId
        const selectedMarker = markers.find((marker) => marker.userData.regionId === selectedId)
        velocity = 0
        if (selectedMarker) {
          focusStart.copy(earth.quaternion)
          focusTarget.setFromUnitVectors(selectedMarker.position.clone().normalize(), cameraDirection)
          if (reducedMotion) {
            earth.quaternion.copy(focusTarget)
            focusAnimating = false
          } else {
            focusStartedAt = performance.now()
            focusAnimating = true
          }
        } else {
          focusAnimating = false
        }
      }
      if (focusAnimating && !dragging) {
        const progress = Math.min(1, (performance.now() - focusStartedAt) / focusDuration)
        const easedProgress = progress * progress * (3 - 2 * progress)
        earth.quaternion.slerpQuaternions(focusStart, focusTarget, easedProgress)
        if (progress >= 1) focusAnimating = false
      } else if (!dragging && !focusAnimating) {
        // Keep an active selection in view. Resume the ambient turn only when
        // there is no selected region; post-drag inertia remains user-driven.
        if (!selectedId && !reducedMotion) earth.rotation.y += 0.00045
        if (!selectedId || Math.abs(velocity) > 0.00001) earth.rotation.y += velocity
      }
      velocity *= reducedMotion ? 0 : 0.96
      camera.position.z = reducedMotion
        ? targetCameraDistanceRef.current
        : THREE.MathUtils.lerp(camera.position.z, targetCameraDistanceRef.current, 0.16)
      for (const marker of markers) {
        const isSelected = marker.userData.regionId === selectedRegionIdRef.current
        const isHovered = marker.userData.regionId === hoveredRegionIdRef.current
        const targetScale = isSelected ? 1.65 : isHovered ? 1.35 : 1
        marker.scale.setScalar(reducedMotion ? targetScale : THREE.MathUtils.lerp(marker.scale.x, targetScale, 0.22))
        ;(marker.material as THREE.MeshBasicMaterial).color.setHex(isSelected ? 0x4ade80 : 0x38bdf8)
        marker.children[0].visible = isSelected
      }
      renderer.render(scene, camera)
    }
    animate()

    const setZoomTarget = (distance: number) => {
      targetCameraDistanceRef.current = Math.max(MIN_CAMERA_DISTANCE, Math.min(MAX_CAMERA_DISTANCE, distance))
      if (reducedMotion) camera.position.z = targetCameraDistanceRef.current
    }
    const raycastMarkerAt = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect()
      const pointer = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1)
      const raycaster = new THREE.Raycaster()
      raycaster.setFromCamera(pointer, camera)
      return raycaster.intersectObjects(markers, false)[0]?.object
    }
    const onDown = (event: PointerEvent) => {
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      canvas.setPointerCapture(event.pointerId)
      pointerMoved = false
      if (pointers.size > 1) {
        dragging = false
        const [first, second] = [...pointers.values()]
        pinchDistance = Math.hypot(first.x - second.x, first.y - second.y)
        return
      }
      dragging = true
      startX = lastX = event.clientX
      startY = lastY = event.clientY
    }
    const onMove = (event: PointerEvent) => {
      if (pointers.has(event.pointerId)) pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.size > 1) {
        const [first, second] = [...pointers.values()]
        const nextDistance = Math.hypot(first.x - second.x, first.y - second.y)
        if (pinchDistance > 0) setZoomTarget(targetCameraDistanceRef.current + (pinchDistance - nextDistance) * 0.008)
        pinchDistance = nextDistance
        pointerMoved = true
        return
      }
      if (!dragging) {
        const hovered = raycastMarkerAt(event.clientX, event.clientY)
        hoveredRegionIdRef.current = (hovered?.userData.regionId as string | undefined) ?? null
        canvas.style.cursor = hovered ? 'pointer' : 'grab'
        return
      }
      const dx = event.clientX - lastX
      const dy = event.clientY - lastY
      if (Math.abs(event.clientX - startX) > 8 || Math.abs(event.clientY - startY) > 8) {
        pointerMoved = true
        // A real drag takes control from the focus animation and preserves
        // the user's chosen orientation instead of snapping back afterward.
        focusAnimating = false
        focusedRegionId = selectedRegionIdRef.current
      }
      earth.rotation.y += dx * 0.006
      earth.rotation.x = Math.max(-0.5, Math.min(0.5, earth.rotation.x + dy * 0.004))
      velocity = dx * 0.0008
      lastX = event.clientX
      lastY = event.clientY
    }
    const onUp = (event: PointerEvent) => {
      pointers.delete(event.pointerId)
      if (pointers.size === 1) {
        const remaining = [...pointers.values()][0]
        dragging = true
        startX = lastX = remaining.x
        startY = lastY = remaining.y
        pointerMoved = true
      } else {
        dragging = false
        canvas.style.cursor = hoveredRegionIdRef.current ? 'pointer' : 'grab'
      }
      pinchDistance = 0
    }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      setZoomTarget(targetCameraDistanceRef.current + event.deltaY * 0.003)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      const step = event.shiftKey ? 0.2 : 0.08
      if (event.key === 'ArrowLeft') earth.rotation.y -= step
      else if (event.key === 'ArrowRight') earth.rotation.y += step
      else if (event.key === 'ArrowUp') earth.rotation.x = Math.min(0.5, earth.rotation.x + step)
      else if (event.key === 'ArrowDown') earth.rotation.x = Math.max(-0.5, earth.rotation.x - step)
      else if (event.key === '+' || event.key === '=') setZoomTarget(targetCameraDistanceRef.current - 0.35)
      else if (event.key === '-') setZoomTarget(targetCameraDistanceRef.current + 0.35)
      else return
      event.preventDefault()
    }
    const onClick = (event: MouseEvent) => {
      if (pointerMoved) { pointerMoved = false; return }
      const selected = raycastMarkerAt(event.clientX, event.clientY)
      const id = selected?.userData.regionId as string | undefined
      if (id) onRegionSelectRef.current(id)
    }
    canvas.tabIndex = 0
    canvas.setAttribute('role', 'application')
    canvas.setAttribute('aria-label', 'Interactive 3D Earth. Use arrow keys to rotate and plus or minus to zoom. Drag to rotate, scroll to zoom, or pinch on touch screens. Choose regions using the accessible region list.')
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
      preferenceObserver.disconnect()
      motionQuery.removeEventListener('change', updateReducedMotion)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onUp)
      canvas.removeEventListener('wheel', onWheel)
      canvas.removeEventListener('click', onClick)
      canvas.removeEventListener('keydown', onKeyDown)
      texture?.dispose()
      sphere.geometry.dispose()
      atmosphere.geometry.dispose()
      ;(sphere.material as THREE.Material).dispose()
      ;(atmosphere.material as THREE.Material).dispose()
      markers.forEach((marker) => {
        marker.geometry.dispose()
        ;(marker.material as THREE.Material).dispose()
        const ring = marker.children[0] as THREE.Mesh
        ring.geometry.dispose()
        ;(ring.material as THREE.Material).dispose()
      })
      renderer.dispose()
      if (host.contains(canvas)) host.removeChild(canvas)
    }
  }, [])

  const changeZoom = (amount: number) => {
    targetCameraDistanceRef.current = Math.max(MIN_CAMERA_DISTANCE, Math.min(MAX_CAMERA_DISTANCE, targetCameraDistanceRef.current + amount))
  }

  return <div className="globe-view">
    <div className="globe-canvas" ref={hostRef} aria-describedby="globe-instructions">
      {!webglAvailable && <div className="globe-fallback" role="img" aria-label="Static Earth globe illustration">
        <div className="earth-globe"><div className="earth-shade" /><div className="earth-grid" /></div>
      </div>}
      <div className="globe-zoom-controls" role="group" aria-label="Globe zoom controls">
        <button type="button" onClick={() => changeZoom(-0.45)} disabled={!webglAvailable} aria-label="Zoom in on the globe">+</button>
        <button type="button" onClick={() => changeZoom(0.45)} disabled={!webglAvailable} aria-label="Zoom out on the globe">−</button>
      </div>
    </div>
    <div className="globe-instructions" id="globe-instructions"><span><b>Mouse</b> drag to rotate · scroll to zoom</span><span><b>Touch</b> drag to rotate · pinch to zoom</span><span><b>Keyboard</b> arrows rotate · + / − zoom</span></div>
    <div className="globe-status"><span>{textureState === 'ready' ? 'NASA SVS #3912 TEXTURE' : textureState === 'loading' ? 'LOADING NASA TEXTURE' : 'NASA IMAGE UNAVAILABLE · GLOBE FALLBACK'}</span><span>Approximate region markers · ECCO2 visualization</span></div>
  </div>
}
