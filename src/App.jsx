import React, { useRef, useEffect, useState, Suspense, Component } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, useAnimations } from '@react-three/drei';
import * as tf from '@tensorflow/tfjs';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Three.js渲染错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(10, 10, 20, 0.85)',
          padding: '25px',
          borderRadius: '12px',
          textAlign: 'center',
          color: 'var(--text-color)',
          border: '2px solid var(--accent-color)',
          boxShadow: '0 0 20px rgba(255, 0, 200, 0.6)',
          backdropFilter: 'blur(5px)',
          maxWidth: '400px'
        }}>
          <h3 style={{ color: 'var(--accent-color)', marginTop: 0, fontSize: '22px' }}>3D渲染出错</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>请刷新页面重试</p>
          <button onClick={() => window.location.reload()} style={{ marginTop: '10px' }}>刷新页面</button>
        </div>
      );
    }

    return this.props.children;
  }
}
import VoiceControl from './components/VoiceControl';
import GestureControl from './components/GestureControl';
import ModelLoader from './components/ModelLoader';
import OllamaChat from './components/OllamaChat';
import * as THREE from 'three';
import * as faceLandmarksDetection from '@tensorflow-models/face-landmarks-detection';
import '@mediapipe/face_mesh';

function Model({ url, rotation }) {
  // 使用错误边界处理模型加载错误
  const { scene } = useGLTF(url, true);
  const { camera } = useThree();
  const [modelColor, setModelColor] = useState(new THREE.Color(0x5599ff));
  const [currentAction, setCurrentAction] = useState('idle');
  const lastCommandTime = useRef(0);
  const mixerRef = useRef(null);
  
  // 获取模型的动画
  const { animations } = useGLTF(url);
  const { actions, mixer } = useAnimations(animations, scene);
  
  // 初始化动画混合器
  useEffect(() => {
    if (mixer) {
      mixerRef.current = mixer;
      console.log('动画混合器已初始化:', mixer);
      console.log('可用动画列表:', Object.keys(actions));
    }
  }, [mixer, actions]);
  
  // 处理来自语音和手势的命令
  const handleCommand = (command) => {
    // 记录上一次命令执行时间，防止命令执行过于频繁
    const now = Date.now();
    
    // 如果命令执行间隔小于300ms，则忽略该命令（防止重复触发）
    if (now - lastCommandTime.current < 300) {
      return;
    }
    lastCommandTime.current = now;
    
    console.log(`接收到命令: ${command}`);
    
    switch(command) {
      case 'rotate':
        // 自动旋转模型
        scene.rotation.y += 0.5;
        break;
      case 'zoomIn':
        // 放大模型
        camera.position.z = Math.max(camera.position.z - 0.5, 2);
        break;
      case 'zoomOut':
        // 缩小模型
        camera.position.z += 0.5;
        break;
      case 'reset':
        // 重置模型位置和旋转
        scene.rotation.set(0, 0, 0);
        camera.position.set(0, 0, 5);
        setCurrentAction('idle'); // 重置时恢复到默认动画
        break;
      case 'rotateLeft':
        // 向左旋转
        scene.rotation.y -= 0.3;
        break;
      case 'rotateRight':
        // 向右旋转
        scene.rotation.y += 0.3;
        break;
      case 'lookUp':
        // 向上看
        scene.rotation.x -= 0.3;
        break;
      case 'lookDown':
        // 向下看
        scene.rotation.x += 0.3;
        break;
      case 'changeColor':
        // 随机改变模型颜色
        const newColor = new THREE.Color(
          Math.random(),
          Math.random(),
          Math.random()
        );
        setModelColor(newColor);
        
        // 应用颜色到模型
        scene.traverse((child) => {
          if (child.isMesh && child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(mat => {
                mat.color = newColor;
              });
            } else {
              child.material.color = newColor;
            }
          }
        });
        break;
      // 添加动画控制命令
      case 'walk':
        console.log('执行行走命令');
        setCurrentAction('walk');
        break;
      case 'run':
        console.log('执行奔跑命令');
        setCurrentAction('run');
        break;
      case 'jump':
        setCurrentAction('jump');
        break;
      case 'attack':
        setCurrentAction('attack');
        // 攻击动作通常是短暂的，执行后自动回到idle状态
        setTimeout(() => setCurrentAction('idle'), 1500);
        break;
      case 'dance':
        setCurrentAction('dance');
        break;
      case 'crouch':
        setCurrentAction('crouch');
        break;
      case 'death':
        setCurrentAction('death');
        break;
      case 'idle':
        setCurrentAction('idle');
        break;
      default:
        // 尝试将命令作为动画名称直接使用
        if (typeof command === 'string' && command.length > 0) {
          setCurrentAction(command);
        }
        break;
    }
  };
  
  // 处理动画
  useEffect(() => {
    // 检查动画是否存在
    if (actions && Object.keys(actions).length > 0) {
      // 输出当前可用的所有动画名称
      console.log('当前可用的动画列表:', Object.keys(actions));
      console.log('当前请求播放的动作:', currentAction);
      
      // 确保动画名称大小写匹配
      const availableAnimations = Object.keys(actions);
      console.log('可用动画列表(大小写敏感):', availableAnimations);
      
      // 精确的动画名称映射 - 基于Soldier.glb模型的实际动画名称
      const exactAnimationMap = {
        'idle': 'HipHop Dancing',
        'walk': 'Walking',
        'run': 'Running',
        'jump': 'Jump',
        'dance': 'HipHop Dancing'
      };
      
      // 获取动画名称，优先使用精确映射
      let animationName = exactAnimationMap[currentAction.toLowerCase()];
      console.log('映射后的动画名称:', animationName);
      
      // 如果没有映射，尝试直接使用动作名称
      if (!animationName && availableAnimations.includes(currentAction)) {
        animationName = currentAction;
      }
      
      // 如果仍然没有找到，尝试不区分大小写的匹配
      if (!animationName) {
        const actionLower = currentAction.toLowerCase();
        for (const anim of availableAnimations) {
          if (anim.toLowerCase() === actionLower) {
            animationName = anim;
            break;
          }
        }
      }
      
      console.log('最终选择的动画名称:', animationName);
      
      // 停止所有动画，使用淡出效果
      Object.values(actions).forEach(action => {
        if (action.isRunning()) {
          action.fadeOut(0.3);
        }
      });
      
      // 播放当前动画
      if (animationName && actions[animationName]) {
        // 确保动画存在并且可以播放
        try {
          actions[animationName].reset().fadeIn(0.3).play();
          console.log(`成功播放动画: ${animationName}`);
        } catch (error) {
          console.error(`播放动画 ${animationName} 时出错:`, error);
        }
      } else {
        console.log(`动画 ${animationName || currentAction} 不存在，尝试查找替代动画`);
        
        // 尝试查找相似的动画名称
        let foundAnimation = false;
        
        // 首先尝试使用Walking或Running作为特殊情况
        if (currentAction.toLowerCase() === 'walk' && availableAnimations.includes('Walking')) {
          actions['Walking'].reset().fadeIn(0.3).play();
          console.log('使用Walking动画');
          foundAnimation = true;
        } else if (currentAction.toLowerCase() === 'run' && availableAnimations.includes('Running')) {
          actions['Running'].reset().fadeIn(0.3).play();
          console.log('使用Running动画');
          foundAnimation = true;
        }
        
        // 如果没有找到匹配的动画，播放默认动画
        if (!foundAnimation) {
          // 优先选择常见动画
          const preferredAnims = ['Walking', 'Running', 'HipHop Dancing', 'Jump', 'TPose'];
          let defaultAnim = null;
          
          for (const preferred of preferredAnims) {
            if (availableAnimations.includes(preferred)) {
              defaultAnim = preferred;
              break;
            }
          }
          
          // 如果没有找到首选动画，使用第一个可用的
          if (!defaultAnim && availableAnimations.length > 0) {
            defaultAnim = availableAnimations[0];
          }
          
          if (defaultAnim) {
            actions[defaultAnim].reset().fadeIn(0.3).play();
            console.log(`播放默认动画: ${defaultAnim}`);
          }
        }
      }
    } else {
      console.log('没有可用的动画:', { actions, currentAction });
    }
  }, [actions, currentAction]);

  // 获取动画名称的辅助函数
  const getAnimationName = (action) => {
    // 映射动作到可能的动画名称 - 基于Soldier.glb模型的实际动画名称
    const animationMap = {
      idle: ['HipHop Dancing', 'TPose'],
      walk: ['Walking'],
      run: ['Running'],
      jump: ['Jump'],
      attack: [],
      dance: ['HipHop Dancing'],
      death: [],
      crouch: []
    };
    
    // 如果actions存在，尝试找到匹配的动画名称
    if (actions) {
      // 首先，记录所有可用的动画名称，帮助调试
      console.log('可用的动画名称:', Object.keys(actions));
      
      // 直接检查动作名称是否存在于动画列表中
      if (actions[action]) {
        console.log(`直接匹配到动画: ${action}`);
        return action;
      }
      
      // 检查映射表中的可能名称
      const possibleNames = animationMap[action] || [];
      for (const name of possibleNames) {
        if (actions[name]) {
          console.log(`通过映射表匹配到动画: ${name}`);
          return name;
        }
      }
      
      // 如果没有找到匹配，尝试部分匹配
      const actionLower = action.toLowerCase();
      for (const animName of Object.keys(actions)) {
        if (animName.toLowerCase().includes(actionLower) || 
            actionLower.includes(animName.toLowerCase())) {
          console.log(`通过部分匹配找到动画: ${animName}`);
          return animName;
        }
      }
    }
    
    // 如果没有找到匹配的动画，返回原始动作名称
    console.log(`未找到匹配的动画，返回原始动作名称: ${action}`);
    return action;
  };
  
  // 查找相似动画的辅助函数
  const findSimilarAnimation = (action, availableAnimations) => {
    console.log(`尝试为动作 "${action}" 查找相似动画，可用动画:`, availableAnimations);
    
    // 针对Soldier.glb模型的精确动画映射
    const exactMappings = {
      'walk': 'Walking',
      'run': 'Running',
      'jump': 'Jump',
      'idle': 'HipHop Dancing',  // 或者使用 'TPose'
      'dance': 'HipHop Dancing',
      'attack': 'HipHop Dancing', // 没有攻击动画，使用默认动画
      'death': 'TPose',          // 没有死亡动画，使用默认动画
      'crouch': 'TPose'          // 没有蹲下动画，使用默认动画
    };
    
    // 首先检查是否有精确映射
    const actionLower = action.toLowerCase();
    if (exactMappings[actionLower] && availableAnimations.includes(exactMappings[actionLower])) {
      console.log(`找到精确映射的动画: ${exactMappings[actionLower]}`);
      return exactMappings[actionLower];
    }
    
    // 尝试通过部分匹配查找相似动画
    // 首先尝试查找包含完整动作名称的动画
    for (const anim of availableAnimations) {
      if (anim.toLowerCase().includes(actionLower)) {
        console.log(`找到包含完整动作名称的动画: ${anim}`);
        return anim;
      }
    }
    
    // 如果没有找到，尝试查找包含动作名称前几个字符的动画
    if (actionLower.length > 2) {
      const prefix = actionLower.substring(0, 3); // 取前3个字符
      for (const anim of availableAnimations) {
        if (anim.toLowerCase().startsWith(prefix)) {
          console.log(`找到以动作前缀开头的动画: ${anim}`);
          return anim;
        }
      }
    }
    
    // 特殊情况处理 - 针对Soldier.glb模型的特定动画名称
    const specialCases = {
      'walk': ['Walking', 'walk', 'move', 'step', 'stride'],
      'run': ['Running', 'run', 'sprint', 'jog', 'dash'],
      'jump': ['Jump', 'jump', 'leap', 'hop', 'bounce'],
      'idle': ['TPose', 'HipHop Dancing', 'Idle', 'idle', 'stand', 'rest', 'neutral', 'tpose', 't-pose', 't_pose']
    };
    
    // 检查是否有特殊映射
    if (specialCases[actionLower]) {
      // 首先尝试精确匹配特殊情况中的名称
      for (const alt of specialCases[actionLower]) {
        if (availableAnimations.includes(alt)) {
          console.log(`找到精确匹配的特殊动画: ${alt}`);
          return alt;
        }
      }
      
      // 如果没有精确匹配，尝试部分匹配
      for (const alt of specialCases[actionLower]) {
        for (const anim of availableAnimations) {
          if (anim.toLowerCase().includes(alt.toLowerCase())) {
            console.log(`找到部分匹配的特殊动画: ${anim} (匹配关键词: ${alt})`);
            return anim;
          }
        }
      }
    }
    
    // 如果所有尝试都失败，使用默认动画
    // 对于Soldier.glb模型，我们知道它有这些动画
    const defaultAnimations = ['HipHop Dancing', 'TPose', 'Walking', 'Running', 'Jump'];
    for (const defaultAnim of defaultAnimations) {
      if (availableAnimations.includes(defaultAnim)) {
        console.log(`未找到匹配的动画，使用默认动画: ${defaultAnim}`);
        return defaultAnim;
      }
    }
    
    // 如果以上都失败，尝试使用第一个可用的动画
    if (availableAnimations.length > 0) {
      const defaultAnim = availableAnimations[0];
      console.log(`未找到匹配的动画，使用第一个可用动画: ${defaultAnim}`);
      return defaultAnim;
    }
    
    // 如果没有任何可用动画，返回null
    console.log(`未找到匹配的动画，且没有可用的动画`);
    return null;
  };

  
  useEffect(() => {
    if (rotation) {
      // 平滑过渡动画
      const targetRotation = {
        x: rotation.x,
        y: rotation.y,
        z: rotation.z
      };
      
      // 使用线性插值实现平滑过渡
      scene.rotation.x += (targetRotation.x - scene.rotation.x) * 0.1;
      scene.rotation.y += (targetRotation.y - scene.rotation.y) * 0.1;
      scene.rotation.z += (targetRotation.z - scene.rotation.z) * 0.1;
      
      // 处理眼睛开合
      if (rotation.eyeOpenness !== undefined) {
        const eyes = scene.getObjectByName('eyes');
        if (eyes) {
          const targetScale = Math.min(1, rotation.eyeOpenness / 15);
          eyes.scale.y += (targetScale - eyes.scale.y) * 0.2;
        }
      }
      
      // 处理嘴巴开合
      if (rotation.mouthOpenness !== undefined) {
        const mouth = scene.getObjectByName('mouth');
        if (mouth) {
          const targetScale = Math.min(1, rotation.mouthOpenness / 20);
          mouth.scale.y += (targetScale - mouth.scale.y) * 0.2;
        }
      }
      
      // 处理眉毛动作
      if (rotation.browRaise !== undefined) {
        const eyebrows = scene.getObjectByName('eyebrows');
        if (eyebrows) {
          const targetPosition = rotation.browRaise / 30;
          eyebrows.position.y += (targetPosition - eyebrows.position.y) * 0.2;
        }
      }
      
      // 处理鼻子动作
      if (rotation.noseMovement !== undefined) {
        const nose = scene.getObjectByName('nose');
        if (nose) {
          const targetPosition = {
            x: rotation.noseMovement.x / 50,
            y: rotation.noseMovement.y / 50
          };
          nose.position.x += (targetPosition.x - nose.position.x) * 0.2;
          nose.position.y += (targetPosition.y - nose.position.y) * 0.2;
        }
      }
    }
  }, [rotation, scene]);

  // 更新动画
  useFrame((state, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
  });

  // 添加调试信息，帮助排查问题
  useEffect(() => {
    // 在组件挂载时输出调试信息
    console.log('Model组件已挂载');
    console.log('模型URL:', url);
    console.log('初始动作:', currentAction);
    
    // 检查模型是否正确加载
    if (scene) {
      console.log('模型场景已加载:', scene);
    }
    
    // 检查动画混合器
    if (mixer) {
      console.log('动画混合器已创建:', mixer);
      mixerRef.current = mixer;
    }
    
    // 返回清理函数
    return () => {
      console.log('Model组件将卸载');
    };
  }, []);

  return (
    <primitive object={scene} />
  );
}

