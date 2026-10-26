const express = require('express');
const router = express.Router();
const { getCategories, addCategory } = require('../controllers/categoriesController');

router.get('/', getCategories);
router.post('/', addCategory);

module.exports = router;
