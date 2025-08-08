import * as Blockly from 'blockly/core';
import { javascriptGenerator } from 'blockly/javascript';
import 'blockly/blocks'; // Import basic blocks
import * as Zh from 'blockly/msg/zh-hans';
import cyberpunkTheme from './blockly-theme';
import './blockly-renderer';
Blockly.setLocale(Zh as any);

// Define AsyncFunction constructor
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

// Define custom blocks
Blockly.Blocks['move_forward'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("向前移动");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("使机器人向前移动一步");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['turn_left'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("向左转");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("使机器人向左转90度");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['turn_right'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("向右转");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("使机器人向右转90度");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['attack'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("攻击");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("攻击面前的敌人");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['face_enemy'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("面向敌人");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("面向相邻的敌人");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['move_to_position'] = {
  init: function() {
    this.appendValueInput("X")
        .setCheck("Number")
        .appendField("前往 X");
    this.appendValueInput("Y")
        .setCheck("Number")
        .appendField("Y");
    this.setInputsInline(true);
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("前往指定坐标位置（自动寻路）");
    this.setHelpUrl("");
  }
};

// 只在拖出来一瞬间添加默认值
Blockly.Blocks['move_to_position'].onchange = function(e: any) {
  if (e.type === 'create') {
    const xInput = this.getInput('X');
    const yInput = this.getInput('Y');
    
    if (xInput && !xInput.connection.targetBlock()) {
      const shadowBlock = this.workspace.newBlock('math_number');
      shadowBlock.setFieldValue('0', 'NUM');
      shadowBlock.setShadow(true);
      xInput.connection.connect(shadowBlock.outputConnection);
    }
    
    if (yInput && !yInput.connection.targetBlock()) {
      const shadowBlock = this.workspace.newBlock('math_number');
      shadowBlock.setFieldValue('0', 'NUM');
      shadowBlock.setShadow(true);
      yInput.connection.connect(shadowBlock.outputConnection);
    }
  }
};







Blockly.Blocks['move_to_nearest_enemy'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("前往最近敌人位置");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("前往最近的敌人位置");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['is_enemy_adjacent'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("旁边是否有敌人");
    this.setOutput(true, "Boolean");
    this.setColour(230);
    this.setTooltip("检查旁边是否有敌人");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['get_enemy_x'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("敌人X坐标");
    this.setOutput(true, "Number");
    this.setColour(230);
    this.setTooltip("获取最近敌人的X坐标");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['get_enemy_y'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("敌人Y坐标");
    this.setOutput(true, "Number");
    this.setColour(230);
    this.setTooltip("获取最近敌人的Y坐标");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['get_position'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("获取当前位置");
    this.setOutput(true, "Position");
    this.setColour(230);
    this.setTooltip("获取机器人的当前位置坐标");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['get_x_position'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("获取X坐标");
    this.setOutput(true, "Number");
    this.setColour(230);
    this.setTooltip("获取机器人的当前X坐标");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['get_y_position'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("获取Y坐标");
    this.setOutput(true, "Number");
    this.setColour(230);
    this.setTooltip("获取机器人的当前Y坐标");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['get_player_health'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("获取玩家血量");
    this.setOutput(true, "Number");
    this.setColour(230);
    this.setTooltip("获取玩家当前血量");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['get_player_max_health'] = {
  init: function() {
    this.appendDummyInput()
        .appendField("获取玩家最大血量");
    this.setOutput(true, "Number");
    this.setColour(230);
    this.setTooltip("获取玩家最大血量");
    this.setHelpUrl("");
  }
};

Blockly.Blocks['say_message'] = {
  init: function() {
    this.appendValueInput("MESSAGE")
        .setCheck("String")
        .appendField("说");
    this.appendValueInput("DURATION")
        .setCheck("Number")
        .appendField("持续");
    this.appendDummyInput()
        .appendField("秒");
    this.setPreviousStatement(true, null);
    this.setNextStatement(true, null);
    this.setColour(230);
    this.setTooltip("让机器人说话");
    this.setHelpUrl("");
  }
};





// Generate JavaScript code for custom blocks
javascriptGenerator.forBlock['move_forward'] = function(_block, _generator) {
  return 'await moveForward();\n';
};

javascriptGenerator.forBlock['turn_left'] = function(_block, _generator) {
  return 'await turnLeft();\n';
};

javascriptGenerator.forBlock['turn_right'] = function(_block, _generator) {
  return 'await turnRight();\n';
};

javascriptGenerator.forBlock['attack'] = function(_block, _generator) {
  return 'await attack();\n';
};

javascriptGenerator.forBlock['face_enemy'] = function(_block, _generator) {
  return 'await faceEnemy();\n';
};

javascriptGenerator.forBlock['move_to_position'] = function(block, generator) {
  const x = generator.valueToCode(block, 'X', 0) || '0';
  const y = generator.valueToCode(block, 'Y', 0) || '0';
  return `await moveToPosition(${x}, ${y});\n`;
};



javascriptGenerator.forBlock['move_to_nearest_enemy'] = function(_block, _generator) {
  return 'await moveToNearestEnemy();\n';
};

javascriptGenerator.forBlock['is_enemy_adjacent'] = function(_block, _generator) {
  return ['isEnemyAdjacent()', 0];
};

javascriptGenerator.forBlock['get_enemy_x'] = function(_block, _generator) {
  return ['getEnemyX()', 0];
};

javascriptGenerator.forBlock['get_enemy_y'] = function(_block, _generator) {
  return ['getEnemyY()', 0];
};

javascriptGenerator.forBlock['get_position'] = function(_block, _generator) {
  return ['getPosition()', 0];
};

javascriptGenerator.forBlock['get_x_position'] = function(_block, _generator) {
  return ['getXPosition()', 0];
};

javascriptGenerator.forBlock['get_y_position'] = function(_block, _generator) {
  return ['getYPosition()', 0];
};

javascriptGenerator.forBlock['get_player_health'] = function(_block, _generator) {
  return ['getPlayerHealth()', 0];
};

javascriptGenerator.forBlock['get_player_max_health'] = function(_block, _generator) {
  return ['getPlayerMaxHealth()', 0];
};

javascriptGenerator.forBlock['say_message'] = function(block, generator) {
  const message = generator.valueToCode(block, 'MESSAGE', 0) || '""';
  const duration = generator.valueToCode(block, 'DURATION', 0) || '3';
  return `await sayMessage(${message}, ${duration});\n`;
};

// Initialize Blockly workspace
export function initBlockly(workspaceDiv: HTMLElement, _toolbox: HTMLElement | null): Blockly.WorkspaceSvg {
  // Use a CDN for Blockly media files
  const mediaPath = 'https://esm.sh/blockly/media/';
  
  // Configuration for Blockly
  const config = {
    toolbox: {
      "kind": "categoryToolbox",
      "contents": [
        {
          "kind": "category",
          "name": "逻辑",
          "categorystyle": "logic_category",
          "contents": [
            {"kind": "block", "type": "controls_if"},
            {"kind": "block", "type": "logic_compare"},
            {"kind": "block", "type": "logic_operation"},
            {"kind": "block", "type": "logic_boolean"},
            {"kind": "block", "type": "logic_negate"}
          ]
        },
        {
          "kind": "category",
          "name": "循环",
          "categorystyle": "loop_category",
          "contents": [
            {"kind": "block", "type": "controls_repeat_ext"},
            {"kind": "block", "type": "controls_whileUntil"},
            {"kind": "block", "type": "controls_for"},
            {"kind": "block", "type": "controls_forEach"}
          ]
        },
        {
          "kind": "category",
          "name": "数学",
          "categorystyle": "math_category",
          "contents": [
            {"kind": "block", "type": "math_number"},

            {"kind": "block", "type": "math_arithmetic"},
            {"kind": "block", "type": "math_single"},
            {"kind": "block", "type": "math_trig"},
            {"kind": "block", "type": "math_constant"},
            {"kind": "block", "type": "math_number_property"},
            {"kind": "block", "type": "math_round"},
            {"kind": "block", "type": "math_on_list"},
            {"kind": "block", "type": "math_modulo"},
            {"kind": "block", "type": "math_constrain"},
            {"kind": "block", "type": "math_random_int"},
            {"kind": "block", "type": "math_random_float"}
          ]
        },
        {
          "kind": "category",
          "name": "文本",
          "categorystyle": "text_category",
          "contents": [
            {"kind": "block", "type": "text"},
            {"kind": "block", "type": "text_join"},
            {"kind": "block", "type": "text_append"},
            {"kind": "block", "type": "text_length"},
            {"kind": "block", "type": "text_isEmpty"},
            {"kind": "block", "type": "text_indexOf"},
            {"kind": "block", "type": "text_charAt"},
            {"kind": "block", "type": "text_getSubstring"},
            {"kind": "block", "type": "text_changeCase"},
            {"kind": "block", "type": "text_trim"}
          ]
        },
        {
          "kind": "category",
          "name": "列表",
          "categorystyle": "list_category",
          "contents": [
            {"kind": "block", "type": "lists_create_with"},
            {"kind": "block", "type": "lists_create_with_item"},
            {"kind": "block", "type": "lists_repeat"},
            {"kind": "block", "type": "lists_length"},
            {"kind": "block", "type": "lists_isEmpty"},
            {"kind": "block", "type": "lists_indexOf"},
            {"kind": "block", "type": "lists_getIndex"},
            {"kind": "block", "type": "lists_setIndex"},
            {"kind": "block", "type": "lists_getSublist"},
            {"kind": "block", "type": "lists_split"},
            {"kind": "block", "type": "lists_sort"}
          ]
        },
        {
          "kind": "category",
          "name": "变量",
          "categorystyle": "variable_category",
          "custom": "VARIABLE"
        },
        {
          "kind": "category",
          "name": "函数",
          "categorystyle": "procedure_category",
          "custom": "PROCEDURE"
        },
        {
          "kind": "sep"
        },
        {
          "kind": "category",
          "name": "机器人",
          "categorystyle": "variable_category",
          "contents": [
            {"kind": "block", "type": "move_forward"},
            {"kind": "block", "type": "turn_left"},
            {"kind": "block", "type": "turn_right"},
            {"kind": "block", "type": "attack"},
            {"kind": "block", "type": "face_enemy"},
            {"kind": "block", "type": "move_to_position"},
            {"kind": "block", "type": "move_to_nearest_enemy"},
            {"kind": "block", "type": "is_enemy_adjacent"},
            {"kind": "block", "type": "get_enemy_x"},
            {"kind": "block", "type": "get_enemy_y"},
            {"kind": "block", "type": "get_x_position"},
            {"kind": "block", "type": "get_y_position"},
            {"kind": "block", "type": "get_player_health"},
            {"kind": "block", "type": "get_player_max_health"},
            {"kind": "block", "type": "say_message"}
          ]
        }
      ]
    },
    grid: {
      spacing: 20,
      length: 3,
      colour: '#2a3a5a',
      snap: true
    },
    trashcan: true,
    zoom: {
      controls: true,
      wheel: true,
      startScale: 1.0,
      maxScale: 3,
      minScale: 0.3,
      scaleSpeed: 1.2
    },
            theme: cyberpunkTheme,
          media: mediaPath,
      renderer: 'custom'
  };
  
  // Inject Blockly into the DOM
  const workspace = Blockly.inject(workspaceDiv, config);
  
  return workspace;
}

// Generate and execute code from Blockly workspace
export function runBlocklyCode(workspace: Blockly.WorkspaceSvg, executionContext: any): Promise<void> {
  // Generate JavaScript code from blocks
  const code = javascriptGenerator.workspaceToCode(workspace);
  
  // Output the generated code to console for debugging
  console.log('Generated JavaScript code:');
  console.log(code);
  
  // Create an AbortController to allow forced termination
  const controller = new AbortController();
  const { signal } = controller;
  
  // Store the controller so it can be accessed from outside to abort execution
  (runBlocklyCode as any).currentController = controller;
  
  // Execute the code with the provided context
  return new Promise((resolve, reject) => {
    // Handle forced abortion
    signal.addEventListener('abort', () => {
      reject(new Error('用户已停止执行'));
    });
    
    try {
      // Create an async function with the execution context
      const func = new AsyncFunction(...Object.keys(executionContext), code);
      // Call the function with the context values
      func(...Object.values(executionContext))
        .then(() => {
          if (!signal.aborted) {
            console.log('Blockly code executed successfully');
            resolve();
          }
        })
        .catch((error: any) => {
          if (!signal.aborted) {
            console.error('Error executing Blockly code:', error);
            reject(error);
          }
        });
    } catch (error) {
      if (!signal.aborted) {
        console.error('Error preparing Blockly code execution:', error);
        reject(error);
      }
    }
  });
}

// Add a method to abort the current execution
(runBlocklyCode as any).abort = function() {
  const controller = (runBlocklyCode as any).currentController;
  if (controller) {
    controller.abort();
  }
};
