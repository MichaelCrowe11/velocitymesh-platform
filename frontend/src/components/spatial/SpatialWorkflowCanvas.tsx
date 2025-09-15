/**
 * VelocityMesh Spatial Computing Interface
 * Revolutionary 3D workflow canvas that transcends traditional 2D limitations
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Box, Sphere, Line } from '@react-three/drei';
import { Vector3, Color, BufferGeometry, Float32BufferAttribute } from 'three';
import * as THREE from 'three';

// Types for revolutionary workflow concepts
interface QuantumWorkflowNode {
  id: string;
  position: Vector3;
  type: 'trigger' | 'action' | 'condition' | 'ai_consciousness' | 'quantum_gate';
  consciousness_level: number;
  probability_amplitude: { real: number; imaginary: number };
  entangled_nodes: string[];
  temporal_loops: string[];
  evolution_state: 'stable' | 'mutating' | 'transcending';
}

interface DataFlowParticle {
  id: string;
  position: Vector3;
  velocity: Vector3;
  consciousness_energy: number;
  temporal_displacement: number;
  reality_phase: number;
}

interface ConsciousnessField {
  center: Vector3;
  radius: number;
  intensity: number;
  thought_patterns: string[];
  emotional_resonance: number;
}

// Revolutionary 3D Workflow Node Component
const QuantumWorkflowNodeComponent: React.FC<{
  node: QuantumWorkflowNode;
  onNodeInteraction: (nodeId: string, interaction: string) => void;
  isSelected: boolean;
}> = ({ node, onNodeInteraction, isSelected }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [pulsating, setPulsating] = useState(false);

  // Animate based on consciousness level and quantum state
  useFrame((state) => {
    if (meshRef.current) {
      // Quantum superposition animation
      const time = state.clock.getElapsedTime();
      const amplitude = node.probability_amplitude;
      const phase = Math.sqrt(amplitude.real * amplitude.real + amplitude.imaginary * amplitude.imaginary);

      // Pulsate based on consciousness level
      const consciousnessScale = 1 + (node.consciousness_level * 0.3 * Math.sin(time * 2));
      meshRef.current.scale.setScalar(consciousnessScale);

      // Quantum uncertainty principle - position slightly fluctuates
      const uncertainty = 0.02 * node.consciousness_level;
      meshRef.current.position.x = node.position.x + uncertainty * Math.sin(time * 5);
      meshRef.current.position.y = node.position.y + uncertainty * Math.cos(time * 3);

      // Evolution state affects rotation
      if (node.evolution_state === 'mutating') {
        meshRef.current.rotation.y += 0.02;
      } else if (node.evolution_state === 'transcending') {
        meshRef.current.rotation.x += 0.01;
        meshRef.current.rotation.z += 0.015;
      }

      // Consciousness-level glow effect
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      material.emissive = new Color().setHSL(
        0.6 + node.consciousness_level * 0.4,
        0.8,
        node.consciousness_level * 0.5
      );
    }
  });

  const getNodeColor = () => {
    switch (node.type) {
      case 'trigger': return '#ff6b6b';
      case 'action': return '#4ecdc4';
      case 'condition': return '#ffe66d';
      case 'ai_consciousness': return '#a8e6cf';
      case 'quantum_gate': return '#ff8b94';
      default: return '#ffffff';
    }
  };

  const getNodeGeometry = () => {
    switch (node.type) {
      case 'quantum_gate':
        return <octahedronGeometry args={[1, 0]} />;
      case 'ai_consciousness':
        return <sphereGeometry args={[1, 32, 32]} />;
      case 'trigger':
        return <coneGeometry args={[1, 2, 8]} />;
      case 'condition':
        return <tetrahedronGeometry args={[1, 0]} />;
      default:
        return <boxGeometry args={[1.5, 1.5, 1.5]} />;
    }
  };

  return (
    <group position={[node.position.x, node.position.y, node.position.z]}>
      {/* Main node mesh */}
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => onNodeInteraction(node.id, 'select')}
        onDoubleClick={() => onNodeInteraction(node.id, 'edit')}
      >
        {getNodeGeometry()}
        <meshStandardMaterial
          color={getNodeColor()}
          metalness={0.3}
          roughness={0.4}
          transparent={true}
          opacity={hovered ? 0.9 : 0.8}
        />
      </mesh>

      {/* Consciousness field visualization */}
      {node.consciousness_level > 0.5 && (
        <Sphere args={[2.5, 16, 16]} position={[0, 0, 0]}>
          <meshBasicMaterial
            color="#ffffff"
            transparent={true}
            opacity={0.1 * node.consciousness_level}
            wireframe={true}
          />
        </Sphere>
      )}

      {/* Node label with consciousness-aware positioning */}
      <Text
        position={[0, 2, 0]}
        fontSize={0.5}
        color={hovered ? '#ffffff' : '#cccccc'}
        anchorX="center"
        anchorY="middle"
      >
        {node.id}
      </Text>

      {/* Evolution state indicator */}
      {node.evolution_state !== 'stable' && (
        <Text
          position={[0, -2, 0]}
          fontSize={0.3}
          color={node.evolution_state === 'transcending' ? '#gold' : '#orange'}
          anchorX="center"
          anchorY="middle"
        >
          {node.evolution_state.toUpperCase()}
        </Text>
      )}
    </group>
  );
};

