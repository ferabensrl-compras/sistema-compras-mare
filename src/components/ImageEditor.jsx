// src/components/ImageEditor.jsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  X, Save, Type, ArrowRight, Circle, Square, 
  Minus, Undo2, Redo2, Palette, Download, XIcon 
} from 'lucide-react';

export default function ImageEditor({ imageUrl, onClose, onSave }) {
  const canvasRef = useRef(null);
  const [tool, setTool] = useState('arrow'); // 'arrow', 'text', 'line', 'circle', 'square', 'cross'
  const [color, setColor] = useState('#ff0000');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [textInput, setTextInput] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });

  // Cargar imagen inicial en el canvas
  useEffect(() => {
    if (imageUrl && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Ajustar canvas al tamaño de la imagen
        const maxWidth = 600;
        const maxHeight = 400;
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Dibujar imagen
        ctx.drawImage(img, 0, 0, width, height);
        
        // Guardar estado inicial
        saveToHistory();
      };
      
      img.onerror = () => {
        console.warn('Error cargando imagen desde Storage, intentando método alternativo...');
        loadImageViaProxy(imageUrl);
      };
      
      // Configurar CORS para evitar canvas "tainted"
      img.crossOrigin = 'anonymous';
      img.src = imageUrl;
    }
  }, [imageUrl]);

  // Método alternativo para cargar imágenes con problemas CORS
  const loadImageViaProxy = async (imageUrl) => {
    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      // Fetch la imagen como blob para evitar CORS
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      
      const img = new Image();
      img.onload = () => {
        // Calcular dimensiones
        const maxWidth = 600;
        const maxHeight = 400;
        let { width, height } = img;
        
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Dibujar imagen
        ctx.drawImage(img, 0, 0, width, height);
        
        // Limpiar object URL
        URL.revokeObjectURL(objectUrl);
        
        // Guardar estado inicial sin errores CORS
        setHistory([canvas.toDataURL()]);
        setHistoryIndex(0);
      };
      
      img.src = objectUrl;
    } catch (error) {
      console.error('Error cargando imagen:', error);
      alert('Error cargando la imagen para editar');
    }
  };

  // Guardar estado en historial
  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    try {
      const imageData = canvas.toDataURL();
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(imageData);
      
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    } catch (error) {
      console.warn('No se pudo guardar en historial (CORS):', error);
      // Continuar sin historial si hay problemas CORS
    }
  };

  // Deshacer
  const undo = () => {
    if (historyIndex > 0) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      
      setHistoryIndex(historyIndex - 1);
      img.src = history[historyIndex - 1];
    }
  };

  // Rehacer
  const redo = () => {
    if (historyIndex < history.length - 1) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
      
      setHistoryIndex(historyIndex + 1);
      img.src = history[historyIndex + 1];
    }
  };

  // Obtener posición del mouse relativa al canvas
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Iniciar dibujo
  const startDrawing = (e) => {
    const pos = getMousePos(e);
    setStartPos(pos);
    setIsDrawing(true);

    if (tool === 'text') {
      setTextPosition(pos);
      setShowTextInput(true);
    }
  };

  // Dibujar mientras arrastra
  const draw = (e) => {
    if (!isDrawing || tool === 'text') return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const currentPos = getMousePos(e);
    
    // Restaurar estado anterior para dibujo dinámico
    if (history[historyIndex]) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        // Dibujar forma actual
        drawShape(ctx, startPos, currentPos);
      };
      img.src = history[historyIndex];
    }
  };

  // Finalizar dibujo
  const stopDrawing = (e) => {
    if (!isDrawing || tool === 'text') return;
    
    setIsDrawing(false);
    saveToHistory();
  };

  // Dibujar forma según herramienta
  const drawShape = (ctx, start, end) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    
    switch (tool) {
      case 'line':
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        break;
        
      case 'arrow':
        drawArrow(ctx, start, end);
        break;
        
      case 'circle':
        const radius = Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
        ctx.beginPath();
        ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
        break;
        
      case 'square':
        const width = end.x - start.x;
        const height = end.y - start.y;
        ctx.beginPath();
        ctx.rect(start.x, start.y, width, height);
        ctx.stroke();
        break;
        
      case 'cross':
        // Dibujar X (cruz) - dos líneas diagonales
        ctx.beginPath();
        // Línea diagonal 1: desde start hasta end
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        // Línea diagonal 2: desde esquina opuesta
        ctx.moveTo(start.x, end.y);
        ctx.lineTo(end.x, start.y);
        ctx.stroke();
        break;
    }
  };

  // Dibujar flecha
  const drawArrow = (ctx, start, end) => {
    const headLength = 15;
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    
    // Línea principal
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    
    // Punta de flecha
    ctx.beginPath();
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLength * Math.cos(angle - Math.PI / 6),
      end.y - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.moveTo(end.x, end.y);
    ctx.lineTo(
      end.x - headLength * Math.cos(angle + Math.PI / 6),
      end.y - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.stroke();
  };

  // Agregar texto
  const addText = () => {
    if (!textInput.trim()) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = color;
    ctx.font = '16px Arial';
    ctx.fillText(textInput, textPosition.x, textPosition.y);
    
    setTextInput('');
    setShowTextInput(false);
    saveToHistory();
  };

  // Guardar imagen editada
  const handleSave = () => {
    const canvas = canvasRef.current;
    try {
      const editedImageUrl = canvas.toDataURL('image/png');
      onSave(editedImageUrl);
    } catch (error) {
      console.error('Error guardando imagen editada (CORS):', error);
      alert('Error guardando la imagen. Esto puede ocurrir por restricciones de seguridad del navegador.');
    }
  };

  // Descargar imagen
  const downloadImage = () => {
    const canvas = canvasRef.current;
    try {
      const link = document.createElement('a');
      link.download = 'producto-editado.png';
      link.href = canvas.toDataURL();
      link.click();
    } catch (error) {
      console.error('Error descargando imagen (CORS):', error);
      alert('Error descargando la imagen. Esto puede ocurrir por restricciones de seguridad del navegador.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl" style={{ maxWidth: '90vw', maxHeight: '90vh' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-playfair">Editor de Imagen</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Herramientas */}
        <div className="flex items-center gap-2 p-4 border-b bg-gray-50 flex-wrap">
          {/* Herramientas de dibujo */}
          <div className="flex gap-1">
            <button
              onClick={() => setTool('arrow')}
              className={`p-2 rounded ${tool === 'arrow' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
              title="Flecha"
            >
              <ArrowRight size={18} />
            </button>
            <button
              onClick={() => setTool('text')}
              className={`p-2 rounded ${tool === 'text' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
              title="Texto"
            >
              <Type size={18} />
            </button>
            <button
              onClick={() => setTool('line')}
              className={`p-2 rounded ${tool === 'line' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
              title="Línea"
            >
              <Minus size={18} />
            </button>
            <button
              onClick={() => setTool('circle')}
              className={`p-2 rounded ${tool === 'circle' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
              title="Círculo"
            >
              <Circle size={18} />
            </button>
            <button
              onClick={() => setTool('square')}
              className={`p-2 rounded ${tool === 'square' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
              title="Rectángulo"
            >
              <Square size={18} />
            </button>
            <button
              onClick={() => setTool('cross')}
              className={`p-2 rounded ${tool === 'cross' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200'}`}
              title="Cruz/X para tachar"
            >
              <XIcon size={18} />
            </button>
          </div>

          {/* Separador */}
          <div className="border-l h-8 mx-2"></div>

          {/* Color */}
          <div className="flex items-center gap-2">
            <Palette size={18} />
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 border rounded cursor-pointer"
            />
          </div>

          {/* Grosor */}
          <div className="flex items-center gap-2">
            <span className="text-sm">Grosor:</span>
            <input
              type="range"
              min="1"
              max="10"
              value={strokeWidth}
              onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
              className="w-20"
            />
            <span className="text-sm w-6">{strokeWidth}</span>
          </div>

          {/* Separador */}
          <div className="border-l h-8 mx-2"></div>

          {/* Deshacer/Rehacer */}
          <div className="flex gap-1">
            <button
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"
              title="Deshacer"
            >
              <Undo2 size={18} />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 rounded hover:bg-gray-200 disabled:opacity-50"
              title="Rehacer"
            >
              <Redo2 size={18} />
            </button>
          </div>

          {/* Separador */}
          <div className="border-l h-8 mx-2"></div>

          {/* Descargar */}
          <button
            onClick={downloadImage}
            className="p-2 rounded hover:bg-gray-200"
            title="Descargar imagen"
          >
            <Download size={18} />
          </button>
        </div>

        {/* Canvas */}
        <div className="p-4 overflow-auto" style={{ maxHeight: '60vh' }}>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className="border border-gray-300 cursor-crosshair max-w-full"
            style={{ display: 'block', margin: '0 auto' }}
          />
        </div>

        {/* Input de texto */}
        {showTextInput && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex gap-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Escribe tu texto aquí..."
                className="flex-1 px-3 py-2 border rounded"
                onKeyPress={(e) => e.key === 'Enter' && addText()}
                autoFocus
              />
              <button onClick={addText} className="btn-mare">
                Agregar
              </button>
              <button 
                onClick={() => setShowTextInput(false)} 
                className="btn-mare-secondary"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end gap-3 p-4 border-t">
          <button onClick={onClose} className="btn-mare-secondary">
            Cancelar
          </button>
          <button onClick={handleSave} className="btn-mare">
            <Save size={18} />
            Guardar Cambios
          </button>
        </div>
      </div>
    </div>
  );
}