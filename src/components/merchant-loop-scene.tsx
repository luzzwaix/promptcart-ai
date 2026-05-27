"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type LoopNode = {
  label: string;
  kind: "live" | "demo" | "ai" | "margin";
  position: THREE.Vector3;
};

const LOOP_NODES: LoopNode[] = [
  {
    label: "Request",
    kind: "live",
    position: new THREE.Vector3(-3.4, 1.28, 0.08),
  },
  {
    label: "Profit Gate",
    kind: "live",
    position: new THREE.Vector3(-1.25, 2.0, 0.22),
  },
  {
    label: "Checkout Event",
    kind: "demo",
    position: new THREE.Vector3(1.55, 1.56, 0.16),
  },
  {
    label: "AI Fulfillment",
    kind: "demo",
    position: new THREE.Vector3(3.35, 0.26, -0.04),
  },
  {
    label: "Delivery Receipt",
    kind: "ai",
    position: new THREE.Vector3(1.82, -1.28, -0.18),
  },
  {
    label: "Margin",
    kind: "margin",
    position: new THREE.Vector3(-3.25, -0.66, 0.03),
  },
];

const NODE_COLORS = {
  live: 0x1e6b63,
  demo: 0xb9803f,
  ai: 0x184f4a,
  margin: 0x25684e,
};

const LABEL_OFFSETS: Record<string, { x: number; y: number }> = {
  Request: { x: -0.1, y: -0.62 },
  "Profit Gate": { x: 0, y: 0.42 },
  "Checkout Event": { x: 0.06, y: 0.58 },
  "AI Fulfillment": { x: -0.06, y: 0.58 },
  "Delivery Receipt": { x: -0.12, y: -0.56 },
  Margin: { x: -0.1, y: -0.56 },
};

function createLabelTexture(label: string, kind: LoopNode["kind"]) {
  const canvas = document.createElement("canvas");
  canvas.width = 720;
  canvas.height = 180;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Canvas labels are unavailable");
  }

  const accent =
    kind === "demo" ? "#b9803f" : kind === "ai" ? "#184f4a" : "#1e6b63";

  context.clearRect(0, 0, canvas.width, canvas.height);
  context.shadowColor = "rgba(42, 37, 29, 0.18)";
  context.shadowBlur = 26;
  context.shadowOffsetY = 8;
  context.fillStyle = "rgba(255, 252, 247, 0.995)";
  context.strokeStyle = "rgba(46, 55, 50, 0.48)";
  context.lineWidth = 5;
  context.beginPath();
  context.roundRect(16, 16, 688, 148, 28);
  context.fill();
  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetY = 0;
  context.stroke();

  context.fillStyle = accent;
  context.beginPath();
  context.arc(62, 90, 10, 0, Math.PI * 2);
  context.fill();

  context.fillStyle = "#101713";
  context.font = "900 66px Arial, Helvetica, sans-serif";
  context.textBaseline = "middle";
  context.fillText(label, 88, 90, 590);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose());
    return;
  }
  material.dispose();
}

function smoothInfluence(distance: number, radius: number) {
  const clamped = Math.max(0, Math.min(1, 1 - distance / radius));
  return clamped * clamped * (3 - 2 * clamped);
}

