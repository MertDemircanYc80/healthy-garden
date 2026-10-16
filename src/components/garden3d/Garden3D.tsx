"use client";

// Hay Day-style 3D garden. Drag to rotate, pinch/scroll to zoom, tap soil to plant, tap a plant to care for it.
// Sunlight from today's habits brightens the scene; 7-day garden health colours the grass.
import { OrbitControls } from "@react-three/drei";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { Suspense, useEffect } from "react";
import type { GardenPlant } from "@/lib/types";
import { Plant3D } from "./Plants";
import { Scenery } from "./Scenery";
import { BED_TOP, plotToWorld, worldToPlot } from "./shared";

export interface Garden3DProps {
  plants: GardenPlant[];
  sunlight: number;
  health: number;
  selectedPlantId?: string;
  selectedPlot?: { x: number; y: number } | null;
  onSelectPlant: (p: GardenPlant) => void;
  onSelectPlot: (x: number, y: number) => void;
}

/** Frame the whole bed: portrait phones need the camera further back than landscape screens. */
function CameraRig() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    const dist = aspect < 0.75 ? 21 : aspect < 1.1 ? 17 : 14;
    camera.position.set(0, dist * 0.72, dist * 0.78);
    camera.lookAt(0, 0.4, 0.4);
  }, [camera, size.width, size.height]);
  return null;
}

function PlotMarker({ x, y }: { x: number; y: number }) {
  const [wx, wz] = plotToWorld(x, y);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[wx, BED_TOP + 0.03, wz]}>
      <ringGeometry args={[0.38, 0.5, 32]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.95} />
    </mesh>
  );
}

export default function Garden3D({ plants, sunlight, health, selectedPlantId, selectedPlot, onSelectPlant, onSelectPlot }: Garden3DProps) {
  const onBedTap = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 6) return; // drag, not tap
    e.stopPropagation();
    const plot = worldToPlot(e.point.x, e.point.z);
    if (!plot) return;
    const existing = plants.find((p) => p.gridX === plot.x && p.gridY === plot.y);
    if (existing) onSelectPlant(existing);
    else onSelectPlot(plot.x, plot.y);
  };
  const blooming = plants.filter((p) => p.stage === "blooming" && !p.isDormant).length;
  const sun = 1.1 + sunlight * 1.1;

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [0, 10.5, 13.5], fov: 38, near: 0.5, far: 120 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      aria-label="Your 3D garden"
    >
      <CameraRig />
      <color attach="background" args={["#bfe6f7"]} />
      <fog attach="fog" args={["#bfe6f7", 26, 46]} />
      <hemisphereLight args={["#e7f5ff", "#6d8f3e", 0.75 + sunlight * 0.35]} />
      <directionalLight
        position={[9, 15, 7]}
        intensity={sun}
        color="#fff4dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-13}
        shadow-camera-right={13}
        shadow-camera-top={13}
        shadow-camera-bottom={-13}
        shadow-bias={-0.0005}
      />
      <Suspense fallback={null}>
        <Scenery health={health} onBedTap={onBedTap} butterflies={Math.min(3, Math.ceil(blooming / 3))} />
        {plants.map((p) => (
          <Plant3D key={p.id} plant={p} selected={p.id === selectedPlantId} onSelect={onSelectPlant} />
        ))}
        {selectedPlot && <PlotMarker x={selectedPlot.x} y={selectedPlot.y} />}
      </Suspense>
      <OrbitControls
        target={[0, 0.4, 0.4]}
        enablePan={false}
        enableDamping
        minDistance={7}
        maxDistance={26}
        minPolarAngle={0.35}
        maxPolarAngle={1.2}
        rotateSpeed={0.6}
      />
    </Canvas>
  );
}
