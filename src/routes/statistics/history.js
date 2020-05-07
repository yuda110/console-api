import express from 'express';
import asyncHandler from 'express-async-handler';
import * as history from '@controllers/statistics/history';

const router = express.Router();

const controllers = [
    { url: '/stat', func: history.statHistory },
    { url: '/diff', func: history.diffHistory },
    { url: '/list', func: history.listHistorys }
];

controllers.map((config) => {
    router.post(config.url, asyncHandler(async (req, res, next) => {
        res.json(await config.func(req.body));
    }));
});

export default router;