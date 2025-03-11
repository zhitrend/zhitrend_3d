import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

function Model({ url, rotation = [0, 0, 0], scale = 1 }) {
  const group = useRef();
  const { scene, animations } = useGLTF(url);
  const { actions, names } = useAnimations(animations, group);
  const [currentAnimation, setCurrentAnimation] = useState(null);

  // 动画映射表
  const animationMap = {
    idle: ['Idle', 'idle', 'IDLE', 'T-Pose'],
    walk: ['Walk', 'walking', 'WALK'],
    run: ['Run', 'running', 'RUN'],
    jump: ['Jump', 'jumping', 'JUMP'],
    attack: ['Attack', 'ATTACK', 'Punch', 'Kick'],
    dance: ['Dance', 'DANCE', 'Victory'],
    death: ['Death', 'DEATH', 'Die', 'Dying']
  };

  // 查找并播放动画
  const playAnimation = (actionName) => {
    // 先停止所有动画
    Object.values(actions).forEach((action) => {
      if (action) action.stop();
    });

    // 查找匹配的动画
    if (animationMap[actionName]) {
      for (const name of animationMap[actionName]) {
        if (actions[name]) {
          actions[name].reset().fadeIn(0.5).play();
          setCurrentAnimation(name);
          console.log(`播放动画: ${name}`);
          return true;
        }
      }
    }

    // 如果没有找到匹配的动画，尝试播放idle动画
    if (actionName !== 'idle') {
      return playAnimation('idle');
    }

    return false;
  };

  // 初始化时播放idle动画
  useEffect(() => {
    if (animations.length > 0) {
      console.log('可用动画:', names);
      playAnimation('idle');
    }
  }, [animations, names]);

  // 克隆场景以避免多个组件共享同一个场景
  useEffect(() => {
    const clonedScene = scene.clone(true);
    
    // 设置场景中所有材质的属性
    clonedScene.traverse((node) => {
      if (node.isMesh) {
        // 确保材质正确渲染
        node.castShadow = true;
        node.receiveShadow = true;
        
        if (node.material) {
          // 克隆材质以避免共享
          node.material = node.material.clone();
          // 设置材质属性
          node.material.side = THREE.DoubleSide;
          node.material.needsUpdate = true;
        }
      }
    });
    
    // 清除之前的子元素
    while (group.current.children.length > 0) {
      group.current.remove(group.current.children[0]);
    }
    
    // 添加克隆的场景
    group.current.add(clonedScene);
  }, [scene, url]);

  // 应用旋转
  useEffect(() => {
    if (group.current) {
      group.current.rotation.set(rotation[0], rotation[1], rotation[2]);
    }
  }, [rotation]);

  // 每帧更新
  useFrame((state, delta) => {
    // 可以在这里添加额外的动画效果
  });

  return (
    <group ref={group} dispose={null} scale={scale}>
      {/* 场景将在useEffect中添加 */}
    </group>
  );
}

export default Model;

// 预加载模型以提高性能
useGLTF.preload('/Soldier.glb');