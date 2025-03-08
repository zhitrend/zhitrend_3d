import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 创建一个函数来详细检查和输出模型的动画
export function getModelAnimationNames(url) {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    
    loader.load(
      url,
      (gltf) => {
        console.log('%c模型动画名称检查', 'background: #4B0082; color: #FFFF00; font-size: 16px;');
        
        // 检查模型是否有动画
        if (gltf.animations && gltf.animations.length > 0) {
          console.log('%c找到以下动画:', 'color: #00ff00; font-weight: bold;');
          const animationNames = gltf.animations.map(anim => anim.name);
          console.table(animationNames);
          
          // 输出动画名称与常见动作的匹配建议
          console.log('%c动画映射建议:', 'background: #800080; color: white; font-size: 16px;');
          const actionMappings = {
            idle: animationNames.filter(name => /idle|stand|rest|neutral|tpose|hip|hop/i.test(name)),
            walk: animationNames.filter(name => /walk|move|step|stride/i.test(name)),
            run: animationNames.filter(name => /run|sprint|jog|dash/i.test(name)),
            jump: animationNames.filter(name => /jump|leap|hop/i.test(name))
          };
          console.log('建议的动作映射:');
          console.table(actionMappings);
          
          resolve(animationNames);
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