/**
 * @file Utils
 */
/**
 * @module Utils
 */

import {menu} from '../main/index';

/**
 * Get menu item by label.
 * @param label {string} The label of the menu item to search for.
 * @returns {Electron.MenuItem} - The full menu item. Can change things like checked etc.
 */
export function getMenuItem (label) {
	for (let i = 0; i < menu.items.length; i++) {
		const menuItem = menu.items[i].submenu.items.find(item => item.label === label);
		if (menuItem) return menuItem
	}
}
