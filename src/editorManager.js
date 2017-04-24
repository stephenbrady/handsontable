import Handsontable from './browser';
import {WalkontableCellCoords} from './3rdparty/walkontable/src/cell/coords';
import {KEY_CODES, isMetaKey, isCtrlKey} from './helpers/unicode';
import {stopPropagation, stopImmediatePropagation, isImmediatePropagationStopped} from './helpers/dom/event';
import {getEditor} from './editors';
import {eventManager as eventManagerObject} from './eventManager';

function moveSelectionAfterEnter(selection, priv, shiftKey) {
  selection.setSelectedHeaders(false, false, false);
  var enterMoves = typeof priv.settings.enterMoves === 'function' ? priv.settings.enterMoves(event) : priv.settings.enterMoves;

  if (shiftKey) {
    // move selection up
    selection.transformStart(-enterMoves.row, -enterMoves.col);

  } else {
    // move selection down (add a new row if needed)
    selection.transformStart(enterMoves.row, enterMoves.col, true);
  }
}

function moveSelectionUp(selection, shiftKey) {
  if (shiftKey) {
    if (selection.selectedHeader.cols) {
      selection.setSelectedHeaders(selection.selectedHeader.rows, false, false);
    }
    selection.transformEnd(-1, 0);

  } else {
    selection.setSelectedHeaders(false, false, false);
    selection.transformStart(-1, 0);
  }
}

function moveSelectionDown(selection, shiftKey) {
  if (shiftKey) {
    // expanding selection down with shift
    selection.transformEnd(1, 0);
  } else {
    selection.setSelectedHeaders(false, false, false);
    selection.transformStart(1, 0);
  }
}

function moveSelectionRight(selection, shiftKey) {
  if (shiftKey) {
    selection.transformEnd(0, 1);
  } else {
    selection.setSelectedHeaders(false, false, false);
    selection.transformStart(0, 1);
  }
}

function moveSelectionLeft(selection, shiftKey) {
  if (shiftKey) {
    if (selection.selectedHeader.rows) {
      selection.setSelectedHeaders(false, selection.selectedHeader.cols, false);
    }
    selection.transformEnd(0, -1);

  } else {
    selection.setSelectedHeaders(false, false, false);
    selection.transformStart(0, -1);
  }
}

class EditorManager {

  constructor(instance, priv, selection) {
    this.instance = instance;
    this.priv = priv;
    this.selection = selection;

    this.destroyed = false;
    this.eventManager = eventManagerObject(instance);
    this.activeEditor = null;

    this.init();
  }

