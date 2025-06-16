import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';

const RetroDNAVisualizer: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const dnaGroupRef = useRef<THREE.Group | null>(null);

  const STRAND_COLOR_1 = 0x00ff00; // Neon Green
  const STRAND_COLOR_2 = 0x00ffff; // Neon Cyan
  const BASE_PAIR_COLORS = [0xff00ff, 0xffff00, 0xff69b4, 0xdda0dd]; // Magenta, Yellow, HotPink, Plum (Pastel/Neon)
  
  const NUM_BASE_PAIRS = 40;
  const HELIX_RADIUS = 1.5;
  const HELIX_HEIGHT_PER_TURN = 6; // Height for one full 360-degree turn
  const BASE_PAIR_SPACING = HELIX_HEIGHT_PER_TURN / 10; // 10 base pairs per turn
  const TOTAL_HELIX_HEIGHT = NUM_BASE_PAIRS * BASE_PAIR_SPACING;
  const STRAND_TUBE_RADIUS = 0.1;
  const BASE_PAIR_RADIUS = 0.08;
  const BASE_PAIR_LENGTH = HELIX_RADIUS * 1.8;


  const createDNAHelix = useCallback(() => {
    const group = new THREE.Group();

    // Materials
    const strandMaterial1 = new THREE.MeshPhongMaterial({ color: STRAND_COLOR_1, shininess: 80 });
    const strandMaterial2 = new THREE.MeshPhongMaterial({ color: STRAND_COLOR_2, shininess: 80 });
    const basePairMaterials = BASE_PAIR_COLORS.map(color => 
      new THREE.MeshPhongMaterial({ color: color, emissive: color, emissiveIntensity: 0.2, shininess: 50 })
    );

    // Helix Path Function
    const createHelixPath = (offsetAngle: number) => {
      const points = [];
      for (let i = 0; i <= NUM_BASE_PAIRS * 2; i++) { // More points for smoother curve
        const t = i / (NUM_BASE_PAIRS * 2); // Normalized position along the helix
        const angle = t * (TOTAL_HELIX_HEIGHT / HELIX_HEIGHT_PER_TURN) * 2 * Math.PI + offsetAngle;
        const y = t * TOTAL_HELIX_HEIGHT - TOTAL_HELIX_HEIGHT / 2; // Center helix vertically
        points.push(new THREE.Vector3(HELIX_RADIUS * Math.cos(angle), y, HELIX_RADIUS * Math.sin(angle)));
      }
      return new THREE.CatmullRomCurve3(points);
    };

    // Strands
    const path1 = createHelixPath(0);
    const path2 = createHelixPath(Math.PI); // Offset by 180 degrees for the second strand

    const strandGeometry1 = new THREE.TubeGeometry(path1, NUM_BASE_PAIRS * 5, STRAND_TUBE_RADIUS, 8, false);
    const strand1 = new THREE.Mesh(strandGeometry1, strandMaterial1);
    group.add(strand1);

    const strandGeometry2 = new THREE.TubeGeometry(path2, NUM_BASE_PAIRS * 5, STRAND_TUBE_RADIUS, 8, false);
    const strand2 = new THREE.Mesh(strandGeometry2, strandMaterial2);
    group.add(strand2);
    
    // Base Pairs
    for (let i = 0; i < NUM_BASE_PAIRS; i++) {
      const t = i / (NUM_BASE_PAIRS -1); // Normalized position for this base pair
      const y = i * BASE_PAIR_SPACING - TOTAL_HELIX_HEIGHT / 2;
      
      // Angle for this base pair on the first strand
      const angle1 = (y / HELIX_HEIGHT_PER_TURN) * 2 * Math.PI; 
      
      const p1 = new THREE.Vector3(HELIX_RADIUS * Math.cos(angle1), y, HELIX_RADIUS * Math.sin(angle1));
      // The corresponding point on the second strand is directly opposite
      const p2 = new THREE.Vector3(HELIX_RADIUS * Math.cos(angle1 + Math.PI), y, HELIX_RADIUS * Math.sin(angle1 + Math.PI));
      
      const basePairGeometry = new THREE.CylinderGeometry(BASE_PAIR_RADIUS, BASE_PAIR_RADIUS, BASE_PAIR_LENGTH, 8);
      const basePairMaterial = basePairMaterials[i % basePairMaterials.length];
      const basePair = new THREE.Mesh(basePairGeometry, basePairMaterial);
      
      // Position and orient the cylinder
      basePair.position.copy(p1).add(p2).multiplyScalar(0.5); // Midpoint
      basePair.lookAt(p1); // Orient along the p1-p2 axis
      basePair.rotateOnAxis(new THREE.Vector3(1,0,0), Math.PI / 2); // Correct orientation for cylinder

      group.add(basePair);
    }
    return group;
  }, [BASE_PAIR_RADIUS, BASE_PAIR_LENGTH, HELIX_HEIGHT_PER_TURN, HELIX_RADIUS, NUM_BASE_PAIRS, STRAND_TUBE_RADIUS, TOTAL_HELIX_HEIGHT, BASE_PAIR_SPACING, BASE_PAIR_COLORS, STRAND_COLOR_1, STRAND_COLOR_2]);

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;

    // Scene
    sceneRef.current = new THREE.Scene();
    sceneRef.current.background = new THREE.Color(0x1a1a1a); // Dark retro background

    // Camera
    cameraRef.current = new THREE.PerspectiveCamera(60, currentMount.clientWidth / currentMount.clientHeight, 0.1, 100);
    cameraRef.current.position.z = HELIX_RADIUS * 3.5;
    cameraRef.current.position.y = TOTAL_HELIX_HEIGHT * 0.1; // Slightly look down/up
    cameraRef.current.lookAt(0,0,0);


    // Renderer
    rendererRef.current = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current.setSize(currentMount.clientWidth, currentMount.clientHeight);
    rendererRef.current.setPixelRatio(window.devicePixelRatio);
    currentMount.appendChild(rendererRef.current.domElement);

    // DNA Helix
    dnaGroupRef.current = createDNAHelix();
    sceneRef.current.add(dnaGroupRef.current);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5); // Soft white light
    sceneRef.current.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight1.position.set(5, 5, 5);
    sceneRef.current.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x8888ff, 1);
    directionalLight2.position.set(-5, -3, 2);
    sceneRef.current.add(directionalLight2);
    
    // Animation loop
    const animate = () => {
      animationFrameIdRef.current = requestAnimationFrame(animate);
      if (dnaGroupRef.current) {
        dnaGroupRef.current.rotation.y += 0.003; // Slow rotation
        dnaGroupRef.current.rotation.x += 0.0005; // Subtle tilt
      }
      // Subtle camera movement (optional)
      if(cameraRef.current) {
        const time = Date.now() * 0.0001;
        cameraRef.current.position.x = Math.sin(time * 0.3) * 0.5;
        cameraRef.current.position.z = HELIX_RADIUS * 3.5 + Math.cos(time * 0.2) * 0.5;
        cameraRef.current.lookAt(0,0,0);
      }
      if(rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (mountRef.current && rendererRef.current && cameraRef.current) {
        const width = mountRef.current.clientWidth;
        const height = mountRef.current.clientHeight;
        rendererRef.current.setSize(width, height);
        cameraRef.current.aspect = width / height;
        cameraRef.current.updateProjectionMatrix();
      }
    };
    window.addEventListener('resize', handleResize);
    // Initial resize call to set correct dimensions if container already has size
    handleResize(); 

    return () => {
      // Cleanup Three.js objects
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (rendererRef.current.domElement.parentNode === currentMount) {
           currentMount.removeChild(rendererRef.current.domElement);
        }
      }
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
              } else {
                object.material.dispose();
              }
            }
          }
        });
      }
      sceneRef.current = null;
      cameraRef.current = null;
      rendererRef.current = null;
      dnaGroupRef.current = null;
    };
  }, [createDNAHelix, HELIX_RADIUS, TOTAL_HELIX_HEIGHT]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%', minHeight: '200px' }} role="img" aria-label="Animated 3D DNA helix visualization" />;
};

export default React.memo(RetroDNAVisualizer);