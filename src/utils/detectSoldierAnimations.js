import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// 创建一个专门用于检测Soldier.glb模型动画的工具
export function detectSoldierAnimations() {
  console.log('%c开始检测Soldier.glb模型动画', 'background: #ff0000; color: white; font-size: 16px;');
  
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    
    loader.load(
      '/Soldier.glb',
      (gltf) => {
        console.log('%c模型加载成功', 'color: #00ff00; font-weight: bold;');
        
        // 检查模型是否有动画
        if (gltf.animations && gltf.animations.length > 0) {
          console.log('%c找到以下动画:', 'background: #4B0082; color: #FFFF00; font-size: 16px;');
          
          // 详细输出每个动画的信息
          gltf.animations.forEach((animation, index) => {
            console.log(`%c动画 ${index}: ${animation.name}`, 'color: #00ffff; font-weight: bold;');
            console.log('动画时长:', animation.duration, '秒');
            console.log('动画轨道数:', animation.tracks.length);
            
            // 输出前几个轨道的名称，帮助理解动画控制的骨骼
            if (animation.tracks.length > 0) {
              console.log('动画轨道示例:');
              animation.tracks.slice(0, 3).forEach((track, i) => {
                console.log(`  轨道 ${i}: ${track.name}`);
              });
            }
          });
          
          // 提取所有动画名称并输出
          const animationNames = gltf.animations.map(anim => anim.name);
          console.log('%c动画名称列表:', 'background: #008080; color: white; font-size: 14px;');
          console.table(animationNames);
          
          // 生成动画映射建议
          console.log('%c动画映射建议:', 'background: #800080; color: white; font-size: 14px;');
          const actionMappings = {
            idle: animationNames.filter(name => /idle|stand|rest|neutral|tpose|hip|hop/i.test(name)),
            walk: animationNames.filter(name => /walk|move|step|stride/i.test(name)),
            run: animationNames.filter(name => /run|sprint|jog|dash/i.test(name)),
            jump: animationNames.filter(name => /jump|leap|hop/i.test(name)),
            attack: animationNames.filter(name => /attack|slash|punch|kick|melee|swing|hit/i.test(name)),
            dance: animationNames.filter(name => /dance|celebration|victory/i.test(name)),
            death: animationNames.filter(name => /death|dead|die|dying|ko|defeated/i.test(name)),
            crouch: animationNames.filter(name => /crouch|duck|sneak/i.test(name))
          };
          
          console.log('建议的动作映射:');
          console.table(actionMappings);
          
          // 输出App.jsx中应该使用的动画映射代码示例
          console.log('%c建议的App.jsx动画映射代码:', 'background: #0000FF; color: white; font-size: 14px;');
          let mappingCode = 'const animationMap = {\n';
          for (const [action, names] of Object.entries(actionMappings)) {
            if (names.length > 0) {
              mappingCode += `  ${action}: [${names.map(name => `'${name}'`).join(', ')}],\n`;
            } else {
              mappingCode += `  ${action}: [], // 未找到匹配的动画\n`;
            }
          }
          mappingCode += '};';
          console.log(mappingCode);
          
          resolve({
            animations: gltf.animations,
            names: animationNames,
            mappings: actionMappings
          });
        } else {
          console.log('%c模型不包含任何动画', 'color: #ff0000; font-weight: bold;');
          resolve({
            animations: [],
            names: [],
            mappings: {}
          });
        }
      },
      (progress) => {
        console.log('加载进度:', (progress.loaded / progress.total * 100).toFixed(2) + '%');
      },
      (error) => {
        console.error('模型加载失败:', error);
        reject(error);
      }
    );
  });
}

// 立即执行检测
detectSoldierAnimations().then(result => {
  console.log('检测完成，可用于更新App.jsx中的动画映射');
}).catch(error => {
  console.error('检测过程中出错:', error);
});