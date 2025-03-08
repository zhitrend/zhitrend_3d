import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './techTheme.css';
import { checkModelAnimations } from './utils/checkModelAnimations.js';

// 检查Soldier.glb模型的动画
checkModelAnimations('/Soldier.glb').then(animations => {
  console.log('Soldier.glb模型动画检查结果:');
  if (animations.length > 0) {
    console.log(`找到${animations.length}个动画:`);
    animations.forEach((anim, index) => {
      console.log(`${index}: ${anim.name}`);
    });
  } else {
    console.log('模型不包含任何动画，需要自行实现基础动画效果');
  }
}).catch(error => {
  console.error('检查模型动画时出错:', error);
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);