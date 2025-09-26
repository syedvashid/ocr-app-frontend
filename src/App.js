import React, { useState, useRef, useEffect } from 'react';
import { Pen, Eraser, Download, Camera, Trash2, Loader, AlertCircle, CheckCircle, Copy } from 'lucide-react';
import './App.css';

// Backend API configuration
// 'https://ocr-app-backend-dnegbva9b7g5h6d4.centralindia-01.azurewebsites.net'  put this in line 7 link
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// API functions
const processOCRWithBackend = async (imageDataUrl, userId = 'anonymous') => {
  try {
    const response = await fetch(`${API_BASE_URL}/process-ocr`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageDataUrl,
        user_id: userId
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'OCR processing failed');
    }

    return result;
  } catch (error) {
    console.error('OCR API error:', error);
    throw new Error(`OCR processing failed: ${error.message}`);
  }
};

const testBackendConnection = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Backend connection test failed:', error);
    return false;
  }
};

const DrawingOCRApp = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);
  const [paths, setPaths] = useState([]);
  const [brushSize, setBrushSize] = useState(3);
  const [ocrResults, setOcrResults] = useState(null);
  const [selectedText, setSelectedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [error, setError] = useState('');
  const [showCopiedAlert, setShowCopiedAlert] = useState(false);
  // Add these to your useState declarations
  const [userId, setUserId] = useState('');
  const [showCorrectionInput, setShowCorrectionInput] = useState(false);
  const [correctionText, setCorrectionText] = useState('');
  const [currentImageHash, setCurrentImageHash] = useState('');
  // Add this with your other useState declarations
  const [textWasUpdated, setTextWasUpdated] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // for pen and eraser tool
  const [tool, setTool] = useState('pen'); // 'pen' or 'eraser'
  const [eraserSize, setEraserSize] = useState(10);

  // Check backend connection on component mount
  useEffect(() => {
    const checkBackend = async () => {
      const isConnected = await testBackendConnection();
      setBackendStatus(isConnected ? 'connected' : 'disconnected');
    };
    checkBackend();
  }, []);
  // Add this useEffect to auto-populate correction field
  useEffect(() => {
  if (selectedText && showCorrectionInput) {
    setCorrectionText(selectedText);
  }
}, [selectedText, showCorrectionInput]);

// Replace your mobile detection useEffect with these two:
useEffect(() => {
  const checkIfMobile = () => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;
    const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
    setIsMobile(mobileRegex.test(userAgent.toLowerCase()));
  };
  
  checkIfMobile();
}, []);

useEffect(() => {
  if (isMobile && brushSize === 3) {
    setBrushSize(6);
  }
}, [isMobile, brushSize]);

  // Touch event handlers for mobile
  const handleTouchStart = (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  const touch = e.touches[0];
  const canvas = canvasRef.current;
  const rect = canvas.getBoundingClientRect();
  
  // Better coordinate calculation considering canvas scaling
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const x = (touch.clientX - rect.left) * scaleX;
  const y = (touch.clientY - rect.top) * scaleY;
  
  setIsDrawing(true);
  setCurrentPath([{ x, y, tool, size: tool === 'pen' ? brushSize : eraserSize }]);
};

const handleTouchMove = (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  if (!isDrawing) return;
  
  const touch = e.touches[0];
  const canvas = canvasRef.current;
  const rect = canvas.getBoundingClientRect();
  
  // Better coordinate calculation considering canvas scaling
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const x = (touch.clientX - rect.left) * scaleX;
  const y = (touch.clientY - rect.top) * scaleY;
  
  setCurrentPath(prev => [...prev, { x, y, tool, size: tool === 'pen' ? brushSize : eraserSize }]);
};

const handleTouchEnd = (e) => {
  e.preventDefault();
  e.stopPropagation();
  
  if (isDrawing && currentPath.length > 0) {
    setPaths(prev => [...prev, currentPath]);
    setCurrentPath([]);
  }
  setIsDrawing(false);
};

  // Drawing functions
  const startDrawing = (e) => {
  const canvas = canvasRef.current;
  const rect = canvas.getBoundingClientRect();
  
  // Better coordinate calculation
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  
  setIsDrawing(true);
  setCurrentPath([{ x, y, tool, size: tool === 'pen' ? brushSize : eraserSize }]);
};

