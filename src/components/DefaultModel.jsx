import React, { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function DefaultModel({ onCommand }) {
  const mesh = useRef();
  const material = useRef(new THREE.MeshStandardMaterial({
    color: new THREE.Color(0x00f0ff),
    emissive: new THREE.Color(0x00f0ff),
    emissiveIntensity: 0.2,
    metalness: 0.8,
    roughness: 0.2,
  }));

  // 旋转动画
  useFrame((state, delta) => {
    if (mesh.current) {
      mesh.current.rotation.y += delta * 0.5;
    }
  });

  // 添加鼠标交互
  const handleClick = () => {
    if (onCommand) {
      // 随机选择一个命令
      const commands = ['rotateLeft', 'rotateRight', 'reset'];
      const randomCommand = commands[Math.floor(Math.random() * commands.length)];
      onCommand(randomCommand);
    }
  };

  return (
    <mesh
      ref={mesh}
      onClick={handleClick}
      castShadow
      receiveShadow
    >
      <torusKnotGeometry args={[1, 0.3, 128, 32]} />
      <primitive object={material.current} attach="material" />
    </mesh>
  );
}

export default DefaultModel;