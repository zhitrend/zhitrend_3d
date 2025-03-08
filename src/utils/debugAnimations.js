import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 创建一个函数来详细检查和输出模型的动画
export function debugModelAnimations(url) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    
    loader.load(
      url,
      (gltf) => {
        console.log('%c模型动画调试信息', 'background: #222; color: #bada55; font-size: 16px;');
        console.log('模型加载成功:', gltf);
        
        // 检查模型是否有动画
        if (gltf.animations && gltf.animations.length > 0) {
          console.log('%c找到以下动画:', 'color: #00ff00; font-weight: bold;');
          gltf.animations.forEach((animation, index) => {
            console.log(`%c动画 ${index}: ${animation.name}`, 'color: #00ffff;');
            // 输出动画的详细信息
            console.log('动画时长:', animation.duration);
            console.log('动画轨道数:', animation.tracks.length);
            // 输出前几个轨道的名称，帮助理解动画控制的骨骼
            if (animation.tracks.length > 0) {
              console.log('动画轨道示例:');
              animation.tracks.slice(0, 3).forEach((track, i) => {
                console.log(`  轨道 ${i}: ${track.name}`);
              });
            }
          });
          resolve(gltf.animations);
        } else {
          console.log('%c模型不包含任何动画', 'color: #ff0000; font-weight: bold;');
          resolve([]);
        }
      },
      (progress) => {
        console.log('加载进度:', (progress.loaded / progress.total) * 100 + '%');
      },
      (error) => {
        console.error('模型加载失败:', error);
        reject(error);
      }
    );
  });
}

// 立即执行调试
console.log('%c开始调试Soldier.glb模型动画', 'background: #ff0000; color: white; font-size: 20px;');
debugModelAnimations('/Soldier.glb').then(animations => {
  if (animations.length > 0) {
    console.log('%c可用的动画名称:', 'background: #0000ff; color: white; font-size: 16px;');
    const animationNames = animations.map(a => a.name);
    console.table(animationNames);
    
    // 提供动画名称映射建议
    console.log('%c动画映射建议:', 'background: #800080; color: white; font-size: 16px;');
    console.log('请根据以下动画名称更新App.jsx中的animationMap:');
    const suggestions = {
      idle: animationNames.filter(name => /idle|stand|rest|neutral|tpose/i.test(name)),
      walk: animationNames.filter(name => /walk|move|step|stride/i.test(name)),
      run: animationNames.filter(name => /run|sprint|jog|dash/i.test(name)),
      jump: animationNames.filter(name => /jump|leap|hop/i.test(name))
    };
    console.table(suggestions);
  }
}).catch(error => {
  console.error('调试模型动画时出错:', error);
});