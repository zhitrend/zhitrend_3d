import React, { useEffect, useState } from 'react';

function VoiceControl({ onCommand }) {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);

  useEffect(() => {
    let recognition = null;
    
    if ('webkitSpeechRecognition' in window) {
      try {
        recognition = new window.webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'zh-CN';
    
        recognition.onstart = () => {
          setIsListening(true);
        };
    
        recognition.onend = () => {
          setIsListening(false);
        };
    
        recognition.onerror = (event) => {
          console.error('语音识别错误:', event.error);
          setIsListening(false);
          // 显示友好的错误提示
          const errorMessage = document.createElement('div');
          errorMessage.style.cssText = 'position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: rgba(255, 0, 0, 0.8); color: white; padding: 10px 20px; border-radius: 5px; z-index: 1000;';
          errorMessage.textContent = '语音识别出错，请重试';
          document.body.appendChild(errorMessage);
          setTimeout(() => errorMessage.remove(), 3000);
        };
    
        recognition.onresult = (event) => {
          const transcript = Array.from(event.results)
            .map(result => result[0])
            .map(result => result.transcript)
            .join('');
    
          // 处理语音命令
          if (transcript.includes('旋转')) {
            onCommand('rotate');
          } else if (transcript.includes('放大') || transcript.includes('靠近')) {
            onCommand('zoomIn');
          } else if (transcript.includes('缩小') || transcript.includes('远离')) {
            onCommand('zoomOut');
          } else if (transcript.includes('重置') || transcript.includes('复位')) {
            onCommand('reset');
          } else if (transcript.includes('左转')) {
            onCommand('rotateLeft');
          } else if (transcript.includes('右转')) {
            onCommand('rotateRight');
          } else if (transcript.includes('上看')) {
            onCommand('lookUp');
          } else if (transcript.includes('下看')) {
            onCommand('lookDown');
          } else if (transcript.includes('变色') || transcript.includes('换颜色')) {
            onCommand('changeColor');
          } else if (transcript.includes('走路') || transcript.includes('行走')) {
            onCommand('walk');
          } else if (transcript.includes('跑步') || transcript.includes('奔跑')) {
            onCommand('run');
          } else if (transcript.includes('跳跃') || transcript.includes('跳起')) {
            onCommand('jump');
          } else if (transcript.includes('停止') || transcript.includes('站立')) {
            onCommand('idle');
          }
        };
    
        setRecognition(recognition);
      } catch (error) {
        console.error('语音识别初始化失败:', error);
      }
    } else {
      console.warn('浏览器不支持语音识别API');
    }
    
    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [onCommand]);

  const toggleListening = () => {
    if (recognition) {
      if (isListening) {
        recognition.stop();
      } else {
        recognition.start();
      }
    }
  };

  return (
    <button
      onClick={toggleListening}
      className={`control-btn voice-control-btn ${isListening ? 'active' : ''}`}
      title="语音控制"
      style={{
        width: '50px',
        height: '50px',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '22px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <span style={{
        position: 'relative',
        zIndex: 2
      }}>🎤</span>
      {isListening && (
        <div className="voice-waves" style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1,
          overflow: 'hidden'
        }}>
          {[...Array(3)].map((_, i) => (
            <div key={i} style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: `${(i + 1) * 30}%`,
              height: `${(i + 1) * 30}%`,
              borderRadius: '50%',
              border: '2px solid rgba(255, 0, 111, 0.7)',
              opacity: 0,
              animation: `pulse-wave ${1 + i * 0.4}s infinite ease-out`,
            }} />
          ))}
        </div>
      )}
    </button>
  );
}

export default VoiceControl;