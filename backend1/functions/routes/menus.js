import express from 'express';
import {
  getAllMenus,
  getMenuById,
  createMenu,
  updateMenu,
  addDishToMenu,
  updateDishInMenu,
  removeDishFromMenu,
  toggleMenuActive,
  deleteMenu
} from '../controllers/menusController.js';

const router = express.Router({ mergeParams: true });

// GET all menus
router.get('/', getAllMenus);

// GET menu by ID
router.get('/:id', getMenuById);

// POST create menu
router.post('/', createMenu);

// PUT update menu
router.put('/:id', updateMenu);

// PUT add dish to menu
router.put('/:id/add-dish', addDishToMenu);

// PUT update dish in menu
router.put('/:id/update-dish', updateDishInMenu);

// PUT remove dish from menu
router.put('/:id/remove-dish', removeDishFromMenu);

// PUT toggle menu active
router.put('/:id/toggle-active', toggleMenuActive);

// DELETE menu
router.delete('/:id', deleteMenu);

export default router;
