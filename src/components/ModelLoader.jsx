import React from 'react';
import { useProgress } from '@react-three/drei';
import { Text } from '@react-three/drei';

function ModelLoader() {
  const { progress, errors } = useProgress();

  if (errors.length > 0) {
    return (
      <Text
        position={[0, 0, 0]}
        fontSize={0.5}
        color="#ff006f"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
        font={undefined} // 移除字体引用，使用默认字体
      >
        加载失败
      </Text>
    );
  }

  if (progress < 100) {
    return (
      <Text
        position={[0, 0, 0]}
        fontSize={0.5}
        color="#00f0ff"
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.02}
        outlineColor="#000000"
        font={undefined} // 移除字体引用，使用默认字体
      >
        加载中... {Math.round(progress)}%
      </Text>
    );
  }

  return null;
}

export default ModelLoader;