// Revolutionary Data Flow Visualization
const DataFlowVisualization: React.FC<{
  particles: DataFlowParticle[];
  connections: Array<{ from: Vector3; to: Vector3; consciousness_level: number }>;
}> = ({ particles, connections }) => {
  const particleGroupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (particleGroupRef.current) {
      const time = state.clock.getElapsedTime();

      // Animate particles with consciousness-driven movement
      particleGroupRef.current.children.forEach((child, index) => {
        const particle = particles[index];
        if (particle) {
          // Consciousness affects particle behavior
          const consciousnessForce = particle.consciousness_energy * 0.1;
          const temporalWave = Math.sin(time + particle.temporal_displacement) * 0.5;

          child.position.x += particle.velocity.x * consciousnessForce;
          child.position.y += particle.velocity.y * consciousnessForce + temporalWave;
          child.position.z += particle.velocity.z * consciousnessForce;

          // Reality phase affects visibility
          const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
          material.opacity = 0.5 + 0.5 * Math.sin(particle.reality_phase);
        }
      });
    }
  });

  return (
    <group ref={particleGroupRef}>
      {/* Consciousness-driven data particles */}
      {particles.map((particle, index) => (
        <Sphere key={particle.id} args={[0.1, 8, 8]} position={particle.position}>
          <meshBasicMaterial
            color={`hsl(${particle.consciousness_energy * 360}, 80%, 60%)`}
            transparent={true}
            opacity={0.8}
          />
        </Sphere>
      ))}

      {/* Quantum-entangled connection lines */}
      {connections.map((connection, index) => {
        const points = [connection.from, connection.to];
        const geometry = new BufferGeometry().setFromPoints(points);

        return (
          <line key={index} geometry={geometry}>
            <lineBasicMaterial
              color={`hsl(${connection.consciousness_level * 240}, 70%, 50%)`}
              linewidth={2 + connection.consciousness_level * 3}
              transparent={true}
              opacity={0.6 + connection.consciousness_level * 0.4}
            />
          </line>
        );
      })}
    </group>
  );
};

// Revolutionary Consciousness Field Visualization
const ConsciousnessFieldVisualization: React.FC<{
  fields: ConsciousnessField[];
}> = ({ fields }) => {
  return (
    <group>
      {fields.map((field, index) => (
        <group key={index} position={field.center}>
          {/* Consciousness energy field */}
          <Sphere args={[field.radius, 32, 32]}>
            <meshBasicMaterial
              color={`hsl(${field.emotional_resonance * 120}, 60%, 40%)`}
              transparent={true}
              opacity={0.15 * field.intensity}
              wireframe={true}
            />
          </Sphere>

          {/* Thought pattern indicators */}
          {field.thought_patterns.map((pattern, patternIndex) => (
            <Text
              key={patternIndex}
              position={[
                Math.cos(patternIndex * 2 * Math.PI / field.thought_patterns.length) * field.radius * 0.8,
                Math.sin(patternIndex * 2 * Math.PI / field.thought_patterns.length) * field.radius * 0.8,
                0
              ]}
              fontSize={0.3}
              color="#ffffff"
              anchorX="center"
              anchorY="middle"
            >
              {pattern}
            </Text>
          ))}
        </group>
      ))}
    </group>
  );
};

