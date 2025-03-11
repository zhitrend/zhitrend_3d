import React, { useRef, useEffect, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';
import * as THREE from 'three';

function Model({ url, rotation = [0, 0, 0], scale = 1 }) {
  const group = useRef();
  const { scene, animations } = useGLTF(url);
  const { actions, names } = useAnimations(animations, group);
  const [currentAnimation, setCurrentAnimation] = useState(null);
  const [modelPosition, setModelPosition] = useState([0, -1, 0]);
  const [targetPosition, setTargetPosition] = useState(null);
  const [isWalking, setIsWalking] = useState(false);
  const [walkDirection, setWalkDirection] = useState([0, 0, 0]);
  
  // 场景边界
  const sceneBounds = {
    minX: -5,
    maxX: 5,
    minZ: -5,
    maxZ: 5
  };

  // 动画映射表
  const animationMap = {
    idle: ['Idle', 'idle', 'IDLE', 'T-Pose', 'TPose', 'Hip Hop Dancing'],
    walk: ['Walk', 'walking', 'WALK', 'Walking'],
    run: ['Run', 'running', 'RUN', 'Running'],
    jump: ['Jump', 'jumping', 'JUMP', 'Jumping'],
    attack: ['Attack', 'ATTACK', 'Punch', 'Kick', 'Punching'],
    dance: ['Dance', 'DANCE', 'Victory', 'Dancing'],
    death: ['Death', 'DEATH', 'Die', 'Dying']
  };

  // 查找并播放动画
  const playAnimation = (actionName, transitionTime = 0.5) => {
    const currentAction = actions[currentAnimation];
    
    // 查找匹配的动画
    if (animationMap[actionName]) {
      for (const name of animationMap[actionName]) {
        if (actions[name]) {
          const nextAction = actions[name];
          
          if (currentAction) {
            // 设置动画混合权重
            currentAction.enabled = true;
            currentAction.setEffectiveTimeScale(1);
            currentAction.setEffectiveWeight(1);
            
            // 配置过渡
            nextAction.enabled = true;
            nextAction.setEffectiveTimeScale(1);
            nextAction.setEffectiveWeight(1);
            
            // 执行交叉淡入淡出
            nextAction.time = 0;
            nextAction.crossFadeFrom(currentAction, transitionTime, true);
            nextAction.play();
          } else {
            nextAction.play();
          }
          
          setCurrentAnimation(name);
          console.log(`播放动画: ${name}`);
          return true;
        }
      }
    }
    
    // 如果没有找到匹配的动画，尝试播放idle动画
    if (actionName !== 'idle') {
      return playAnimation('idle', transitionTime);
    }
    
    return false;
  };
  
  // 设置目标位置，开始行走
  const walkTo = (x, z) => {
    // 确保目标位置在场景边界内
    const targetX = Math.max(sceneBounds.minX, Math.min(sceneBounds.maxX, x));
    const targetZ = Math.max(sceneBounds.minZ, Math.min(sceneBounds.maxZ, z));
    
    // 计算当前位置到目标位置的距离
    const dirX = targetX - modelPosition[0];
    const dirZ = targetZ - modelPosition[2];
    const distance = Math.sqrt(dirX * dirX + dirZ * dirZ);
    
    // 只有当距离足够远时才开始行走
    if (distance > 0.2) {
      setTargetPosition([targetX, modelPosition[1], targetZ]);
      setIsWalking(true);
      
      // 计算行走方向
      setWalkDirection([dirX / distance, 0, dirZ / distance]);
      
      // 计算模型应该面向的角度（Y轴旋转）
      const angle = Math.atan2(dirX, dirZ);
      if (group.current) {
        group.current.rotation.y = angle;
      }
      
      // 播放行走动画，使用较短的过渡时间以快速响应
      console.log('开始行走动画');
      playAnimation('walk', 0.3);
    } else {
      console.log('目标距离太近，不需要行走');
    }
  };
  
  // 随机行走
  const walkRandomly = () => {
    const randomX = Math.random() * (sceneBounds.maxX - sceneBounds.minX) + sceneBounds.minX;
    const randomZ = Math.random() * (sceneBounds.maxZ - sceneBounds.minZ) + sceneBounds.minZ;
    walkTo(randomX, randomZ);
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
    // 处理模型行走
    if (isWalking && targetPosition) {
      // 计算当前位置到目标位置的距离
      const distX = targetPosition[0] - modelPosition[0];
      const distZ = targetPosition[2] - modelPosition[2];
      const distance = Math.sqrt(distX * distX + distZ * distZ);
      
      // 如果距离很小，认为已到达目标位置
      if (distance < 0.1) {
        setIsWalking(false);
        setTargetPosition(null);
        playAnimation('idle');
        
        // 到达目标后，随机等待一段时间再次行走
        setTimeout(() => {
          walkRandomly();
        }, Math.random() * 3000 + 1000);
      } else {
        // 继续向目标移动
        const moveSpeed = 2.0 * delta; // 调整行走速度
        const moveDistance = Math.min(moveSpeed, distance);
        
        // 更新位置
        const newX = modelPosition[0] + walkDirection[0] * moveDistance;
        const newZ = modelPosition[2] + walkDirection[2] * moveDistance;
        
        // 确保新位置在场景边界内
        const boundedX = Math.max(sceneBounds.minX, Math.min(sceneBounds.maxX, newX));
        const boundedZ = Math.max(sceneBounds.minZ, Math.min(sceneBounds.maxZ, newZ));
        
        setModelPosition([boundedX, modelPosition[1], boundedZ]);
      }
    }
    
    // 应用位置到模型
    if (group.current) {
      group.current.position.x = modelPosition[0];
      group.current.position.y = modelPosition[1];
      group.current.position.z = modelPosition[2];
    }
  });

  // 初始化随机行走
  useEffect(() => {
    // 确保模型和动画完全加载后再开始随机行走
    if (scene && animations.length > 0 && group.current) {
      console.log('开始随机行走...');
      console.log('可用动画列表:', names);
      
      // 延迟一小段时间确保一切都已准备就绪
      const timer = setTimeout(() => {
        // 先播放idle动画
        playAnimation('idle');
        // 再开始随机行走
        setTimeout(() => {
          walkRandomly();
        }, 500);
      }, 1000);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [scene, animations]);
  
  return (
    <group ref={group} dispose={null} scale={scale}>
      {/* 场景将在useEffect中添加 */}
    </group>
  );
  
  // 注意：我们不再使用position属性，因为位置现在由modelPosition状态控制
}

export default Model;

// 预加载模型以提高性能
useGLTF.preload('/Soldier.glb');