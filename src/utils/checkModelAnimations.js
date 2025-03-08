import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 创建一个函数来检查模型的动画
export function checkModelAnimations(url) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    
    loader.load(
      url,
      (gltf) => {
        console.log('模型加载成功:', gltf);
        
        // 检查模型是否有动画
        if (gltf.animations && gltf.animations.length > 0) {
          console.log('模型包含以下动画:');
          gltf.animations.forEach((animation, index) => {
            console.log(`动画 ${index}: ${animation.name}`);
          });
          resolve(gltf.animations);
        } else {
          console.log('模型不包含任何动画');
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