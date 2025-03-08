import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as handpose from '@tensorflow-models/handpose';

function GestureControl({ onCommand }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [handDetector, setHandDetector] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const requestRef = useRef();
  const previousTimeRef = useRef();

  // 初始化手势检测模型
  useEffect(() => {
    const initHandDetection = async () => {
      try {
        await tf.ready();
        const model = await handpose.load();
        setHandDetector(model);
        console.log('手势识别模型加载完成');
      } catch (error) {
        console.error('手势识别模型加载失败:', error);
        // 即使模型加载失败，也不会导致整个应用崩溃
      }
    };

    initHandDetection();

    // 设置摄像头
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            // 添加视频加载事件监听器
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play();
            };
            // 确保视频已经开始播放
            videoRef.current.onplaying = () => {
              console.log('视频开始播放，视频尺寸:', videoRef.current.videoWidth, 'x', videoRef.current.videoHeight);
              // 初始化画布尺寸
              if (canvasRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
              }
            };
          }
        })
        .catch((error) => {
          console.error('摄像头访问失败:', error);
        });
    }

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

  // 手势检测循环
  useEffect(() => {
    if (!handDetector || !isDetecting || !videoRef.current || !videoRef.current.videoWidth) return;

    const detectHands = async (time) => {
      if (previousTimeRef.current !== undefined) {
        if (videoRef.current && canvasRef.current) {
          try {
            // 确保视频已经准备就绪
            if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
              const hands = await handDetector.estimateHands(videoRef.current);
              
              if (hands.length > 0) {
                const hand = hands[0];
                const fingers = hand.annotations;
                
                // 绘制手部关键点
                drawHand(fingers, canvasRef.current);
                
                // 识别手势
                const gesture = recognizeGesture(fingers);
                if (gesture) {
                  onCommand(gesture);
                }
              }
            }
          } catch (error) {
            console.error('手势检测失败:', error);
            // 继续运行动画帧，不中断应用
          }
        }
      }
      previousTimeRef.current = time;
      requestRef.current = requestAnimationFrame(detectHands);
    };

    requestRef.current = requestAnimationFrame(detectHands);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [handDetector, isDetecting, onCommand]);

  // 绘制手部关键点
  const drawHand = (fingers, canvas) => {
    try {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 确保画布尺寸与视频一致
      if (videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
        // 只有在尺寸不匹配时才重新设置画布尺寸
        if (canvas.width !== videoRef.current.videoWidth || canvas.height !== videoRef.current.videoHeight) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
        }
      }
    
      // 绘制手指关键点
      Object.keys(fingers).forEach(finger => {
        const points = fingers[finger];
        points.forEach(point => {
          ctx.beginPath();
          ctx.arc(point[0], point[1], 5, 0, 2 * Math.PI);
          ctx.fillStyle = 'red';
          ctx.fill();
        });
      });
      
      // 连接关键点
      Object.keys(fingers).forEach(finger => {
        const points = fingers[finger];
        ctx.beginPath();
        ctx.moveTo(points[0][0], points[0][1]);
        for (let i = 1; i < points.length; i++) {
          ctx.lineTo(points[i][0], points[i][1]);
        }
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    } catch (error) {
      console.error('绘制手部关键点失败:', error);
    }
  };

  // 识别手势
  const recognizeGesture = (fingers) => {
    // 获取指尖位置
    const thumbTip = fingers.thumb[3];
    const indexTip = fingers.indexFinger[3];
    const middleTip = fingers.middleFinger[3];
    const ringTip = fingers.ringFinger[3];
    const pinkyTip = fingers.pinky[3];
    
    // 计算指尖与手掌的距离
    const palmBase = fingers.palmBase[0];
    const thumbDistance = distance(thumbTip, palmBase);
    const indexDistance = distance(indexTip, palmBase);
    const middleDistance = distance(middleTip, palmBase);
    const ringDistance = distance(ringTip, palmBase);
    const pinkyDistance = distance(pinkyTip, palmBase);
    
    // 判断手势类型
    
    // 握拳 - 所有手指都靠近手掌
    const fingerThreshold = 100;
    if (thumbDistance < fingerThreshold && indexDistance < fingerThreshold && 
        middleDistance < fingerThreshold && ringDistance < fingerThreshold && 
        pinkyDistance < fingerThreshold) {
      return 'reset';
    }
    
    // 张开手掌 - 所有手指都远离手掌
    if (thumbDistance > fingerThreshold && indexDistance > fingerThreshold && 
        middleDistance > fingerThreshold && ringDistance > fingerThreshold && 
        pinkyDistance > fingerThreshold) {
      return 'rotate';
    }
    
    // 指向上 - 食指伸直，其他手指弯曲
    if (indexDistance > fingerThreshold && thumbDistance < fingerThreshold && 
        middleDistance < fingerThreshold && ringDistance < fingerThreshold && 
        pinkyDistance < fingerThreshold) {
      return 'zoomIn';
    }
    
    // 指向下 - 食指和中指伸直，其他手指弯曲
    if (indexDistance > fingerThreshold && middleDistance > fingerThreshold && 
        thumbDistance < fingerThreshold && ringDistance < fingerThreshold && 
        pinkyDistance < fingerThreshold) {
      return 'zoomOut';
    }
    
    // 大拇指向上 - 只有大拇指伸直
    if (thumbDistance > fingerThreshold && indexDistance < fingerThreshold && 
        middleDistance < fingerThreshold && ringDistance < fingerThreshold && 
        pinkyDistance < fingerThreshold) {
      return 'changeColor';
    }
    
    return null;
  };

  // 计算两点之间的距离
  const distance = (point1, point2) => {
    return Math.sqrt(
      Math.pow(point1[0] - point2[0], 2) + 
      Math.pow(point1[1] - point2[1], 2) + 
      Math.pow(point1[2] - point2[2], 2)
    );
  };

  const toggleDetection = () => {
    setIsDetecting(!isDetecting);
  };

  return (
    <div>
      <button
        onClick={toggleDetection}
        className={`control-btn ${isDetecting ? 'active' : ''}`}
        title="手势控制"
      >
        👋
      </button>
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        autoPlay
        playsInline
        muted
      />
      <canvas
        ref={canvasRef}
        className={`video-preview ${isDetecting ? 'visible' : 'hidden'}`}
        style={{
          opacity: isDetecting ? 1 : 0,
          transform: isDetecting ? 'scale(1)' : 'scale(0.8)',
          transition: 'all 0.3s ease-in-out'
        }}
      />
    </div>
  );
}

export default GestureControl;