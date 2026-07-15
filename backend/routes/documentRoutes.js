const express = require('express');
const { protect } = require('../middleware/auth');
const doc = require('../controllers/documentController');

const router = express.Router();

router.use(protect);

router.get('/:roomId/versions', doc.getVersionHistory);
router.post('/:roomId/restore/:versionId', doc.restoreVersion);
router.get('/:roomId/export', doc.exportDocument);

module.exports = router;
