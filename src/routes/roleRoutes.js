const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticate, checkRole } = require('../middleware/auth');

/**
 * @swagger
 * /api/roles:
 *   get:
 *     summary: Get all roles
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of roles.
 */
router.get('/', authenticate, checkRole(['admin', 'super admin']), roleController.getAllRoles);

/**
 * @swagger
 * /api/roles/{id}:
 *   get:
 *     summary: Get a specific role by ID
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the role to retrieve.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role found.
 *       404:
 *         description: Role not found.
 */
router.get('/:id', authenticate, checkRole(['admin', 'super admin']), roleController.getRoleById);

/**
 * @swagger
 * /api/roles:
 *   post:
 *     summary: Create a new role
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               privileges:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       201:
 *         description: Role created successfully.
 */
router.post('/', authenticate, checkRole(['admin', 'super admin']), roleController.createRole);

/**
 * @swagger
 * /api/roles/{id}:
 *   put:
 *     summary: Update a specific role by ID
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the role to update.
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               privileges:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Role updated successfully.
 *       404:
 *         description: Role not found.
 */
router.put('/:id', authenticate, checkRole(['admin', 'super admin']), roleController.updateRole);

/**
 * @swagger
 * /api/roles/{id}:
 *   delete:
 *     summary: Delete a specific role by ID
 *     tags: [Role Management]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the role to delete.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Role deleted successfully.
 *       404:
 *         description: Role not found.
 */
router.delete('/:id', authenticate, checkRole(['admin', 'super admin']), roleController.deleteRole);

module.exports = router;
