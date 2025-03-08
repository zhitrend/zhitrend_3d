import React from 'react';
import { useProgress } from '@react-three/drei';
import { Text } from '@react-three/drei';

function ModelLoader() {
  const { progress, errors } = useProgress();

  if (errors.length > 0) {
    return (
      <>
        <Text
          position={[0, 0, 0]}
          fontSize={0.5}
          color="#ff006f"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
          font={undefined}
        >
          加载失败
        </Text>
        <mesh position={[0, -0.7, 0]}>
          <planeGeometry args={[3, 0.3]} />
          <meshBasicMaterial color="#0a0a14" transparent opacity={0.8} />
          <Text
            position={[0, 0, 0.01]}
            fontSize={0.2}
            color="#ff006f"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.01}
            outlineColor="#000000"
            font={undefined}
          >
            请检查网络连接或刷新页面
          </Text>
        </mesh>
      </>
    );
  }

  if (progress < 100) {
    return (
      <>
        <Text
          position={[0, 0, 0]}
          fontSize={0.5}
          color="#00f0ff"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
          font={undefined}
        >
          加载中... {Math.round(progress)}%
        </Text>
        
        {/* 进度条背景 */}
        <mesh position={[0, -0.7, 0]}>
          <planeGeometry args={[3, 0.2]} />
          <meshBasicMaterial color="#0a0a14" transparent opacity={0.8} />
        </mesh>
        
        {/* 进度条 */}
        <mesh position={[-1.5 + (progress / 100) * 1.5, -0.7, 0.01]}>
          <planeGeometry args={[(progress / 100) * 3, 0.2]} />
          <meshBasicMaterial color="#00f0ff" transparent opacity={0.7} />
        </mesh>
        
        {/* 加载动画 - 旋转环 */}
        <group position={[0, 0, -0.5]} rotation={[0, 0, progress / 100 * Math.PI * 2]}>
          <mesh position={[0, 1.2, 0]}>
            <ringGeometry args={[0.3, 0.4, 32]} />
            <meshBasicMaterial color="#7b00ff" transparent opacity={0.7} />
          </mesh>
        </group>
      </>
    );
  }

  return null;
}

export default ModelLoader;