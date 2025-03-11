import React, { useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import ModelLoader from './components/ModelLoader';
import OllamaChat from './components/OllamaChat';
import Model from './components/Model';
import DefaultModel from './components/DefaultModel';

function App() {
  const [modelUrl, setModelUrl] = useState('/Soldier.glb');
  const [modelRotation, setModelRotation] = useState([0, 0, 0]);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);

  const handleCommand = (command) => {
    switch (command) {
      case 'rotateLeft':
        setModelRotation([0, modelRotation[1] - Math.PI / 4, 0]);
        break;
      case 'rotateRight':
        setModelRotation([0, modelRotation[1] + Math.PI / 4, 0]);
        break;
      case 'reset':
        setModelRotation([0, 0, 0]);
        break;
      default:
        break;
    }
  };

  const togglePanelMinimized = () => {
    setIsPanelMinimized(!isPanelMinimized);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas
          camera={{ position: [0, 0, 7], fov: 60 }}
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
              <Model url={modelUrl} rotation={modelRotation} scale={1.2} />
            ) : (
              <DefaultModel onCommand={handleCommand} />
            )}
          </Suspense>
          <OrbitControls enableDamping={true} enableZoom={true} enablePan={true} />
        </Canvas>
        
        <OllamaChat onResponse={handleCommand} />
        
        <div className="model-info">
          <h3>模型控制信息</h3>
          <p>当前模型: {modelUrl.split('/').pop()}</p>
          <p>提示: 使用语音、手势或聊天控制模型</p>
        </div>
        
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
      </div>
    </div>
  );
}

export default App;