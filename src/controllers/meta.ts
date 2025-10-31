import { Request, Response } from 'express';
import { COUNTRIES } from '../constants/countries';

export const getCountries = (req: Request, res: Response): void => {
    res.status(200).json({ success: true, message: 'Countries retrieved', data: COUNTRIES });
};


