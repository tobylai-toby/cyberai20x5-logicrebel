import { marked } from 'marked';

/**
 * 创建并显示一个赛博朋克风格的对话框
 * @param markdown - 要显示的Markdown内容
 * @param okButtonValue - 确定按钮上显示的文本
 * @returns Promise<void> - 当用户点击确定按钮时resolve
 */
export function showCyberpunkDialog(markdown: string, okButtonValue: string = '确定'): Promise<void> {

  // 创建对话框元素
  const dialog = document.createElement('div');
  dialog.className = 'cyberpunk-dialog-overlay';
  
  dialog.innerHTML = `
    <div class="cyberpunk-dialog">
      <div class="cyberpunk-dialog-header">
        <span class="cyberpunk-dialog-close">&times;</span>
      </div>
      <div class="cyberpunk-dialog-content">
        ${marked.parse(markdown)}
      </div>
      <div class="cyberpunk-dialog-footer">
        <button class="cyberpunk-dialog-button">${okButtonValue}</button>
      </div>
    </div>
  `;

  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    .cyberpunk-dialog-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: 'Roboto Mono', monospace;
    }

    .cyberpunk-dialog {
      background: linear-gradient(145deg, #1a1a2e, #16213e);
      border: 2px solid #00ffff;
      border-radius: 8px;
      box-shadow: 0 0 20px #00ffff, 0 0 40px rgba(0, 255, 255, 0.5);
      width: 80%;
      max-width: 600px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      position: relative;
    }

    .cyberpunk-dialog-header {
      padding: 10px;
      border-bottom: 1px solid #00ffff;
      display: flex;
      justify-content: flex-end;
    }

    .cyberpunk-dialog-close {
      color: #00ffff;
      font-size: 28px;
      font-weight: bold;
      cursor: pointer;
      text-shadow: 0 0 5px #00ffff;
    }

    .cyberpunk-dialog-close:hover {
      color: #fff;
      text-shadow: 0 0 10px #00ffff;
    }

    .cyberpunk-dialog-content {
      padding: 20px;
      overflow-y: auto;
      flex: 1;
      color: #fff;
      line-height: 1.6;
    }

    .cyberpunk-dialog-content h1,
    .cyberpunk-dialog-content h2,
    .cyberpunk-dialog-content h3 {
      color: #00ffff;
      text-shadow: 0 0 5px #00ffff;
      margin-top: 0;
    }

    .cyberpunk-dialog-content a {
      color: #0088ff;
      text-decoration: underline;
    }

    .cyberpunk-dialog-content code {
      background-color: rgba(0, 0, 0, 0.3);
      padding: 2px 4px;
      border-radius: 4px;
      color: #00ffff;
    }

    .cyberpunk-dialog-content pre {
      background-color: rgba(0, 0, 0, 0.3);
      padding: 10px;
      border-radius: 4px;
      overflow-x: auto;
    }

    .cyberpunk-dialog-content pre code {
      background-color: transparent;
      padding: 0;
    }

    .cyberpunk-dialog-content ul,
    .cyberpunk-dialog-content ol {
      padding-left: 20px;
    }

    .cyberpunk-dialog-content li {
      margin: 8px 0;
      color: #00ffff;
      text-shadow: 0 0 2px #00ffff;
    }

    .cyberpunk-dialog-footer {
      padding: 15px;
      border-top: 1px solid #00ffff;
      display: flex;
      justify-content: center;
    }

    .cyberpunk-dialog-button {
      padding: 8px 20px;
      background: linear-gradient(45deg, #00ffff, #0088ff);
      color: #000;
      border: 1px solid #00ffff;
      border-radius: 4px;
      font-family: 'Orbitron', 'Courier New', monospace;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 0 5px #00ffff;
    }

    .cyberpunk-dialog-button:hover {
      background: linear-gradient(45deg, #0088ff, #00ffff);
      box-shadow: 0 0 10px #00ffff;
    }
  `;

  // 添加样式到文档
  document.head.appendChild(style);
  
  // 添加对话框到文档
  document.body.appendChild(dialog);

  // 获取对话框元素
  const dialogElement = document.querySelector('.cyberpunk-dialog') as HTMLElement;
  const closeButton = document.querySelector('.cyberpunk-dialog-close') as HTMLElement;
  const okButton = document.querySelector('.cyberpunk-dialog-button') as HTMLElement;
  
  // 检查元素是否存在
  if (!closeButton) {
    console.error('Close button not found');
  }
  if (!okButton) {
    console.error('OK button not found');
  }
  
  console.log('Found okButton:', okButton);
  console.log('Found closeButton:', closeButton);

  // 返回Promise，当用户点击确定按钮或关闭按钮时resolve
  return new Promise((resolve) => {
    const closeDialog = () => {
      console.log('Dialog closing...');
      dialog.remove();
      style.remove();
      resolve();
    };

    // 绑定事件
    if (closeButton) {
      closeButton.addEventListener('click', (e) => {
        console.log('Close button clicked');
        e.preventDefault();
        e.stopPropagation();
        closeDialog();
      });
    }
    
    if (okButton) {
      okButton.addEventListener('click', (e) => {
        console.log('OK button clicked');
        e.preventDefault();
        e.stopPropagation();
        closeDialog();
      });
    }
    
    // 点击对话框外部区域关闭对话框
    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) {
        closeDialog();
      }
    });

    // 按ESC键关闭对话框
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDialog();
        document.removeEventListener('keydown', handleKeyDown);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
  });
}