const draw = (e) => {
  if (!isDrawing) return;
  
  const canvas = canvasRef.current;
  const rect = canvas.getBoundingClientRect();
  
  // Better coordinate calculation
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  
  const x = (e.clientX - rect.left) * scaleX;
  const y = (e.clientY - rect.top) * scaleY;
  
  setCurrentPath(prev => [...prev, { x, y, tool, size: tool === 'pen' ? brushSize : eraserSize }]);
};

  const stopDrawing = () => {
    if (isDrawing && currentPath.length > 0) {
      setPaths(prev => [...prev, currentPath]);
      setCurrentPath([]);
    }
    setIsDrawing(false);
  };

const clearCanvas = () => {
  setPaths([]);
  setCurrentPath([]);
  setOcrResults(null);
  setSelectedText('');
  setError('');
  
  // Also clear the canvas visually
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
};

  const undoLastStroke = () => {
    setPaths(prev => prev.slice(0, -1));
  };

  // Tool switching functions
const switchToPen = () => {
  setTool('pen');
};

const switchToEraser = () => {
  setTool('eraser');
};

  // Canvas drawing effect
useEffect(() => {
  const canvas = canvasRef.current;
  const ctx = canvas.getContext('2d');
  
  // Clear canvas with white background
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw all paths
  [...paths, currentPath].forEach(path => {
    if (path.length > 1) {
      const pathTool = path[0]?.tool || 'pen';
      const pathSize = path[0]?.size || brushSize;
      
      ctx.beginPath();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = pathSize;
      
      if (pathTool === 'eraser') {
        // Eraser mode - use destination-out composite operation
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        // Pen mode - normal drawing
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = '#000';
      }
      
      ctx.moveTo(path[0].x, path[0].y);
      path.forEach(point => ctx.lineTo(point.x, point.y));
      ctx.stroke();
    }
  });
  
  // Reset to normal composite operation
  ctx.globalCompositeOperation = 'source-over';
}, [paths, currentPath, brushSize, eraserSize, tool, isMobile]);

  // OCR Processing
  const processOCR = async () => {
    if (paths.length === 0) {
      setError("Please draw something first!");
      return;
    }

    if (backendStatus !== 'connected') {
      setError("Backend server is not connected. Please make sure the Flask server is running.");
      return;
    }

    setIsProcessing(true);
    setError('');
    setOcrResults(null);
    setSelectedText('');
    setCorrectionText(''); // Add this line
    
    try {
      const canvas = canvasRef.current;
      const imageDataUrl = canvas.toDataURL('image/png');
      
      const result = await processOCRWithBackend(imageDataUrl, userId || 'anonymous');
      console.log('OCR API Result:', result);
      setOcrResults(result);
      setCurrentImageHash(result.image_hash || ''); // Add this line
      
      const originalText = result.original_text || result.text;
      if (originalText && originalText.trim()) {
        setSelectedText(originalText);
      } else {
        if (result.refined_data?.suggestions?.length > 0) {
          setSelectedText(result.refined_data.suggestions[0]);
        }
      }
      
    } catch (error) {
      console.error("OCR processing failed:", error);
      setError(error.message || "Processing failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const selectText = (text) => {
    setSelectedText(text);
  };

  const copyToClipboard = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText).then(() => {
        setShowCopiedAlert(true);
        setTimeout(() => setShowCopiedAlert(false), 2000);
      }).catch(() => {
        setError("Failed to copy to clipboard");
      });
    }
  };
  
  const submitCorrection = async () => {
  if (!correctionText.trim() || correctionText === selectedText) {
    return;
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/submit-feedback`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        original_text: selectedText,
        corrected_text: correctionText.trim(),
        user_id: userId || 'anonymous',
        image_hash: currentImageHash,
        confidence_score: ocrResults?.refined_data?.confidence
      })
    });

    const result = await response.json();
    
    if (result.success) {
      // ✅ UPDATE SELECTED TEXT TO USER'S CORRECTION
      setSelectedText(correctionText.trim());
      
      // ✅ SHOW VISUAL FEEDBACK THAT TEXT WAS UPDATED
      setTextWasUpdated(true);
      setTimeout(() => setTextWasUpdated(false), 3000);
      
      // Show success message
      setShowCopiedAlert(true);
      setTimeout(() => setShowCopiedAlert(false), 3000);
      
      // Clear correction input
      setCorrectionText('');
      setShowCorrectionInput(false);
      
      // Fetch updated learning stats
      // if (userId) {
      //   fetchLearningStats();
      // }
      
      console.log('✅ Correction submitted and selected text updated');
    } else {
      setError('Failed to submit correction: ' + result.error);
    }
    
  } catch (error) {
    console.error('Correction submission failed:', error);
    setError('Failed to submit correction. Please try again.');
  }
};

  const downloadImage = () => {
    const canvas = canvasRef.current;
    const link = document.createElement('a');
    link.download = `drawing_${Date.now()}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  const getStatusIndicator = () => {
    switch (backendStatus) {
      case 'checking':
        return <span className="status-checking">🔄 Checking connection...</span>;
      case 'connected':
        return <span className="status-connected">✅ Backend connected</span>;
      case 'disconnected':
        return <span className="status-disconnected">❌ Backend disconnected</span>;
      default:
        return null;
    }
  };

  const getConfidenceBadge = (confidence) => {
    return `badge badge-${confidence}`;
  };

  return (
    <div className="app-container animate-fade-in">
      {/* Floating background orbs */}
      <div className="floating-orb orb-1"></div>
      <div className="floating-orb orb-2"></div>
      <div className="floating-orb orb-3"></div>

      <div className="content-wrapper">
        {/* Header */}
        <header className="header-section">
          <h1 className="gradient-text main-title">AI-Enhanced Drawing OCR</h1>
          <p className="subtitle">Draw or write text, and our AI will extract and refine it!</p>
          <div className="status-indicator">
            {getStatusIndicator()}
          </div>
        </header>
        {/* User Management Section */}
        <div className="user-section glass-effect">
          <div className="section-header">
            <h3 className="section-title">User Settings</h3>
          </div>
          <div className="user-controls">
            <label>Your User ID (for personalized learning):</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter your name or ID"
              className="user-input"
            />
            <p className="user-hint">
              Using the same ID helps the system learn your handwriting patterns
            </p>
          </div>
        </div>
        {/* Copied Alert */}
        {showCopiedAlert && (
          <div className="alert-popup">
            <CheckCircle size={16} />
            Copied to clipboard!
          </div>
        )}

        <div className="main-content">
          {/* Drawing Pad */}
          <div className="drawing-section glass-effect">
            <div className="section-header">
              <h2 className="section-title">Drawing Pad</h2>
              
              {/* Tool Selection */}
              <div className="tool-controls">
                <div className="tool-buttons">
                  <button
                    onClick={switchToPen}
                    className={`tool-button ${tool === 'pen' ? 'active-tool' : ''}`}
                    title="Pen Tool"
                  >
                    <Pen size={16} />
                    Pen
                  </button>
                  <button
                    onClick={switchToEraser}
                    className={`tool-button ${tool === 'eraser' ? 'active-tool' : ''}`}
                    title="Eraser Tool"
                  >
                    <Eraser size={16} />
                    Eraser
                  </button>
                </div>
                
                {/* Dynamic Size Control */}
                <div className="size-controls">
                  <label>
                    {tool === 'pen' ? 'Brush' : 'Eraser'} Size:
                  </label>
                  <input
                    type="range"
                    min={tool === 'pen' ? (isMobile ? 3 : 1) : 5}
                    max={tool === 'pen' ? (isMobile ? 15 : 10) : 30}
                    value={tool === 'pen' ? brushSize : eraserSize}
                    onChange={(e) => {
                      const size = Number(e.target.value);
                      if (tool === 'pen') {
                        setBrushSize(size);
                      } else {
                        setEraserSize(size);
                      }
                    }}
                    className="size-slider"
                  />
                  <span>
                    {tool === 'pen' ? brushSize : eraserSize}px 
                    {isMobile && tool === 'pen' && ' (Mobile Optimized)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div className="canvas-container">
              <canvas
                ref={canvasRef}
                width={1000}
                height={600}
                className={`drawing-canvas ${tool === 'eraser' ? 'eraser-cursor' : 'pen-cursor'}`}
                style={{
                  touchAction: 'none',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  WebkitTouchCallout: 'none',
                  WebkitTapHighlightColor: 'transparent'
                }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>
            {/* Tool indicator for mobile */}
              {isMobile && (
                <div className="mobile-tool-indicator">
                  <span className={`tool-indicator ${tool}`}>
                    {tool === 'pen' ? '✏️ Drawing Mode' : '🧹 Eraser Mode'}
                  </span>
                </div>
              )}

            {/* Drawing Controls */} 
            <div className="controls-panel">
              <button
                onClick={undoLastStroke}
                className="glow-button btn-warning"
                disabled={paths.length === 0}
              >
                <Eraser size={16} />
                Undo
              </button>
              
              <button
                onClick={clearCanvas}
                className="glow-button btn-danger"
              >
                <Trash2 size={16} />
                Clear
              </button>
              
              <button
                onClick={downloadImage}
                className="glow-button btn-info"
                disabled={paths.length === 0}
              >
                <Download size={16} />
                Download
              </button>
              
              <button
                onClick={processOCR}
                disabled={isProcessing || paths.length === 0 || backendStatus !== 'connected'}
                className={`glow-button btn-success ${isProcessing ? 'processing-pulse' : ''}`}
              >
                {isProcessing ? <Loader className="animate-spin" size={16} /> : <Camera size={16} />}
                {isProcessing ? 'Processing...' : 'Extract Text'}
              </button>
            </div>
          </div>

          {/* Results Panel */}
          <div className="results-section glass-effect">
            <div className="section-header">
              <h2 className="section-title">AI Text Detection</h2>
              {selectedText && (
                <button
                  onClick={copyToClipboard}
                  className="copy-button"
                  title="Copy selected text"
                >
                  <Copy size={14} />
                  Copy
                </button>
              )}
            </div>

            {/* Error Display */}
            {error && (
              <div className="error-message">
                <AlertCircle size={16} />
                <p>{error}</p>
              </div>
            )}

            {/* Processing State */}
            {isProcessing && (
              <div className="processing-state">
                <div className="processing-spinner">
                  <Loader className="animate-spin" size={24} />
                </div>
                <span>AI is analyzing your drawing...</span>
              </div>
            )}

            {/* Results Display */}
            {ocrResults && !isProcessing && (
              <div className="results-display custom-scrollbar">
                {/* Original OCR Text */}
                <div className="text-option-group">
                  <h3 className="option-title">
                    Original OCR Text
                    <span className="badge badge-original">Original</span>
                  </h3>
                  <button
                    onClick={() => selectText(ocrResults.original_text)}
                    className={`text-option ${selectedText === ocrResults.original_text ? 'selected-original' : ''}`}
                  >
                    <p>{ocrResults.original_text || 'No text detected'}</p>
                  </button>
                </div>

                {/* AI Refined Suggestions */}
                {ocrResults.refined_data?.suggestions && (
                  <div className="text-option-group">
                    <h3 className="option-title">
                      AI Refined Suggestions
                      <span className={getConfidenceBadge(ocrResults.refined_data.confidence)}>
                        {ocrResults.refined_data.confidence} confidence
                      </span>
                    </h3>
                    <div className="suggestions-list">
                      {ocrResults.refined_data.suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => selectText(suggestion)}
                          className={`text-option ${selectedText === suggestion ? 'selected-refined' : ''}`}
                        >
                          <div className="suggestion-content">
                            <p>{suggestion}</p>
                            <span className="option-number">Option {index + 1}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Selected Text Display */}
                {selectedText && (
                  <div className={`selected-text-display ${textWasUpdated ? 'text-updated' : ''}`}>
                    <h4>Selected Text:</h4>
                     {textWasUpdated && <span className="update-indicator"> ✅ Updated!</span>}
                    <p>{selectedText}</p>
                  </div>
                )}
              </div>
            )}

            {/* Instructions */}
            {!ocrResults && !isProcessing && !error && (
              <div className="instructions">
                <Pen className="instruction-icon animate-float" size={32} />
                <p>Draw or write something on the canvas, then click "Extract Text" to see our AI analyze and refine your text!</p>
                {backendStatus !== 'connected' && (
                  <p className="backend-warning">
                    Make sure the Flask backend server is running on port 5000
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Correction Input Section */}
          {ocrResults && selectedText && (
            <div className="correction-section glass-effect">
              <div className="section-header">
                <h3 className="section-title">Help Improve Accuracy</h3>
              </div>
              
              <div className="correction-container">
                <p>Is the extracted text incorrect? Help us learn by providing the correct version:</p>
                
                <div className="text-comparison">
                  <div className="text-box">
                    <label>System Result:</label>
                    <div className="readonly-text">{selectedText}</div>
                  </div>
                  
                  <div className="text-box">
                    <label>Correct Text:</label>
                    <textarea
                      value={correctionText}
                      onChange={(e) => setCorrectionText(e.target.value)}
                      placeholder="Type the correct text here..."
                      className="correction-textarea"
                      rows="3"
                    />
                  </div>
                </div>
                
                <div className="correction-actions">
                  <button
                    onClick={submitCorrection}
                    disabled={!correctionText.trim() || correctionText === selectedText}
                    className="glow-button btn-success"
                  >
                    <CheckCircle size={16} />
                    Submit Correction
                  </button>
                  
                  <button
                    onClick={() => {
                      setCorrectionText('');
                      setShowCorrectionInput(false);
                    }}
                    className="glow-button btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>





        {/* Footer */}
        <footer className="footer">
          <p>Powered by Azure Computer Vision API + AI Text Refinement</p>
        </footer>
      </div>

  );
};

export default DrawingOCRApp;
