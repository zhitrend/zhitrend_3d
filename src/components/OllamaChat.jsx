import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaChevronUp, FaChevronDown, FaPaperPlane } from 'react-icons/fa';

function OllamaChat({ onResponse }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ollamaStatus, setOllamaStatus] = useState('未知'); // 添加Ollama服务状态
  const [retryCount, setRetryCount] = useState(0); // 添加重试计数
  const [isMinimized, setIsMinimized] = useState(false); // 添加最小化状态
  const [isListening, setIsListening] = useState(false); // 添加语音输入状态
  const chatContainerRef = useRef(null);
  const maxRetries = 3; // 最大重试次数
  const modelName = 'qwen2.5:7b'; // 更改为qwen2.5:7b模型

  // 滚动到最新消息
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);
  
  // 检查Ollama服务状态
  useEffect(() => {
    const checkOllamaStatus = async () => {
      try {
        const response = await fetch('http://localhost:11434/api/version', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          // 设置超时时间为3秒
          signal: AbortSignal.timeout(3000)
        });
        
        if (response.ok) {
          const data = await response.json();
          setOllamaStatus('在线');
          console.log('Ollama服务状态: 在线', data);
          // 重置重试计数
          setRetryCount(0);
          // 添加系统消息
          if (messages.length === 0) {
            setMessages([{ role: 'system', content: `已连接到Ollama服务，正在使用${modelName}模型，可以开始对话了。` }]);
          }
        } else {
          setOllamaStatus('错误');
          console.error('Ollama服务返回错误状态码:', response.status);
          // 添加系统消息
          if (messages.length === 0) {
            setMessages([{ role: 'system', content: 'Ollama服务连接失败，请确保Ollama已启动。' }]);
          }
        }
      } catch (error) {
        setOllamaStatus('离线');
        console.error('Ollama服务连接失败:', error);
        // 添加系统消息
        if (messages.length === 0) {
          setMessages([{ role: 'system', content: 'Ollama服务连接失败，请确保Ollama已启动并运行在11434端口。' }]);
        }
      }
    };
    
    // 立即检查一次
    checkOllamaStatus();
    
    // 设置定期检查
    const intervalId = setInterval(checkOllamaStatus, 10000); // 每10秒检查一次
    
    return () => clearInterval(intervalId);
  }, [messages.length, modelName]);

  // 发送消息到Ollama服务
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // 添加用户消息到聊天记录
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      // 如果Ollama状态为离线，先尝试重新连接
      if (ollamaStatus !== '在线' && retryCount < maxRetries) {
        setRetryCount(prev => prev + 1);
        setMessages(prev => [...prev, { role: 'system', content: `正在尝试连接Ollama服务 (尝试 ${retryCount + 1}/${maxRetries})...` }]);
        
        try {
          const statusResponse = await fetch('http://localhost:11434/api/version', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(3000)
          });
          
          if (statusResponse.ok) {
            setOllamaStatus('在线');
            setMessages(prev => [...prev, { role: 'system', content: '已成功连接到Ollama服务！' }]);
          } else {
            throw new Error('Ollama服务未响应');
          }
        } catch (statusError) {
          throw new Error('Ollama服务连接失败，请确保Ollama已启动');
        }
      }
      
      // 设置请求超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 增加超时时间到15秒
      
      const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName, // 使用qwen2.5:7b模型
          prompt: userMessage,
          stream: false
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId); // 清除超时

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`请求失败 (${response.status}): ${errorText || '未知错误'}`);
      }

      const data = await response.json();
      const aiResponse = data.response;
      
      // Ollama连接成功，更新状态
      setOllamaStatus('在线');
      setRetryCount(0);

      // 添加AI响应到聊天记录
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);

      // 触发回调以更新3D模型的行为
      if (onResponse) {
        // 增强关键词识别，使用更多的中文表达方式
        const actionKeywords = {
          walk: ['走', '行走', '散步', '移动', '前进'],
          run: ['跑', '奔跑', '跑步', '冲刺', '快跑'],
          jump: ['跳', '跃', '跳跃', '弹跳', '跳起'],
          idle: ['站', '停', '站立', '静止', '不动'],
          dance: ['舞', '跳舞', '舞蹈', '跳动'],
          rotate: ['转', '旋转', '转动', '自转'],
          changeColor: ['变色', '改变颜色', '换颜色']
        };
        
        // 检查每个动作类型的关键词
        for (const [action, keywords] of Object.entries(actionKeywords)) {
          if (keywords.some(keyword => aiResponse.includes(keyword))) {
            console.log(`检测到动作关键词: ${keywords.find(k => aiResponse.includes(k))}，执行动作: ${action}`);
            onResponse(action);
            break; // 找到第一个匹配的动作后停止
          }
        }
      }
    } catch (error) {
      console.error('发送消息失败:', error);
      
      // 根据错误类型提供更具体的错误信息
      let errorMessage = '发送消息失败，请重试';
      
      if (error.name === 'AbortError') {
        errorMessage = 'Ollama服务响应超时，请检查服务是否正常运行';
        setOllamaStatus('超时');
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = 'Ollama服务连接失败，请确保服务已启动并运行在11434端口';
        setOllamaStatus('离线');
      } else if (error.message.includes('Ollama服务')) {
        errorMessage = error.message;
        setOllamaStatus('离线');
      } else if (error.message.includes('no model named')) {
        errorMessage = `模型 ${modelName} 未找到，请确保已下载该模型`;
        setOllamaStatus('错误');
      }
      
      setMessages(prev => [...prev, { role: 'error', content: errorMessage }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // 切换语音输入状态
  const toggleListening = () => {
    if (!isListening) {
      startListening();
    } else {
      stopListening();
    }
  };

  // 开始语音输入
  const startListening = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new window.webkitSpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'zh-CN';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev + transcript);
      };

      recognition.onerror = (event) => {
        console.error('语音识别错误:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      alert('您的浏览器不支持语音识别功能');
    }
  };

  // 停止语音输入
  const stopListening = () => {
    setIsListening(false);
  };

  // 切换聊天窗口最小化状态
  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };

  // 获取状态指示器颜色
  const getStatusColor = () => {
    switch (ollamaStatus) {
      case '在线':
        return '#00ff00';
      case '离线':
        return '#ff0000';
      case '超时':
        return '#ff6600';
      case '错误':
        return '#ff0066';
      default:
        return '#888888';
    }
  };

  // 渲染消息气泡
  return (
    <div
      style={{
        position: 'fixed',
        right: '20px',
        bottom: isMinimized ? '100px' : '120px',
        width: '380px',
        maxHeight: isMinimized ? '60px' : '600px',
        background: 'rgba(10, 10, 20, 0.85)',
        borderRadius: '20px',
        border: '2px solid rgba(0, 240, 255, 0.4)',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        overflow: 'hidden',
        zIndex: 1000
      }}
    >
      {/* 聊天窗口标题栏 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '15px 20px',
          borderBottom: '1px solid rgba(0, 240, 255, 0.2)',
          background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.1), rgba(123, 0, 255, 0.1))',
          cursor: 'pointer'
        }}
        onClick={toggleMinimized}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: getStatusColor(),
              boxShadow: `0 0 10px ${getStatusColor()}`,
              transition: 'all 0.3s ease'
            }}
          />
          <span style={{ color: '#fff', fontSize: '16px', fontWeight: '600' }}>AI 助手</span>
        </div>
        {isMinimized ? <FaChevronUp /> : <FaChevronDown />}
      </div>

      {/* 聊天消息区域 */}
      <div
        ref={chatContainerRef}
        style={{
          display: isMinimized ? 'none' : 'flex',
          flexDirection: 'column',
          gap: '10px',
          padding: '20px',
          maxHeight: '400px',
          overflowY: 'auto',
          msOverflowStyle: 'none',
          scrollbarWidth: 'none'
        }}
      >
        {messages.map((message, index) => renderMessage(message, index))}
      </div>

      {/* 输入区域 */}
      <div
        style={{
          display: isMinimized ? 'none' : 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '15px 20px',
          borderTop: '1px solid rgba(0, 240, 255, 0.2)',
          background: 'linear-gradient(90deg, rgba(0, 240, 255, 0.05), rgba(123, 0, 255, 0.05))',
          position: 'relative'
        }}
      >
        <button
          onClick={toggleListening}
          style={{
            background: isListening ? 'linear-gradient(135deg, #ff3a3a, #ff006f)' : 'linear-gradient(135deg, rgba(0, 240, 255, 0.2), rgba(123, 0, 255, 0.3))',
            border: isListening ? '1px solid #ff006f' : '1px solid rgba(0, 240, 255, 0.4)',
            padding: '8px',
            color: '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            boxShadow: isListening ? '0 0 15px rgba(255, 0, 111, 0.7)' : '0 0 10px rgba(0, 240, 255, 0.3)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {isListening ? <FaMicrophoneSlash size={20} /> : <FaMicrophone size={20} />}
          
          {/* 添加语音波纹动画效果 */}
          {isListening && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: -1,
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

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="输入消息..."
          style={{
            flex: 1,
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(0, 240, 255, 0.3)',
            borderRadius: '12px',
            padding: '12px',
            color: '#fff',
            fontSize: '16px',
            resize: 'none',
            height: '40px',
            lineHeight: '20px',
            outline: 'none',
            transition: 'all 0.3s ease'
          }}
        />

        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          style={{
            background: input.trim() ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.3), rgba(123, 0, 255, 0.4))' : 'rgba(50, 50, 70, 0.3)',
            border: input.trim() ? '1px solid rgba(0, 240, 255, 0.4)' : '1px solid rgba(100, 100, 120, 0.3)',
            padding: '8px',
            color: input.trim() ? '#ffffff' : '#666',
            cursor: input.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            width: '40px',
            height: '40px',
            boxShadow: input.trim() ? '0 0 10px rgba(0, 240, 255, 0.3)' : 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {isLoading ? (
            <div style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '2px solid rgba(0, 240, 255, 0.3)',
              borderTopColor: '#00f0ff',
              animation: 'spin 1s linear infinite'
            }} />
          ) : (
            <FaPaperPlane size={18} style={{
              transform: 'translateX(-1px)',
              transition: 'all 0.3s ease'
            }} />
          )}
        </button>
      </div>
    </div>
  );

  const renderMessage = (message, index) => {
    const isUser = message.role === 'user';
    const isSystem = message.role === 'system';
    const isError = message.role === 'error';

    return (
      <div 
        key={index} 
        className={`message ${isUser ? 'user-message' : isSystem ? 'system-message' : isError ? 'error-message' : 'ai-message'}`}
        style={{
          alignSelf: isUser ? 'flex-end' : 'flex-start',
          backgroundColor: isUser ? 'rgba(0, 240, 255, 0.15)' : 
                           isSystem ? 'rgba(255, 255, 255, 0.1)' : 
                           isError ? 'rgba(255, 0, 0, 0.15)' : 
                           'rgba(123, 0, 255, 0.15)',
          borderRadius: isUser ? '16px 16px 4px 16px' : isSystem ? '12px' : isError ? '12px' : '16px 4px 16px 16px',
          padding: '12px 18px',
          margin: '8px 0',
          maxWidth: '85%',
          boxShadow: isUser ? '0 2px 15px rgba(0, 240, 255, 0.25)' : 
                    isSystem ? '0 2px 10px rgba(255, 255, 255, 0.15)' : 
                    isError ? '0 2px 15px rgba(255, 0, 0, 0.25)' : 
                    '0 2px 15px rgba(123, 0, 255, 0.25)',
          border: isUser ? '1px solid rgba(0, 240, 255, 0.4)' : 
                  isSystem ? '1px solid rgba(255, 255, 255, 0.2)' : 
                  isError ? '1px solid rgba(255, 0, 0, 0.4)' : 
                  '1px solid rgba(123, 0, 255, 0.4)',
          wordBreak: 'break-word',
          lineHeight: '1.6',
          position: 'relative',
          backdropFilter: 'blur(5px)',
          animation: 'fadeIn 0.3s ease-out',
          transform: 'translateZ(0)',
          transition: 'all 0.2s ease'
        }}
      >
        {isUser && (
          <div style={{ 
            position: 'absolute', 
            top: '-22px', 
            right: '10px', 
            fontSize: '12px', 
            color: 'rgba(0, 240, 255, 0.8)',
            fontWeight: '500',
            textShadow: '0 0 5px rgba(0, 240, 255, 0.5)'
          }}>
            你
          </div>
        )}
        {!isUser && !isSystem && !isError && (
          <div style={{ 
            position: 'absolute', 
            top: '-22px', 
            left: '10px', 
            fontSize: '12px', 
            color: 'rgba(123, 0, 255, 0.8)',
            fontWeight: '500',
            textShadow: '0 0 5px rgba(123, 0, 255, 0.5)'
          }}>
            AI
          </div>
        )}
        {isError && (
          <div style={{ 
            position: 'absolute', 
            top: '-22px', 
            left: '10px', 
            fontSize: '12px', 
            color: 'rgba(255, 0, 0, 0.8)',
            fontWeight: '500',
            textShadow: '0 0 5px rgba(255, 0, 0, 0.5)'
          }}>
            错误
          </div>
        )}
        {message.content}
        
        {/* 添加底部装饰元素，增强科技感 */}
        {!isSystem && (
          <div style={{
            position: 'absolute',
            bottom: '2px',
            [isUser ? 'right' : 'left']: '5px',
            height: '2px',
            width: '40%',
            background: isUser ? 'linear-gradient(to right, transparent, rgba(0, 240, 255, 0.7))' : 
                      isError ? 'linear-gradient(to left, transparent, rgba(255, 0, 0, 0.7))' :
                      'linear-gradient(to left, transparent, rgba(123, 0, 255, 0.7))',
            borderRadius: '1px'
          }} />
        )}
      </div>
    );
  };