  init() {
    const onKeyDown = (event) => {
      const instance = this.instance;
      const selection = this.selection;
      const activeEditor = this.activeEditor;
      var ctrlDown, rangeModifier;

      if (!instance.isListening()) {
        return;
      }
      Handsontable.hooks.run(instance, 'beforeKeyDown', event);

      if (this.destroyed) {
        return;
      }
      if (isImmediatePropagationStopped(event)) {
        return;
      }
      this.priv.lastKeyCode = event.keyCode;

      if (!selection.isSelected()) {
        return;
      }
      // catch CTRL but not right ALT (which in some systems triggers ALT+CTRL)
      ctrlDown = (event.ctrlKey || event.metaKey) && !event.altKey;

      if (activeEditor && !activeEditor.isWaiting()) {
        if (!isMetaKey(event.keyCode) && !isCtrlKey(event.keyCode) && !ctrlDown && !this.isEditorOpened()) {
          this.openEditor('', event);

          return;
        }
      }
      rangeModifier = event.shiftKey ? selection.setRangeEnd : selection.setRangeStart;

      switch (event.keyCode) {

        case KEY_CODES.A:
          if (!this.isEditorOpened() && ctrlDown) {
            selection.selectAll();

            event.preventDefault();
            stopPropagation(event);
          }
          break;

        case KEY_CODES.ARROW_UP:
          if (this.isEditorOpened() && !activeEditor.isWaiting()) {
            this.closeEditorAndSaveChanges(ctrlDown);
          }
          moveSelectionUp(selection, event.shiftKey);

          event.preventDefault();
          stopPropagation(event);
          break;

        case KEY_CODES.ARROW_DOWN:
          if (this.isEditorOpened() && !activeEditor.isWaiting()) {
            this.closeEditorAndSaveChanges(ctrlDown);
          }

          moveSelectionDown(selection, event.shiftKey);

          event.preventDefault();
          stopPropagation(event);
          break;

        case KEY_CODES.ARROW_RIGHT:
          if (this.isEditorOpened() && !activeEditor.isWaiting()) {
            this.closeEditorAndSaveChanges(ctrlDown);
          }

          moveSelectionRight(selection, event.shiftKey);

          event.preventDefault();
          stopPropagation(event);
          break;

        case KEY_CODES.ARROW_LEFT:
          if (this.isEditorOpened() && !activeEditor.isWaiting()) {
            this.closeEditorAndSaveChanges(ctrlDown);
          }

          moveSelectionLeft(selection, event.shiftKey);

          event.preventDefault();
          stopPropagation(event);
          break;

        case KEY_CODES.TAB:
          selection.setSelectedHeaders(false, false, false);
          var tabMoves = typeof this.priv.settings.tabMoves === 'function' ? this.priv.settings.tabMoves(event) : this.priv.settings.tabMoves;

          if (event.shiftKey) {
            // move selection left
            selection.transformStart(-tabMoves.row, -tabMoves.col);
          } else {
            // move selection right (add a new column if needed)
            selection.transformStart(tabMoves.row, tabMoves.col, true);
          }
          event.preventDefault();
          stopPropagation(event);
          break;

        case KEY_CODES.BACKSPACE:
        case KEY_CODES.DELETE:
          selection.empty(event);
          this.prepareEditor();
          event.preventDefault();
          break;

        case KEY_CODES.F2:
          /* F2 */
          this.openEditor(null, event);

          if (activeEditor) {
            activeEditor.enableFullEditMode();
          }
          event.preventDefault(); // prevent Opera from opening 'Go to Page dialog'
          break;

        case KEY_CODES.ENTER:
          /* return/enter */
          if (this.isEditorOpened()) {

            if (activeEditor && activeEditor.state !== Handsontable.EditorState.WAITING) {
              this.closeEditorAndSaveChanges(ctrlDown);
            }
            moveSelectionAfterEnter(selection, this.priv, event.shiftKey);

          } else {
            if (instance.getSettings().enterBeginsEditing) {
              this.openEditor(null, event);

              if (activeEditor) {
                activeEditor.enableFullEditMode();
              }
            } else {
              moveSelectionAfterEnter(selection, this.priv, event.shiftKey);
            }
          }
          event.preventDefault(); // don't add newline to field
          stopImmediatePropagation(event); // required by HandsontableEditor
          break;

        case KEY_CODES.ESCAPE:
          if (this.isEditorOpened()) {
            this.closeEditorAndRestoreOriginalValue(ctrlDown);
          }
          event.preventDefault();
          break;

        case KEY_CODES.HOME:
          selection.setSelectedHeaders(false, false, false);
          if (event.ctrlKey || event.metaKey) {
            rangeModifier(new WalkontableCellCoords(0, this.priv.selRange.from.col));
          } else {
            rangeModifier(new WalkontableCellCoords(this.priv.selRange.from.row, 0));
          }
          event.preventDefault(); // don't scroll the window
          stopPropagation(event);
          break;

        case KEY_CODES.END:
          selection.setSelectedHeaders(false, false, false);
          if (event.ctrlKey || event.metaKey) {
            rangeModifier(new WalkontableCellCoords(instance.countRows() - 1, this.priv.selRange.from.col));
          } else {
            rangeModifier(new WalkontableCellCoords(this.priv.selRange.from.row, instance.countCols() - 1));
          }
          event.preventDefault(); // don't scroll the window
          stopPropagation(event);
          break;

        case KEY_CODES.PAGE_UP:
          selection.setSelectedHeaders(false, false, false);
          selection.transformStart(-instance.countVisibleRows(), 0);
          event.preventDefault(); // don't page up the window
          stopPropagation(event);
          break;

        case KEY_CODES.PAGE_DOWN:
          selection.setSelectedHeaders(false, false, false);
          selection.transformStart(instance.countVisibleRows(), 0);
          event.preventDefault(); // don't page down the window
          stopPropagation(event);
          break;
      }
    };

    const keydownHandler = (event) => {
      if (!this.destroyed) {
        this.instance.runHooks('afterDocumentKeyDown', event);
      }
    };

    const onDblClick = (event, coords, elem) => {
      // may be TD or TH
      if (elem.nodeName == 'TD') {
        this.openEditor();

        if (this.activeEditor) {
          this.activeEditor.enableFullEditMode();
        }
      }
    };

    this.instance.addHook('afterDocumentKeyDown', onKeyDown);

    this.eventManager.addEventListener(document.documentElement, 'keydown', keydownHandler);

    this.instance.view.wt.update('onCellDblClick', onDblClick);

    this.instance.addHook('afterDestroy', () => {
      this.destroyed = true;
    });
  }

