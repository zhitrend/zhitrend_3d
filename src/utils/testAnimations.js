import { checkModelAnimations } from './checkModelAnimations.js';
// 测试Soldier.glb模型的动画
async function testSoldierAnimations() {
  try {
    console.log('开始检查Soldier.glb模型的动画...');
    const animations = await checkModelAnimations('/Soldier.glb');
    
    if (animations.length > 0) {
      console.log(`找到${animations.length}个动画:`);
      animations.forEach((anim, index) => {
        console.log(`${index}: ${anim.name}`);
      });
    } else {
      console.log('模型不包含任何动画，需要自行实现基础动画效果');
    }
  } catch (error) {
    console.error('测试动画时出错:', error);
  }
}

// 在控制台中运行测试
testSoldierAnimations();