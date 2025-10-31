import { Router } from 'express';
import { getCountries } from '../controllers/meta';

const router = Router();

router.get('/countries', getCountries);

export default router;




