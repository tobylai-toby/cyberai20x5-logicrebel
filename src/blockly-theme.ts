/* Custom Blockly theme for cyberpunk style */
import * as Blockly from 'blockly/core';

// Define a custom cyberpunk theme
const cyberpunkTheme = Blockly.Theme.defineTheme('cyberpunk', {
  'name': 'cyberpunk',
  'base': Blockly.Themes.Classic,
  'componentStyles': {
    'workspaceBackgroundColour': '#0a0f1a',
    'toolboxBackgroundColour': '#121a2e',
    'toolboxForegroundColour': '#e0e0ff',
    'flyoutBackgroundColour': '#0c1424',
    'flyoutForegroundColour': '#e0e0ff',
    'flyoutOpacity': 0.9,
    'scrollbarColour': '#00eeff',
    'scrollbarOpacity': 0.5,
    'insertionMarkerColour': '#ff2a6d',
    'insertionMarkerOpacity': 0.3,
    'markerColour': '#00eeff',
    'cursorColour': '#ff2a6d',
    'selectedGlowColour': '#00eeff',
    'replacementGlowColour': '#ff2a6d',
  },
  'categoryStyles': {
    'logic_category': {
      'colour': '#00eeff'
    },
    'loop_category': {
      'colour': '#ff2a6d'
    },
    'math_category': {
      'colour': '#ffdd57'
    },
    'text_category': {
      'colour': '#00d26a'
    },
    'list_category': {
      'colour': '#9d4edd'
    },
    'variable_category': {
      'colour': '#55aaff'
    },
    'procedure_category': {
      'colour': '#ff9500'
    }
  },
  'blockStyles': {
    'logic_blocks': {
      'colourPrimary': '#00eeff',
      'colourSecondary': '#00bbdd',
      'colourTertiary': '#0088aa'
    },
    'loop_blocks': {
      'colourPrimary': '#ff2a6d',
      'colourSecondary': '#cc2255',
      'colourTertiary': '#991133'
    },
    'math_blocks': {
      'colourPrimary': '#ffdd57',
      'colourSecondary': '#ccaa33',
      'colourTertiary': '#997711'
    },
    'text_blocks': {
      'colourPrimary': '#00d26a',
      'colourSecondary': '#00aa55',
      'colourTertiary': '#007733'
    },
    'list_blocks': {
      'colourPrimary': '#9d4edd',
      'colourSecondary': '#7a2ec4',
      'colourTertiary': '#57119b'
    },
    'variable_blocks': {
      'colourPrimary': '#55aaff',
      'colourSecondary': '#3388dd',
      'colourTertiary': '#1155aa'
    },
    'procedure_blocks': {
      'colourPrimary': '#ff9500',
      'colourSecondary': '#cc7700',
      'colourTertiary': '#995500'
    }
  }
});

export default cyberpunkTheme;