export function MerchantLoopScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [webglFailed, setWebglFailed] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    let renderer: THREE.WebGLRenderer;

    try {
      renderer = new THREE.WebGLRenderer({
        alpha: true,
        antialias: true,
        canvas,
        powerPreference: "high-performance",
      });
    } catch {
      const fallbackTimer = window.setTimeout(() => setWebglFailed(true), 0);
      return () => window.clearTimeout(fallbackTimer);
    }

    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-4.4, 4.4, 2.75, -2.75, 0.1, 20);
    camera.position.set(0, -0.34, 8);
    camera.lookAt(0, 0, 0);

    const group = new THREE.Group();
    scene.add(group);

    const ambient = new THREE.AmbientLight(0xfffbf2, 1.9);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.55);
    keyLight.position.set(-3, 4, 5);
    scene.add(keyLight);

    const brassLight = new THREE.PointLight(0xb9803f, 1.1, 7);
    brassLight.position.set(2.8, 1.6, 2.2);
    scene.add(brassLight);

    const curve = new THREE.CatmullRomCurve3(
      [...LOOP_NODES.map((node) => node.position), LOOP_NODES[0].position],
      true,
      "catmullrom",
      0.65,
    );
    const tubeGeometry = new THREE.TubeGeometry(curve, 220, 0.052, 18, true);
    const tubeMaterial = new THREE.MeshStandardMaterial({
      color: 0x2c5f58,
      emissive: 0x1e6b63,
      emissiveIntensity: 0.055,
      metalness: 0.08,
      roughness: 0.42,
      transparent: true,
      opacity: 0.39,
    });
    const circuitTube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    group.add(circuitTube);

    const glowTubeGeometry = new THREE.TubeGeometry(curve, 220, 0.098, 18, true);
    const glowTubeMaterial = new THREE.MeshBasicMaterial({
      color: 0x1e6b63,
      transparent: true,
      opacity: 0.07,
      depthWrite: false,
    });
    const glowTube = new THREE.Mesh(glowTubeGeometry, glowTubeMaterial);
    group.add(glowTube);

    const nodeCoreGeometry = new THREE.SphereGeometry(0.17, 36, 20);
    const nodeBaseGeometry = new THREE.CylinderGeometry(0.26, 0.26, 0.06, 40);
    const nodeRingGeometry = new THREE.TorusGeometry(0.245, 0.014, 10, 40);
    const nodeGroups: THREE.Group[] = [];
    const baseMaterials: THREE.MeshStandardMaterial[] = [];
    const nodeMaterials: THREE.MeshStandardMaterial[] = [];
    const ringMaterials: THREE.MeshBasicMaterial[] = [];
    const labelSprites: THREE.Sprite[] = [];
    const labelTextures: THREE.CanvasTexture[] = [];

    LOOP_NODES.forEach((node) => {
      const nodeGroup = new THREE.Group();
      nodeGroup.position.copy(node.position);
      nodeGroup.position.z += 0.08;
      group.add(nodeGroup);
      nodeGroups.push(nodeGroup);

      const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0xfffaf3,
        metalness: 0.22,
        roughness: 0.62,
        transparent: true,
        opacity: 0.72,
      });
      const base = new THREE.Mesh(nodeBaseGeometry, baseMaterial);
      base.rotation.x = Math.PI / 2;
      base.position.z = -0.035;
      nodeGroup.add(base);
      baseMaterials.push(baseMaterial);

      const material = new THREE.MeshStandardMaterial({
        color: NODE_COLORS[node.kind],
        metalness: 0.28,
        roughness: 0.38,
        emissive: NODE_COLORS[node.kind],
        emissiveIntensity: 0.06,
      });
      const mesh = new THREE.Mesh(nodeCoreGeometry, material);
      mesh.position.z = 0.08;
      nodeGroup.add(mesh);
      nodeMaterials.push(material);

      const ringMaterial = new THREE.MeshBasicMaterial({
        color: NODE_COLORS[node.kind],
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(nodeRingGeometry, ringMaterial);
      ring.position.z = 0.11;
      nodeGroup.add(ring);
      ringMaterials.push(ringMaterial);

      const texture = createLabelTexture(node.label, node.kind);
      const spriteMaterial = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
      });
      const sprite = new THREE.Sprite(spriteMaterial);
      const offset = LABEL_OFFSETS[node.label] ?? {
        x: 0,
        y: node.position.y > 0 ? 0.54 : -0.54,
      };
      sprite.position.copy(node.position);
      sprite.position.x += offset.x;
      sprite.position.y += offset.y;
      sprite.position.z += 0.42;
      sprite.scale.set(1.82, 0.52, 1);
      group.add(sprite);
      labelSprites.push(sprite);
      labelTextures.push(texture);
    });

    const pulseGeometry = new THREE.SphereGeometry(0.12, 30, 16);
    const pulseMaterial = new THREE.MeshStandardMaterial({
      color: 0xb9803f,
      emissive: 0xb9803f,
      emissiveIntensity: 0.7,
      metalness: 0.36,
      roughness: 0.28,
    });
    const pulse = new THREE.Mesh(pulseGeometry, pulseMaterial);
    group.add(pulse);

    const trailGeometry = new THREE.SphereGeometry(0.068, 22, 12);
    const trailMaterials = [0.38, 0.26, 0.16, 0.1].map(
      (opacity) =>
        new THREE.MeshBasicMaterial({
          color: 0xb9803f,
          transparent: true,
          opacity,
          depthWrite: false,
        }),
    );
    const trailParticles = trailMaterials.map((material) => {
      const particle = new THREE.Mesh(trailGeometry, material);
      group.add(particle);
      return particle;
    });

    const arrowGeometry = new THREE.ConeGeometry(0.055, 0.16, 3);
    const arrowMaterial = new THREE.MeshBasicMaterial({
      color: 0xb9803f,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
    });
    LOOP_NODES.forEach((node, index) => {
      const nextNode = LOOP_NODES[(index + 1) % LOOP_NODES.length];
      const midPoint = node.position.clone().lerp(nextNode.position, 0.52);
      const direction = nextNode.position.clone().sub(node.position);
      const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
      arrow.position.set(midPoint.x, midPoint.y, midPoint.z + 0.22);
      arrow.rotation.z = -Math.atan2(direction.x, direction.y);
      arrow.scale.set(0.8, 0.8, 0.8);
      group.add(arrow);
    });

    const shadowGeometry = new THREE.CircleGeometry(3.65, 96);
    const shadowMaterial = new THREE.MeshBasicMaterial({
      color: 0x1e6b63,
      transparent: true,
      opacity: 0.045,
      depthWrite: false,
    });
    const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    shadow.scale.set(1, 0.56, 1);
    shadow.position.z = -0.3;
    group.add(shadow);

    group.rotation.x = -0.11;
    group.rotation.z = -0.035;

    let animationFrame = 0;
    const startedAt = performance.now();

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);

      const aspect = width / height;
      const viewHeight = width < 640 ? 6.45 : 5.8;
      const viewWidth = width < 640 ? 8.25 : viewHeight * aspect;
      camera.left = -viewWidth / 2;
      camera.right = viewWidth / 2;
      camera.top = viewHeight / 2;
      camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix();

      const mobileScale = width < 640 ? 0.84 : 1.0;
      group.scale.set(mobileScale, mobileScale, mobileScale);
    };

    const animate = () => {
      const elapsed = (performance.now() - startedAt) / 1000;
      const flowProgress = (elapsed * 0.075) % 1;
      const pulsePosition = curve.getPoint(flowProgress);
      pulse.position.copy(pulsePosition);
      pulse.position.z += 0.38;

      trailParticles.forEach((particle, index) => {
        const trailProgress =
          (flowProgress - (index + 1) * 0.026 + 1) % 1;
        const trailPosition = curve.getPoint(trailProgress);
        particle.position.copy(trailPosition);
        particle.position.z += 0.31 - index * 0.018;
        const trailScale = 1 - index * 0.12;
        particle.scale.set(trailScale, trailScale, trailScale);
      });

      nodeGroups.forEach((nodeGroup, index) => {
        const distance = pulsePosition.distanceTo(LOOP_NODES[index].position);
        const influence = smoothInfluence(distance, 1.12);
        const scale = 1 + influence * 0.34 + Math.sin(elapsed * 2.4 + index) * 0.018;
        nodeGroup.scale.set(scale, scale, scale);
        nodeMaterials[index].emissiveIntensity = 0.06 + influence * 0.28;
        ringMaterials[index].opacity = 0.2 + influence * 0.28;
      });

      group.rotation.x = -0.11 + Math.sin(elapsed * 0.22) * 0.018;
      group.rotation.z = -0.035 + Math.sin(elapsed * 0.18) * 0.018;
      group.position.y = 0.04 + Math.sin(elapsed * 0.2) * 0.03;

      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener("resize", resize);
    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.cancelAnimationFrame(animationFrame);
      tubeGeometry.dispose();
      tubeMaterial.dispose();
      glowTubeGeometry.dispose();
      glowTubeMaterial.dispose();
      nodeCoreGeometry.dispose();
      nodeBaseGeometry.dispose();
      nodeRingGeometry.dispose();
      baseMaterials.forEach((material) => material.dispose());
      nodeMaterials.forEach((material) => material.dispose());
      ringMaterials.forEach((material) => material.dispose());
      labelSprites.forEach((sprite) => disposeMaterial(sprite.material));
      labelTextures.forEach((texture) => texture.dispose());
      pulseGeometry.dispose();
      pulseMaterial.dispose();
      trailGeometry.dispose();
      trailMaterials.forEach((material) => material.dispose());
      arrowGeometry.dispose();
      arrowMaterial.dispose();
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  if (webglFailed) {
    return (
      <div className="merchant-loop-fallback" aria-label="Merchant loop map">
        {LOOP_NODES.map((node, index) => (
          <div className={`loop-fallback-node loop-${node.kind}`} key={node.label}>
            <span>{index + 1}</span>
            <strong>{node.label}</strong>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="merchant-loop-wrap">
      <div className="merchant-loop-scene" aria-label="Merchant loop 3D flow map">
        <canvas ref={canvasRef} />
      </div>
      <p className="merchant-loop-note">
        MarginPilot routes each request through profit judgment, simulated
        settlement, AI fulfillment, delivery receipt, and retained margin.
      </p>
    </div>
  );
}