  /**
   * Destroy current editor, if exists.
   *
   * @function destroyEditor
   * @memberof! Handsontable.EditorManager#
   * @param {Boolean} revertOriginal
   */
  destroyEditor(revertOriginal) {
    this.closeEditor(revertOriginal);
  }

  /**
   * Get active editor.
   *
   * @function getActiveEditor
   * @memberof! Handsontable.EditorManager#
   * @returns {*}
   */
  getActiveEditor() {
    return this.activeEditor;
  }

  /**
   * Prepare text input to be displayed at given grid cell.
   *
   * @function prepareEditor
   * @memberof! Handsontable.EditorManager#
   */
  prepareEditor() {
    var row, col, prop, td, originalValue, cellProperties, editorClass;

    const instance = this.instance;
    const priv = this.priv;
    let activeEditor = this.activeEditor;

    if (activeEditor && activeEditor.isWaiting()) {
      this.closeEditor(false, false, (dataSaved) => {
        if (dataSaved) {
          this.prepareEditor();
        }
      });

      return;
    }

    row = priv.selRange.highlight.row;
    col = priv.selRange.highlight.col;
    prop = instance.colToProp(col);
    td = instance.getCell(row, col);

    originalValue = instance.getSourceDataAtCell(instance.runHooks('modifyRow', row), col);
    cellProperties = instance.getCellMeta(row, col);
    editorClass = instance.getCellEditor(cellProperties);

    if (editorClass) {
      activeEditor = Handsontable.editors.getEditor(editorClass, instance);
      activeEditor.prepare(row, col, prop, td, originalValue, cellProperties);
    } else {
      activeEditor = void 0;
    }

    this.activeEditor = activeEditor;
  }

  /**
   * Check is editor is opened/showed.
   *
   * @function isEditorOpened
   * @memberof! Handsontable.EditorManager#
   * @returns {Boolean}
   */
  isEditorOpened() {
    return this.activeEditor && this.activeEditor.isOpened();
  }

  /**
   * Open editor with initial value.
   *
   * @function openEditor
   * @memberof! Handsontable.EditorManager#
   * @param {String} initialValue
   * @param {DOMEvent} event
   */
  openEditor(initialValue, event) {
    const activeEditor = this.activeEditor;
    if (activeEditor && !activeEditor.cellProperties.readOnly) {
      activeEditor.beginEditing(initialValue, event);
    } else if (activeEditor && activeEditor.cellProperties.readOnly) {

      // move the selection after opening the editor with ENTER key
      if (event && event.keyCode === KEY_CODES.ENTER) {
        moveSelectionAfterEnter(this.selection, this.priv, false);
      }
    }
  }

  /**
   * Close editor, finish editing cell.
   *
   * @function closeEditor
   * @memberof! Handsontable.EditorManager#
   * @param {Boolean} restoreOriginalValue
   * @param {Boolean} [ctrlDown]
   * @param {Function} [callback]
   */
  closeEditor(restoreOriginalValue, ctrlDown, callback) {
    if (this.activeEditor) {
      this.activeEditor.finishEditing(restoreOriginalValue, ctrlDown, callback);
    } else if (callback) {
      callback(false);
    }
  }

  /**
   * Close editor and save changes.
   *
   * @function closeEditorAndSaveChanges
   * @memberof! Handsontable.EditorManager#
   * @param {Boolean} ctrlDown
   */
  closeEditorAndSaveChanges(ctrlDown) {
    return this.closeEditor(false, ctrlDown);
  }

  /**
   * Close editor and restore original value.
   *
   * @function closeEditorAndRestoreOriginalValue
   * @memberof! Handsontable.EditorManager#
   * @param {Boolean} ctrlDown
   */
  closeEditorAndRestoreOriginalValue(ctrlDown) {
    return this.closeEditor(true, ctrlDown);
  }
}

// support for older versions of Handsontable
Handsontable.EditorManager = EditorManager;

export {EditorManager};
