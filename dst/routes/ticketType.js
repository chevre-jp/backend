"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * 券種管理ルーター
 */
const chevre = require("@chevre/api-nodejs-client");
const express_1 = require("express");
const http_status_1 = require("http-status");
const ticketTypeController = require("../controllers/ticketType");
const ticketTypeMasterRouter = express_1.Router();
// 券種登録
ticketTypeMasterRouter.all('/add', ticketTypeController.add);
// 券種編集
ticketTypeMasterRouter.all('/:id/update', ticketTypeController.update);
/**
 * COA券種インポート
 */
ticketTypeMasterRouter.post('/importFromCOA', (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const placeService = new chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const taskService = new chevre.service.Task({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        // インポート対象の劇場ブランチコードを検索
        const { data } = yield placeService.searchMovieTheaters({ limit: 100 });
        // タスク作成
        const taskAttributes = data.map((d) => {
            return {
                project: req.project,
                name: chevre.factory.taskName.ImportOffersFromCOA,
                status: chevre.factory.taskStatus.Ready,
                runsAt: new Date(),
                remainingNumberOfTries: 1,
                numberOfTried: 0,
                executionResults: [],
                data: {
                    theaterCode: d.branchCode
                }
            };
        });
        const tasks = yield Promise.all(taskAttributes.map((a) => __awaiter(void 0, void 0, void 0, function* () {
            return taskService.create(a);
        })));
        res.status(http_status_1.CREATED)
            .json(tasks);
    }
    catch (error) {
        next(error);
    }
}));
exports.default = ticketTypeMasterRouter;
