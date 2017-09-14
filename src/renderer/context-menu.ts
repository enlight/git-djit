// Copyright (c) 2017 Vadim Macagon
// MIT License, see LICENSE file for full terms.

import { ISerializedMenuItem } from '../common/ipc';

/**
 * Represents a native context menu.
 *
 * After creating and populating a ContextMenu instance pass it to
 * RendererContextMenuService.show() to display the actual context menu.
 */
export class ContextMenu {
  private _items: ContextMenu.ItemType[] = [];
  private _nextItemId = 1;

  get hasItems(): boolean {
    return this._items.length > 0;
  }

  /** Remove all items from the menu. */
  clear(): void {
    this._items = [];
  }

  activateItem(id: string, isChecked = false) {
    // each item id contains the ids of all its ancestors, so given an item id the item itself
    // can be located by following the ids down the menu hierarchy
    const ids = id.split('.');
    let items = this._items;
    let targetItem: ContextMenu.ItemType | null = null;
    for (let i = 0; i < ids.length; ++i) {
      const itemId = ids.slice(0, i + 1).join('.');
      const matchingItems = items.filter(item => item.id === itemId);
      if (matchingItems.length === 1) {
        targetItem = matchingItems[0];
      } else {
        throw new Error(`ID ${id} doesn't match any menu item!`);
      }
      if (targetItem instanceof ContextMenu.SubMenu) {
        items = targetItem.items;
      } else if (i !== ids.length - 1) {
        throw new Error(`ID ${id} doesn't match any menu item!`);
      }
    }
    if (targetItem instanceof ContextMenu.CheckedItem && isChecked !== undefined) {
      targetItem.isChecked = isChecked;
      targetItem.activate();
    } else if (targetItem instanceof ContextMenu.Item) {
      targetItem.activate();
    }
  }

  /**
   * Create a regular menu item and append it to the end of the menu.
   */
  item(label: string, options?: ContextMenu.IItemOptions): ContextMenu.Item {
    const item = new ContextMenu.Item(`${this._nextItemId++}`, label, options);
    this._items.push(item);
    return item;
  }

  /**
   * Create a separator menu item and append it to the end of the menu.
   */
  separator(): ContextMenu.Separator {
    const separator = new ContextMenu.Separator(`${this._nextItemId++}`);
    this._items.push(separator);
    return separator;
  }

  /**
   * Create a checkbox menu item and append it to the end of the menu.
   */
  checkedItem(label: string, options?: ContextMenu.ICheckedItemOptions): ContextMenu.CheckedItem {
    const item = new ContextMenu.CheckedItem(`${this._nextItemId}`, label, options);
    this._items.push(item);
    return item;
  }

  /**
   * Create a submenu and append it to the end of the menu.
   */
  subMenu(label: string, options?: ContextMenu.IItemOptions): ContextMenu.SubMenu {
    const subMenu = new ContextMenu.SubMenu(`${this._nextItemId++}`, label, options);
    this._items.push(subMenu);
    return subMenu;
  }

  serialize(): { items: ISerializedMenuItem[] } {
    return {
      items: this._items.map(item => item.serialize())
    };
  }
}

export namespace ContextMenu {
  export type ItemType = Item | Separator | CheckedItem | SubMenu;
  export type ActionCallback<TItem> = (item: TItem) => void;
  export interface IItemOptions {
    role?: Electron.MenuItemConstructorOptions['role'];
    action?: ActionCallback<this>;
  }

  /**
   * Menu item that performs an action when activated.
   *
   * Menu items can be activated by being clicked.
   */
  export class Item {
    /**
     * If set then the menu item will act in the standard OS-specific manner and the action property
     * will be ignored.
     *
     * On OS X if this property is set then the label is the only other property that will apply,
     * all other properties will be ignored.
     */
    role: IItemOptions['role'];
    /**
     * Action to perform when the menu item is activated.
     */
    action?: ActionCallback<this>;

    constructor(public id: string, public label: string, options?: IItemOptions) {
      if (options) {
        this.role = options.role;
        this.action = options.action;
      }
    }

    /**
     * Perform the action associated with this menu item.
     */
    activate(): void {
      if (this.action) {
        this.action(this);
      }
    }

    serialize(): ISerializedMenuItem {
      return {
        id: this.id,
        label: this.label,
        type: 'normal',
        role: this.role
      };
    }
  }

  /**
   * Separator menu item.
   */
  export class Separator {
    constructor(public id: string) {
      // noop
    }

    serialize(): ISerializedMenuItem {
      return {
        id: this.id,
        type: 'separator'
      };
    }
  }

  export interface ICheckedItemOptions extends IItemOptions {
    isChecked?: boolean;
  }

  /**
   * Menu item that can be checked/unchecked.
   */
  export class CheckedItem extends Item {
    isChecked: boolean;

    constructor(id: string, label: string, options?: ICheckedItemOptions) {
      super(id, label, options);
      if (options) {
        this.isChecked = options.isChecked || false;
      } else {
        this.isChecked = false;
      }
    }

    serialize(): ISerializedMenuItem {
      return Object.assign(super.serialize(), { type: 'checkbox', checked: this.isChecked });
    }
  }

  /**
   * Menu item that contains other menu items.
   */
  export class SubMenu extends Item {
    items: ItemType[] = [];

    private _nextItemId = 1;

    /**
     * Create a regular menu item and append it to the end of the submenu.
     */
    item(label: string, options?: IItemOptions): ContextMenu.Item {
      const item = new ContextMenu.Item(`${this.id}.${this._nextItemId++}`, label, options);
      this.items.push(item);
      return item;
    }

    /**
     * Create a separator menu item and append it to the end of the submenu.
     */
    separator(): ContextMenu.Separator {
      const separator = new ContextMenu.Separator(`${this.id}.${this._nextItemId++}`);
      this.items.push(separator);
      return separator;
    }

    /**
     * Create a checkbox menu item and append it to the end of the submenu.
     */
    checkedItem(label: string, options?: ICheckedItemOptions): ContextMenu.CheckedItem {
      const item = new ContextMenu.CheckedItem(`${this.id}.${this._nextItemId++}`, label, options);
      this.items.push(item);
      return item;
    }

    /**
     * Create a submenu and append it to the end of the submenu.
     */
    subMenu(label: string, options?: IItemOptions): ContextMenu.SubMenu {
      const subMenu = new ContextMenu.SubMenu(`${this.id}.${this._nextItemId++}`, label, options);
      this.items.push(subMenu);
      return subMenu;
    }

    serialize(): ISerializedMenuItem {
      return Object.assign(super.serialize(), {
        type: 'submenu',
        submenu: this.items.map(item => item.serialize())
      });
    }
  }
}