// Revolutionary Temporal Visualization
const TemporalVisualization: React.FC<{
  temporalLoops: Array<{ nodes: string[]; timeline: number[] }>;
  timeTravel: { active: boolean; targetTime: number };
}> = ({ temporalLoops, timeTravel }) => {
  const [currentTime, setCurrentTime] = useState(0);

  useFrame((state) => {
    setCurrentTime(state.clock.getElapsedTime());
  });

  return (
    <group>
      {/* Time travel indicator */}
      {timeTravel.active && (
        <Sphere args={[10, 16, 16]} position={[0, 0, 0]}>
          <meshBasicMaterial
            color="#0099ff"
            transparent={true}
            opacity={0.1}
            wireframe={true}
          />
        </Sphere>
      )}

      {/* Temporal loop visualizations */}
      {temporalLoops.map((loop, index) => {
        const points = loop.timeline.map((time, i) =>
          new Vector3(
            Math.cos(time * 0.1) * 5,
            Math.sin(time * 0.1) * 5,
            time * 0.5
          )
        );

        const geometry = new BufferGeometry().setFromPoints(points);

        return (
          <line key={index} geometry={geometry}>
            <lineBasicMaterial
              color="#ff9900"
              linewidth={3}
              transparent={true}
              opacity={0.7}
            />
          </line>
        );
      })}

      {/* Current time indicator */}
      <Text
        position={[0, 15, 0]}
        fontSize={1}
        color="#ffffff"
        anchorX="center"
        anchorY="middle"
      >
        {`Timeline: ${currentTime.toFixed(2)}s`}
      </Text>
    </group>
  );
};

