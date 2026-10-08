import {
  ACESFilmicToneMapping,
  AmbientLight,
  BufferAttribute,
  BufferGeometry,
  DirectionalLight,
  DoubleSide,
  IcosahedronGeometry,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PointLight,
  Points,
  PointsMaterial,
  Scene,
  SRGBColorSpace,
  Vector2,
  WebGLRenderer
} from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export function mountGlassScene(canvas: HTMLCanvasElement): void {
  if (document.hidden || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  let renderer: WebGLRenderer | undefined;
  let composer: EffectComposer | undefined;
  let scene: Scene | undefined;
  let camera: PerspectiveCamera | undefined;
  let resizeObserver: ResizeObserver | undefined;
  let animationFrame = 0;
  let previousFrame = 0;
  let pointerX = 0;
  let pointerY = 0;
  const glassObjects: Mesh[] = [];

  const onPointerMove = (event: PointerEvent) => {
    pointerX = (event.clientX / window.innerWidth - 0.5) * 0.42;
    pointerY = (event.clientY / window.innerHeight - 0.5) * 0.24;
  };

  const stop = () => {
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    animationFrame = 0;
    window.removeEventListener('pointermove', onPointerMove);
  };

  const dispose = () => {
    stop();
    resizeObserver?.disconnect();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.matchMedia('(prefers-reduced-motion: reduce)').removeEventListener('change', onMotionPreferenceChange);
    composer?.dispose();
    scene?.traverse((object) => {
      if (object instanceof Mesh || object instanceof Points) object.geometry.dispose();
    });
    renderer?.dispose();
    renderer?.domElement.remove();
  };

  const pause = () => stop();
  const resume = () => {
    if (!document.hidden && !window.matchMedia('(prefers-reduced-motion: reduce)').matches && !animationFrame) {
      window.addEventListener('pointermove', onPointerMove, { passive: true });
      animationFrame = window.requestAnimationFrame(render);
    }
  };
  const onVisibilityChange = () => (document.hidden ? pause() : resume());
  const onMotionPreferenceChange = (event: MediaQueryListEvent) => (event.matches ? pause() : resume());

  const render = (timestamp: number) => {
    animationFrame = 0;
    if (!composer || !camera || document.hidden) return;
    if (timestamp - previousFrame < 1000 / 30) {
      animationFrame = window.requestAnimationFrame(render);
      return;
    }
    previousFrame = timestamp;
    const seconds = timestamp * 0.00018;
    glassObjects.forEach((mesh) => {
      const phase = mesh.userData.phase as number;
      mesh.rotation.x += 0.0012;
      mesh.rotation.y += 0.0017;
      mesh.position.y = (mesh.userData.baseY as number) + Math.sin(seconds + phase) * 0.035;
    });
    camera.position.x += (pointerX - camera.position.x * 0.05) * 0.008;
    camera.position.y += (-pointerY - camera.position.y * 0.05) * 0.008;
    camera.lookAt(0, 0, 0);
    composer.render();
    animationFrame = window.requestAnimationFrame(render);
  };

  try {
    const width = window.innerWidth;
    const height = window.innerHeight;
    scene = new Scene();
    camera = new PerspectiveCamera(38, width / height, 0.1, 80);
    camera.position.z = 12;

    renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: 'low-power',
      premultipliedAlpha: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.1, 1400 / width));
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.86;

    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new Vector2(width, height), 0.22, 0.32, 0.78));

    scene.add(new AmbientLight(0xe8e0d3, 1.3));
    const keyLight = new DirectionalLight(0xffead1, 3);
    keyLight.position.set(-4, 5, 8);
    scene.add(keyLight);
    const rimLight = new PointLight(0xb6c8d5, 8, 24, 2);
    rimLight.position.set(4, -2, 6);
    scene.add(rimLight);

    const glassMaterial = new MeshPhysicalMaterial({
      color: 0xe5e0d5,
      metalness: 0.05,
      roughness: 0.16,
      transmission: 0.92,
      thickness: 1.2,
      ior: 1.22,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      side: DoubleSide
    });
    const sizes = [0.7, 0.46, 0.58, 0.38, 0.64, 0.42];
    const placements: [number, number, number][] = [
      [-5.2, 3.1, -2.5],
      [4.3, 2.4, -1.8],
      [-3.9, -2.2, -2.6],
      [5.3, -2.8, -1.4],
      [0.8, 3.7, -3.2],
      [1.7, -3.5, -2.3]
    ];

    sizes.forEach((size, index) => {
      const mesh = new Mesh(new IcosahedronGeometry(size, index % 3 === 0 ? 2 : 1), glassMaterial);
      mesh.position.set(...placements[index]);
      mesh.rotation.set(index * 0.55, index * 0.9, index * 0.22);
      mesh.userData.phase = index * 1.7;
      mesh.userData.baseY = mesh.position.y;
      glassObjects.push(mesh);
      scene?.add(mesh);
    });

    const count = width < 700 ? 70 : 145;
    const particlePositions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      particlePositions[index * 3] = (Math.random() - 0.5) * 18;
      particlePositions[index * 3 + 1] = (Math.random() - 0.5) * 11;
      particlePositions[index * 3 + 2] = -1 - Math.random() * 8;
    }
    const particleGeometry = new BufferGeometry();
    particleGeometry.setAttribute('position', new BufferAttribute(particlePositions, 3));
    scene.add(new Points(
      particleGeometry,
      new PointsMaterial({ color: 0xb6c1c4, size: 0.018, transparent: true, opacity: 0.42, sizeAttenuation: true })
    ));

    const resize = () => {
      if (!renderer || !composer || !camera) return;
      const nextWidth = window.innerWidth;
      const nextHeight = window.innerHeight;
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.1, 1400 / nextWidth));
      renderer.setSize(nextWidth, nextHeight);
      composer.setSize(nextWidth, nextHeight);
    };
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(document.documentElement);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', onMotionPreferenceChange);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    animationFrame = window.requestAnimationFrame(render);
  } catch (error) {
    dispose();
    console.warn('The decorative glass scene could not initialize; the page remains available without WebGL.', error);
  }
}
