
import {arrayEach} from './array';

export const KEY_CODES = {
  MOUSE_LEFT: 1,
  MOUSE_RIGHT: 3,
  MOUSE_MIDDLE: 2,
  BACKSPACE: 8,
  COMMA: 188,
  INSERT: 45,
  DELETE: 46,
  END: 35,
  ENTER: 13,
  ESCAPE: 27,
  CONTROL_LEFT: 91,
  COMMAND_LEFT: 17,
  COMMAND_RIGHT: 93,
  ALT: 18,
  HOME: 36,
  PAGE_DOWN: 34,
  PAGE_UP: 33,
  PERIOD: 190,
  SPACE: 32,
  SHIFT: 16,
  CAPS_LOCK: 20,
  TAB: 9,
  ARROW_RIGHT: 39,
  ARROW_LEFT: 37,
  ARROW_UP: 38,
  ARROW_DOWN: 40,
  F1: 112,
  F2: 113,
  F3: 114,
  F4: 115,
  F5: 116,
  F6: 117,
  F7: 118,
  F8: 119,
  F9: 120,
  F10: 121,
  F11: 122,
  F12: 123,
  A: 65,
  X: 88,
  C: 67,
  V: 86
};

/**
 * Returns true if keyCode represents a printable character.
 *
 * @param {Number} keyCode
 * @returns {Boolean}
 */
export function isPrintableChar(keyCode) {
  return ((keyCode == 32) || //space
      (keyCode >= 48 && keyCode <= 57) || //0-9
      (keyCode >= 65 && keyCode <= 90) || //a-z
      (keyCode >= 96 && keyCode <= 111) || //numpad
      (keyCode >= 186 && keyCode <= 192) || //;=,-./`
      (keyCode >= 219 && keyCode <= 222) || //[]{}\|"'
      keyCode >= 226 //special chars (229 for Asian chars)
      );
}

const metaKeys = {
  '8': true,   // BACKSPACE
  '9': true,   // TAB
  '13': true,  // ENTER
  '16': true,  // SHIFT
  '18': true,  // ALT
  '20': true,  // CAPS_LOCK
  '27': true,  // ESCAPE
  '33': true,  // PAGE_UP
  '34': true,  // PAGE_DOWN
  '35': true,  // END
  '36': true,  // HOME
  '37': true,  // ARROW_LEFT
  '38': true,  // ARROW_UP
  '39': true,  // ARROW_RIGHT
  '40': true,  // ARROW_DOWN
  '46': true,  // DELETE
  '112': true, // F1
  '113': true, // F2
  '114': true, // F3
  '115': true, // F4
  '116': true, // F5
  '117': true, // F6
  '118': true, // F7
  '119': true, // F8
  '120': true, // F9
  '121': true, // F10
  '122': true, // F11
  '123': true // F12
};

/**
 * @param {Number} keyCode
 * @returns {Boolean}
 */
export function isMetaKey(keyCode) {
  return !!metaKeys[keyCode];
}

/**
 * @param {Number} keyCode
 * @returns {Boolean}
 */
export function isCtrlKey(keyCode) {
  switch (keyCode) {
    // SDB: note that on Windows, 91/93 are the Windows key - address this

    case 17:  // control key (left or right) - KEY_CODES.COMMAND_LEFT
    case 91:  // macOS command key (left) - KEY_CODES.CONTROL_LEFT
    case 93:  // macOS command key (right) - KEY_CODES.COMMAND_RIGHT
    case 224: // macOS command key in Firefox
      return true;

    default:
      return false;
  }
}

/**
 * @param {Number} keyCode
 * @param {String} baseCode
 * @returns {Boolean}
 */
export function isKey(keyCode, baseCode) {
  let keys = baseCode.split('|');
  let result = false;

  arrayEach(keys, function(key) {
    if (keyCode === KEY_CODES[key]) {
      result = true;

      return false;
    }
  });

  return result;
}