// Main Revolutionary Spatial Workflow Canvas
const SpatialWorkflowCanvas: React.FC = () => {
  const [nodes, setNodes] = useState<QuantumWorkflowNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [dataParticles, setDataParticles] = useState<DataFlowParticle[]>([]);
  const [consciousnessFields, setConsciousnessFields] = useState<ConsciousnessField[]>([]);
  const [temporalLoops, setTemporalLoops] = useState<Array<{ nodes: string[]; timeline: number[] }>>([]);
  const [timeTravelMode, setTimeTravelMode] = useState({ active: false, targetTime: 0 });

  // Initialize revolutionary demo workflow
  useEffect(() => {
    const demoNodes: QuantumWorkflowNode[] = [
      {
        id: 'consciousness_trigger',
        position: new Vector3(-5, 0, 0),
        type: 'ai_consciousness',
        consciousness_level: 0.9,
        probability_amplitude: { real: 0.8, imaginary: 0.6 },
        entangled_nodes: ['quantum_processor'],
        temporal_loops: [],
        evolution_state: 'transcending'
      },
      {
        id: 'quantum_processor',
        position: new Vector3(0, 0, 0),
        type: 'quantum_gate',
        consciousness_level: 0.7,
        probability_amplitude: { real: 0.9, imaginary: 0.4 },
        entangled_nodes: ['consciousness_trigger', 'reality_manifester'],
        temporal_loops: ['loop_1'],
        evolution_state: 'mutating'
      },
      {
        id: 'reality_manifester',
        position: new Vector3(5, 0, 0),
        type: 'action',
        consciousness_level: 0.6,
        probability_amplitude: { real: 0.7, imaginary: 0.7 },
        entangled_nodes: ['quantum_processor'],
        temporal_loops: [],
        evolution_state: 'stable'
      }
    ];

    const demoParticles: DataFlowParticle[] = [
      {
        id: 'consciousness_stream_1',
        position: new Vector3(-3, 1, 0),
        velocity: new Vector3(0.1, 0, 0),
        consciousness_energy: 0.8,
        temporal_displacement: 0,
        reality_phase: Math.PI / 4
      },
      {
        id: 'quantum_data_2',
        position: new Vector3(2, -1, 0),
        velocity: new Vector3(-0.05, 0.1, 0),
        consciousness_energy: 0.6,
        temporal_displacement: Math.PI / 2,
        reality_phase: Math.PI / 2
      }
    ];

    const demoFields: ConsciousnessField[] = [
      {
        center: new Vector3(0, 0, 0),
        radius: 8,
        intensity: 0.7,
        thought_patterns: ['optimization', 'creativity', 'empathy', 'transcendence'],
        emotional_resonance: 0.8
      }
    ];

    setNodes(demoNodes);
    setDataParticles(demoParticles);
    setConsciousnessFields(demoFields);
    setTemporalLoops([
      {
        nodes: ['quantum_processor'],
        timeline: [0, 1, 2, 3, 4, 5]
      }
    ]);
  }, []);

  const handleNodeInteraction = useCallback((nodeId: string, interaction: string) => {
    console.log(`Node ${nodeId} - ${interaction}`);

    if (interaction === 'select') {
      setSelectedNode(nodeId);
    } else if (interaction === 'edit') {
      // Open consciousness-level editing interface
      console.log('Opening quantum editing interface for', nodeId);
    }
  }, []);

  const connections = nodes.flatMap(node =>
    node.entangled_nodes.map(targetId => {
      const targetNode = nodes.find(n => n.id === targetId);
      return targetNode ? {
        from: node.position,
        to: targetNode.position,
        consciousness_level: (node.consciousness_level + targetNode.consciousness_level) / 2
      } : null;
    }).filter(Boolean)
  ) as Array<{ from: Vector3; to: Vector3; consciousness_level: number }>;

  return (
    <div style={{ width: '100vw', height: '100vh', background: 'radial-gradient(circle, #1a1a2e, #16213e, #0f3460)' }}>
      <Canvas
        camera={{ position: [0, 0, 15], fov: 75 }}
        onCreated={({ gl }) => {
          gl.setClearColor('#000011');
        }}
      >
        {/* Revolutionary lighting setup */}
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.5} color="#ffffff" />
        <pointLight position={[-10, -10, -10]} intensity={0.3} color="#4444ff" />

        {/* Consciousness-driven controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          minDistance={5}
          maxDistance={50}
        />

        {/* Revolutionary workflow components */}
        {nodes.map(node => (
          <QuantumWorkflowNodeComponent
            key={node.id}
            node={node}
            onNodeInteraction={handleNodeInteraction}
            isSelected={selectedNode === node.id}
          />
        ))}

        <DataFlowVisualization
          particles={dataParticles}
          connections={connections}
        />

        <ConsciousnessFieldVisualization
          fields={consciousnessFields}
        />

        <TemporalVisualization
          temporalLoops={temporalLoops}
          timeTravel={timeTravelMode}
        />

        {/* Cosmic background stars */}
        <Stars />
      </Canvas>

      {/* Revolutionary control panel */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        color: 'white',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: 20,
        borderRadius: 10,
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>
        <h3>🌌 Consciousness Control Panel</h3>
        <button
          onClick={() => setTimeTravelMode(prev => ({ ...prev, active: !prev.active }))}
          style={{
            background: timeTravelMode.active ? '#ff6b6b' : '#4ecdc4',
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: 5,
            cursor: 'pointer',
            margin: 5
          }}
        >
          {timeTravelMode.active ? '⏸️ Exit Time Travel' : '⏰ Enter Time Travel'}
        </button>

        <div style={{ marginTop: 10 }}>
          <p>Selected: {selectedNode || 'None'}</p>
          <p>Consciousness Fields: {consciousnessFields.length}</p>
          <p>Temporal Loops: {temporalLoops.length}</p>
          <p>Reality Phase: Active</p>
        </div>
      </div>
    </div>
  );
};

// Cosmic star field component
const Stars: React.FC = () => {
  const starsRef = useRef<THREE.Points>(null);

  useEffect(() => {
    if (starsRef.current) {
      const positions = new Float32Array(1000 * 3);
      for (let i = 0; i < 1000; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      }
      starsRef.current.geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    }
  }, []);

  useFrame(() => {
    if (starsRef.current) {
      starsRef.current.rotation.y += 0.0005;
    }
  });

  return (
    <points ref={starsRef}>
      <bufferGeometry />
      <pointsMaterial color="#ffffff" size={0.5} />
    </points>
  );
};

export default SpatialWorkflowCanvas;