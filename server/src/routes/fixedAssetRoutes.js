import express from 'express';
import { authenticate } from '../middleware/authenticate.js';
import { authorize } from '../middleware/authorize.js';
import {
  getFixedAssets,
  createFixedAsset,
  runDepreciation,
} from '../controllers/fixedAssetController.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getFixedAssets);
router.post('/', authorize('admin'), createFixedAsset);
router.post('/:assetId/depreciate', authorize('admin'), runDepreciation);

export default router;
