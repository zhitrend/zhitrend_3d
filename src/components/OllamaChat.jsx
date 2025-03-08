import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaMicrophoneSlash, FaChevronUp, FaChevronDown } from 'react-icons/fa';

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
    setIsListening(!isListening);
    // 这里可以添加语音识别功能，但目前只是UI状态切换
  };

  // 切换最小化状态
  const toggleMinimized = () => {
    setIsMinimized(!isMinimized);
  };

  return (
    <div className="chat-container" style={{
      position: 'absolute',
      right: '20px',
      top: '20px',
      width: isMinimized ? '60px' : '320px',
      height: isMinimized ? '60px' : '450px',
      background: 'rgba(10, 10, 20, 0.85)',
      borderRadius: isMinimized ? '50%' : '18px',
      backdropFilter: 'blur(12px)',
      border: '2px solid rgba(0, 240, 255, 0.4)',
      boxShadow: '0 0 30px rgba(0, 240, 255, 0.4)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
      zIndex: 100
    }}>
      {isMinimized ? (
        <button 
          onClick={toggleMinimized}
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--gradient-primary)',
            border: 'none',
            borderRadius: '50%',
            color: 'var(--text-color)',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 0 15px rgba(0, 240, 255, 0.6) inset'
          }}
        >
          <FaChevronDown />
        </button>
      ) : (
        <>

      <div className="chat-header" style={{
        padding: '12px 15px',
        borderBottom: '2px solid rgba(0, 240, 255, 0.4)',
        color: 'var(--text-color)',
        textAlign: 'center',
        fontWeight: 'bold',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--gradient-primary)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          与{modelName}对话
          <span style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: ollamaStatus === '在线' ? '#00ff00' : 
                      ollamaStatus === '离线' ? '#ff0000' : 
                      ollamaStatus === '超时' ? '#ff9900' : 
                      ollamaStatus === '错误' ? '#ff0000' : '#999999',
            marginLeft: '5px',
            boxShadow: ollamaStatus === '在线' ? '0 0 10px #00ff00' : 
                      ollamaStatus === '离线' ? '0 0 10px #ff0000' : 
                      ollamaStatus === '超时' ? '0 0 10px #ff9900' : 
                      ollamaStatus === '错误' ? '0 0 10px #ff0000' : 'none'
          }} title={`Ollama状态: ${ollamaStatus}`}></span>
        </div>
        <button 
          onClick={toggleMinimized}
          style={{
            background: 'rgba(0, 240, 255, 0.2)',
            border: '1px solid rgba(0, 240, 255, 0.4)',
            color: 'var(--text-color)',
            cursor: 'pointer',
            padding: '5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            transition: 'all 0.3s ease',
            width: '24px',
            height: '24px',
            boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)'
          }}
          title="最小化"
        >
          <FaChevronUp style={{ fontSize: '14px' }} />
        </button>
      </div>
      
      <div ref={chatContainerRef} className="chat-messages" style={{
        flex: 1,
        overflowY: 'auto',
        padding: '15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        scrollBehavior: 'smooth',
        msOverflowStyle: 'none', /* IE and Edge */
        scrollbarWidth: 'thin', /* Firefox */
        background: 'linear-gradient(180deg, rgba(10, 10, 20, 0.4), rgba(20, 20, 40, 0.6))'
      }}>
        {/* 滚动条样式在techTheme.css中定义 */}
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`message ${msg.role}`}
            style={{
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '85%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user' 
                ? 'linear-gradient(135deg, rgba(0, 240, 255, 0.3), rgba(0, 180, 255, 0.2))' 
                : msg.role === 'error' 
                  ? 'linear-gradient(135deg, rgba(255, 0, 76, 0.3), rgba(255, 0, 0, 0.2))' 
                  : msg.role === 'system'
                    ? 'linear-gradient(135deg, rgba(255, 165, 0, 0.3), rgba(255, 140, 0, 0.2))'
                    : 'linear-gradient(135deg, rgba(123, 0, 255, 0.3), rgba(90, 0, 190, 0.2))',
              color: 'var(--text-color)',
              wordBreak: 'break-word',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(4px)',
              fontSize: '15px',
              lineHeight: '1.5'
            }}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div className="loading-indicator" style={{
            alignSelf: 'center',
            color: 'var(--primary-color)',
            opacity: 0.9,
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '8px 16px',
            background: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '20px',
            boxShadow: '0 0 15px rgba(0, 240, 255, 0.3)',
            border: '1px solid rgba(0, 240, 255, 0.2)'
          }}>
            <span className="loading-dots" style={{
              display: 'inline-block',
              animation: 'pulse 1.5s infinite'
            }}>思考中...</span>
          </div>
        )}
      </div>

      <div className="chat-input" style={{
        padding: '15px',
        borderTop: '2px solid rgba(0, 240, 255, 0.4)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        background: 'var(--gradient-primary)',
        backdropFilter: 'blur(12px)'
      }}>
        <div style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          alignItems: 'center'
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isListening ? "正在聆听您的声音..." : "输入消息或点击麦克风语音输入..."}
            style={{
              flex: 1,
              padding: '14px',
              paddingRight: '45px',
              borderRadius: '16px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(0, 240, 255, 0.5)',
              boxShadow: isListening ? '0 0 20px rgba(255, 0, 111, 0.5)' : '0 0 15px rgba(0, 240, 255, 0.3) inset',
              backdropFilter: 'blur(8px)',
              color: 'var(--text-color)',
              resize: 'none',
              height: '48px',
              lineHeight: '20px',
              fontSize: '15px',
              transition: 'all 0.3s ease',
              width: '100%'
            }}
          />
          <button
            onClick={toggleListening}
            className={`voice-input-btn ${isListening ? 'active' : ''}`}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isListening ? 'linear-gradient(135deg, #ff3a3a, #ff006f)' : 'rgba(0, 240, 255, 0.2)',
              border: isListening ? '1px solid #ff006f' : '1px solid rgba(0, 240, 255, 0.5)',
              color: isListening ? 'white' : 'var(--primary-color)',
              boxShadow: isListening ? '0 0 15px rgba(255, 0, 111, 0.7)' : '0 0 10px rgba(0, 240, 255, 0.3)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            title={isListening ? "停止语音输入" : "开始语音输入"}
          >
            {isListening ? <FaMicrophone /> : <FaMicrophone />}
          </button>
        </div>
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          style={{
            padding: '0',
            width: '48px',
            height: '48px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: input.trim() && !isLoading ? 'linear-gradient(135deg, var(--primary-color), var(--secondary-color))' : 'rgba(100, 100, 120, 0.3)',
            border: '1px solid rgba(0, 240, 255, 0.5)',
            color: input.trim() && !isLoading ? 'white' : 'rgba(255, 255, 255, 0.5)',
            cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
            boxShadow: input.trim() && !isLoading ? '0 0 15px rgba(0, 240, 255, 0.5)' : 'none',
            transition: 'all 0.3s ease'
          }}
          title="发送消息"
        >
          <FaPaperPlane style={{ fontSize: '18px' }} />
        </button>
        </>
      )}
    </div>
  );
}

export default OllamaChat;