// 默认模型 - 当没有模型时显示一个简单的立方体
function DefaultModel({ onCommand }) {
  const { camera } = useThree();
  const meshRef = useRef();
  const [modelColor, setModelColor] = useState(new THREE.Color(0x5599ff));
  
  // 处理命令
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.material.color = modelColor;
    }
  }, [modelColor]);

  const handleCommand = (command) => {
    switch(command) {
      case 'rotate':
        if (meshRef.current) meshRef.current.rotation.y += 0.5;
        break;
      case 'zoomIn':
        camera.position.z = Math.max(camera.position.z - 0.5, 2);
        break;
      case 'zoomOut':
        camera.position.z += 0.5;
        break;
      case 'reset':
        if (meshRef.current) meshRef.current.rotation.set(0, 0, 0);
        camera.position.set(0, 0, 5);
        break;
      case 'changeColor':
        const newColor = new THREE.Color(
          Math.random(),
          Math.random(),
          Math.random()
        );
        setModelColor(newColor);
        break;
      default:
        break;
    }
    
    // 传递命令给父组件
    if (onCommand) onCommand(command);
  };

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color={modelColor} />
    </mesh>
  );
}

function App() {
  // 使用Soldier.glb作为默认模型
  const [modelUrl, setModelUrl] = useState('/Soldier.glb');
  const videoRef = useRef(null);
  const [faceDetector, setFaceDetector] = useState(null);
  const [modelRotation, setModelRotation] = useState({ x: 0, y: 0, z: 0 });
  const requestRef = useRef();
  const previousTimeRef = useRef();

  const handleCommand = (command) => {
    // 更新模型旋转状态
    setModelRotation(prev => {
      switch(command) {
        case 'rotate':
          return { ...prev, y: prev.y + 0.5 };
        case 'rotateLeft':
          return { ...prev, y: prev.y - 0.3 };
        case 'rotateRight':
          return { ...prev, y: prev.y + 0.3 };
        case 'lookUp':
          return { ...prev, x: prev.x - 0.3 };
        case 'lookDown':
          return { ...prev, x: prev.x + 0.3 };
        case 'reset':
          return { x: 0, y: 0, z: 0 };
        default:
          return prev;
      }
    });
  };

  useEffect(() => {
    // 初始化人脸检测模型
    const initFaceDetection = async () => {
      try {
        await tf.ready();
        const model = await faceLandmarksDetection.load(
          faceLandmarksDetection.SupportedPackages.mediapipeFacemesh,
          { maxFaces: 1 }
        );
        setFaceDetector(model);
        console.log('人脸检测模型加载成功');
      } catch (error) {
        console.error('人脸检测模型加载失败:', error);
        // 即使模型加载失败，也不会影响应用的基本功能
      }
    };

    initFaceDetection();

    // 设置动画循环
    const animate = async (time) => {
      if (previousTimeRef.current !== undefined) {
        if (videoRef.current && faceDetector) {
          try {
            const faces = await faceDetector.estimateFaces(videoRef.current);

            if (faces.length > 0) {
              const face = faces[0];
              const landmarks = face.scaledMesh;
              
              // 使用安全的索引访问
              const leftEyeUpper = landmarks[159] || [0, 0, 0];
              const leftEyeLower = landmarks[145] || [0, 0, 0];
              const rightEyeUpper = landmarks[386] || [0, 0, 0];
              const rightEyeLower = landmarks[374] || [0, 0, 0];
              
              const leftEyeOpenness = Math.abs(leftEyeUpper[1] - leftEyeLower[1]);
              const rightEyeOpenness = Math.abs(rightEyeUpper[1] - rightEyeLower[1]);
              const eyeOpenness = (leftEyeOpenness + rightEyeOpenness) / 2;
              
              // 更新模型旋转
              setModelRotation(prev => ({
                ...prev,
                eyeOpenness
              }));
            }
          } catch (error) {
            console.error('人脸检测过程出错:', error);
            // 继续运行动画帧，不中断应用
          }
        }
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    // 初始化摄像头
    const initCamera = () => {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then((stream) => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              // 强制重新渲染以显示视频预览
              setModelRotation(prev => ({ ...prev }));
            }
          })
          .catch((error) => {
            console.error('摄像头访问失败:', error);
            // 显示友好的错误提示
            const errorMessage = document.createElement('div');
            errorMessage.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(255, 0, 0, 0.8); color: white; padding: 10px 20px; border-radius: 5px; z-index: 1000;';
            errorMessage.textContent = '无法访问摄像头，人脸追踪功能将不可用';
            document.body.appendChild(errorMessage);
            setTimeout(() => errorMessage.remove(), 5000);
          });
      } else {
        console.warn('浏览器不支持摄像头API');
      }
    };

    initCamera();

    return () => {
      // 清理摄像头资源
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }
      // 清理动画帧
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setModelUrl(url);
    }
  };

  const [isPanelMinimized, setIsPanelMinimized] = useState(false);

  const togglePanelMinimized = () => {
    setIsPanelMinimized(!isPanelMinimized);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <ErrorBoundary>
          <Canvas
            camera={{ position: [0, 0, 5], fov: 75 }}
            style={{
              background: 'linear-gradient(135deg, var(--background-dark), var(--background-medium))',
              borderRadius: '16px',
              boxShadow: '0 0 40px rgba(0, 240, 255, 0.3), inset 0 0 20px rgba(123, 0, 255, 0.2)',
              border: '1px solid rgba(0, 240, 255, 0.3)'
            }}
            gl={{ antialias: true, alpha: true }}
          >
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />
            <Suspense fallback={<ModelLoader />}>
              {modelUrl ? (
                <Model url={modelUrl} rotation={modelRotation} />
              ) : (
                <DefaultModel onCommand={handleCommand} />
              )}
            </Suspense>
            <OrbitControls enableDamping={true} />
          </Canvas>
        </ErrorBoundary>
        
        {/* Ollama聊天组件 */}
        <OllamaChat onResponse={handleCommand} />
        
        {/* 模型信息面板 */}
        <div className="model-info">
          <h3>模型控制信息</h3>
          <p>当前模型: {modelUrl.split('/').pop()}</p>
          <p>提示: 使用语音、手势或聊天控制模型</p>
        </div>
        
        {/* 控制面板最小化按钮 */}
        {isPanelMinimized ? (
          <div 
            className="control-panel-minimized"
            onClick={togglePanelMinimized}
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: 'rgba(10, 10, 20, 0.8)',
              backdropFilter: 'blur(8px)',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 8L18 14H6L12 8Z" fill="#00f0ff" />
            </svg>
          </div>
        ) : (
          <div className="control-panel" style={{
            position: 'absolute',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(10, 10, 20, 0.85)',
            borderRadius: '20px',
            border: '2px solid rgba(0, 240, 255, 0.4)',
            padding: '20px',
            display: 'flex',
            gap: '15px',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
            zIndex: 10,
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          }}>
            <button onClick={() => handleCommand('rotateLeft')} style={{
              margin: 0,
              padding: '12px 20px',
              minWidth: '120px'
            }}>向左旋转</button>
            <button onClick={() => handleCommand('rotateRight')} style={{
              margin: 0,
              padding: '12px 20px',
              minWidth: '120px'
            }}>向右旋转</button>
            <button onClick={() => handleCommand('reset')} style={{
              margin: 0,
              padding: '12px 20px',
              minWidth: '120px'
            }}>重置位置</button>
            <button onClick={togglePanelMinimized} style={{
              margin: 0,
              padding: '12px 20px',
              minWidth: '60px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 16L18 10H6L12 16Z" fill="#ffffff" />
              </svg>
            </button>
          </div>
        )}

    {/* 控制面板最小化按钮 */}
    {isPanelMinimized ? (
      <div 
        className="control-panel-minimized"
        onClick={togglePanelMinimized}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(10, 10, 20, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8L18 14H6L12 8Z" fill="#00f0ff" />
        </svg>
      </div>
    ) : (
      <div className="control-panel" style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 10, 20, 0.85)',
        borderRadius: '20px',
        border: '2px solid rgba(0, 240, 255, 0.4)',
        padding: '20px',
        display: 'flex',
        gap: '15px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
        zIndex: 10,
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <button onClick={() => handleCommand('rotateLeft')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向左旋转</button>
        <button onClick={() => handleCommand('rotateRight')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向右旋转</button>
        <button onClick={() => handleCommand('reset')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>重置位置</button>
        <button onClick={togglePanelMinimized} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16L18 10H6L12 16Z" fill="#ffffff" />
          </svg>
        </button>
      </div>
    )}

    {/* 控制面板最小化按钮 */}
    {isPanelMinimized ? (
      <div 
        className="control-panel-minimized"
        onClick={togglePanelMinimized}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(10, 10, 20, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8L18 14H6L12 8Z" fill="#00f0ff" />
        </svg>
      </div>
    ) : (
      <div className="control-panel" style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 10, 20, 0.85)',
        borderRadius: '20px',
        border: '2px solid rgba(0, 240, 255, 0.4)',
        padding: '20px',
        display: 'flex',
        gap: '15px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
        zIndex: 10,
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <button onClick={() => handleCommand('rotateLeft')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向左旋转</button>
        <button onClick={() => handleCommand('rotateRight')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向右旋转</button>
        <button onClick={() => handleCommand('reset')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>重置位置</button>
        <button onClick={togglePanelMinimized} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16L18 10H6L12 16Z" fill="#ffffff" />
          </svg>
        </button>
      </div>
    )}

    {/* 控制面板最小化按钮 */}
    {isPanelMinimized ? (
      <div 
        className="control-panel-minimized"
        onClick={togglePanelMinimized}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(10, 10, 20, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8L18 14H6L12 8Z" fill="#00f0ff" />
        </svg>
      </div>
    ) : (
      <div className="control-panel" style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 10, 20, 0.85)',
        borderRadius: '20px',
        border: '2px solid rgba(0, 240, 255, 0.4)',
        padding: '20px',
        display: 'flex',
        gap: '15px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
        zIndex: 10,
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <button onClick={() => handleCommand('rotateLeft')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向左旋转</button>
        <button onClick={() => handleCommand('rotateRight')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向右旋转</button>
        <button onClick={() => handleCommand('reset')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>重置位置</button>
        <button onClick={togglePanelMinimized} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16L18 10H6L12 16Z" fill="#ffffff" />
          </svg>
        </button>
      </div>
    )}

    {/* 控制面板最小化按钮 */}
    {isPanelMinimized ? (
      <div 
        className="control-panel-minimized"
        onClick={togglePanelMinimized}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(10, 10, 20, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8L18 14H6L12 8Z" fill="#00f0ff" />
        </svg>
      </div>
    ) : (
      <div className="control-panel" style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 10, 20, 0.85)',
        borderRadius: '20px',
        border: '2px solid rgba(0, 240, 255, 0.4)',
        padding: '20px',
        display: 'flex',
        gap: '15px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
        zIndex: 10,
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <button onClick={() => handleCommand('rotateLeft')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向左旋转</button>
        <button onClick={() => handleCommand('rotateRight')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向右旋转</button>
        <button onClick={() => handleCommand('reset')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>重置位置</button>
        <button onClick={togglePanelMinimized} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16L18 10H6L12 16Z" fill="#ffffff" />
          </svg>
        </button>
      </div>
    )}

    {/* 控制面板最小化按钮 */}
    {isPanelMinimized ? (
      <div 
        className="control-panel-minimized"
        onClick={togglePanelMinimized}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(10, 10, 20, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8L18 14H6L12 8Z" fill="#00f0ff" />
        </svg>
      </div>
    ) : (
      <div className="control-panel" style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 10, 20, 0.85)',
        borderRadius: '20px',
        border: '2px solid rgba(0, 240, 255, 0.4)',
        padding: '20px',
        display: 'flex',
        gap: '15px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
        zIndex: 10,
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <button onClick={() => handleCommand('rotateLeft')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向左旋转</button>
        <button onClick={() => handleCommand('rotateRight')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向右旋转</button>
        <button onClick={() => handleCommand('reset')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>重置位置</button>
        <button onClick={togglePanelMinimized} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16L18 10H6L12 16Z" fill="#ffffff" />
          </svg>
        </button>
      </div>
    )}

    {/* 控制面板最小化按钮 */}
    {isPanelMinimized ? (
      <div 
        className="control-panel-minimized"
        onClick={togglePanelMinimized}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(10, 10, 20, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8L18 14H6L12 8Z" fill="#00f0ff" />
        </svg>
      </div>
    ) : (
      <div className="control-panel" style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 10, 20, 0.85)',
        borderRadius: '20px',
        border: '2px solid rgba(0, 240, 255, 0.4)',
        padding: '20px',
        display: 'flex',
        gap: '15px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
        zIndex: 10,
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <button onClick={() => handleCommand('rotateLeft')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向左旋转</button>
        <button onClick={() => handleCommand('rotateRight')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向右旋转</button>
        <button onClick={() => handleCommand('reset')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>重置位置</button>
        <button onClick={togglePanelMinimized} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16L18 10H6L12 16Z" fill="#ffffff" />
          </svg>
        </button>
      </div>
    )}

    {/* 控制面板最小化按钮 */}
    {isPanelMinimized ? (
      <div 
        className="control-panel-minimized"
        onClick={togglePanelMinimized}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(10, 10, 20, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8L18 14H6L12 8Z" fill="#00f0ff" />
        </svg>
      </div>
    ) : (
      <div className="control-panel" style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 10, 20, 0.85)',
        borderRadius: '20px',
        border: '2px solid rgba(0, 240, 255, 0.4)',
        padding: '20px',
        display: 'flex',
        gap: '15px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
        zIndex: 10,
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <button onClick={() => handleCommand('rotateLeft')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向左旋转</button>
        <button onClick={() => handleCommand('rotateRight')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向右旋转</button>
        <button onClick={() => handleCommand('reset')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>重置位置</button>
        <button onClick={togglePanelMinimized} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16L18 10H6L12 16Z" fill="#ffffff" />
          </svg>
        </button>
      </div>
    )}

    {/* 控制面板最小化按钮 */}
    {isPanelMinimized ? (
      <div 
        className="control-panel-minimized"
        onClick={togglePanelMinimized}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(10, 10, 20, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8L18 14H6L12 8Z" fill="#00f0ff" />
        </svg>
      </div>
    ) : (
      <div className="control-panel" style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 10, 20, 0.85)',
        borderRadius: '20px',
        border: '2px solid rgba(0, 240, 255, 0.4)',
        padding: '20px',
        display: 'flex',
        gap: '15px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
        zIndex: 10,
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <button onClick={() => handleCommand('rotateLeft')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向左旋转</button>
        <button onClick={() => handleCommand('rotateRight')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向右旋转</button>
        <button onClick={() => handleCommand('reset')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>重置位置</button>
        <button onClick={togglePanelMinimized} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16L18 10H6L12 16Z" fill="#ffffff" />
          </svg>
        </button>
      </div>
    )}

    {/* 控制面板最小化按钮 */}
    {isPanelMinimized ? (
      <div 
        className="control-panel-minimized"
        onClick={togglePanelMinimized}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(10, 10, 20, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8L18 14H6L12 8Z" fill="#00f0ff" />
        </svg>
      </div>
    ) : (
      <div className="control-panel" style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 10, 20, 0.85)',
        borderRadius: '20px',
        border: '2px solid rgba(0, 240, 255, 0.4)',
        padding: '20px',
        display: 'flex',
        gap: '15px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
        zIndex: 10,
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <button onClick={() => handleCommand('rotateLeft')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向左旋转</button>
        <button onClick={() => handleCommand('rotateRight')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向右旋转</button>
        <button onClick={() => handleCommand('reset')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>重置位置</button>
        <button onClick={togglePanelMinimized} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16L18 10H6L12 16Z" fill="#ffffff" />
          </svg>
        </button>
      </div>
    )}

    {/* 控制面板最小化按钮 */}
    {isPanelMinimized ? (
      <div 
        className="control-panel-minimized"
        onClick={togglePanelMinimized}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(10, 10, 20, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8L18 14H6L12 8Z" fill="#00f0ff" />
        </svg>
      </div>
    ) : (
      <div className="control-panel" style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 10, 20, 0.85)',
        borderRadius: '20px',
        border: '2px solid rgba(0, 240, 255, 0.4)',
        padding: '20px',
        display: 'flex',
        gap: '15px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
        zIndex: 10,
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <button onClick={() => handleCommand('rotateLeft')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向左旋转</button>
        <button onClick={() => handleCommand('rotateRight')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向右旋转</button>
        <button onClick={() => handleCommand('reset')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>重置位置</button>
        <button onClick={togglePanelMinimized} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16L18 10H6L12 16Z" fill="#ffffff" />
          </svg>
        </button>
      </div>
    )}

    {/* 控制面板最小化按钮 */}
    {isPanelMinimized ? (
      <div 
        className="control-panel-minimized"
        onClick={togglePanelMinimized}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(10, 10, 20, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8L18 14H6L12 8Z" fill="#00f0ff" />
        </svg>
      </div>
    ) : (
      <div className="control-panel" style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 10, 20, 0.85)',
        borderRadius: '20px',
        border: '2px solid rgba(0, 240, 255, 0.4)',
        padding: '20px',
        display: 'flex',
        gap: '15px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
        zIndex: 10,
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
      }}>
        <button onClick={() => handleCommand('rotateLeft')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向左旋转</button>
        <button onClick={() => handleCommand('rotateRight')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>向右旋转</button>
        <button onClick={() => handleCommand('reset')} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '120px'
        }}>重置位置</button>
        <button onClick={togglePanelMinimized} style={{
          margin: 0,
          padding: '12px 20px',
          minWidth: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16L18 10H6L12 16Z" fill="#ffffff" />
          </svg>
        </button>
      </div>
    )}

    {/* 控制面板最小化按钮 */}
    {isPanelMinimized ? (
      <div 
        className="control-panel-minimized"
        onClick={togglePanelMinimized}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: 'rgba(10, 10, 20, 0.8)',
          backdropFilter: 'blur(8px)',
          border: '2px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 30px rgba(0, 240, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 8L18 14H6L12 8Z" fill="