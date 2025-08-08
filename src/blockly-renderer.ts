import * as Blockly from 'blockly/core';

// 保持Blockly原样，不添加任何赛博朋克风格修改
class CustomConstantsProvider extends Blockly.zelos.ConstantProvider {
  constructor() {
    super();
  }
  
  makeOutsideCorners() {
    // 保持原有形状
    return super.makeOutsideCorners();
  }
  
  makeInsideCorners() {
    // 保持原有形状
    return super.makeInsideCorners();
  }
  
  makePuzzleTab() {
    // 保持原有拼图连接器
    return super.makePuzzleTab();
  }
  
  makeNotch() {
    // 保持原有凹槽连接器
    return super.makeNotch();
  }
  
  // 不添加任何额外的CSS样式
  getCSS_(selector: string) {
    return super.getCSS_(selector);
  }
}

class CustomRenderer extends Blockly.zelos.Renderer {
  constructor(name: string) {
    super(name);
  }
  
  makeConstants_(): Blockly.zelos.ConstantProvider {
    return new CustomConstantsProvider();
  }
}

// 注册自定义渲染器
Blockly.registry.register('renderer', 'custom', CustomRenderer);

export default CustomRenderer;