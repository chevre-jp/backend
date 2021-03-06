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
 * 座席ルーター
 */
const chevre = require("@chevre/api-nodejs-client");
const createDebug = require("debug");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const Message = require("../../message");
const debug = createDebug('chevre-backend:router');
const NUM_ADDITIONAL_PROPERTY = 5;
const seatRouter = express_1.Router();
seatRouter.all('/new', ...validate(), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    let message = '';
    let errors = {};
    const placeService = new chevre.service.Place({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient
    });
    const categoryCodeService = new chevre.service.CategoryCode({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient
    });
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = express_validator_1.validationResult(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            try {
                debug(req.body);
                req.body.id = '';
                const seat = createFromBody(req, true);
                // const { data } = await placeService.searchScreeningRooms({});
                // const existingMovieTheater = data.find((d) => d.branchCode === screeningRoom.branchCode);
                // if (existingMovieTheater !== undefined) {
                //     throw new Error('枝番号が重複しています');
                // }
                yield placeService.createSeat(seat);
                req.flash('message', '登録しました');
                res.redirect(`/places/seat/${(_c = (_b = (_a = seat.containedInPlace) === null || _a === void 0 ? void 0 : _a.containedInPlace) === null || _b === void 0 ? void 0 : _b.containedInPlace) === null || _c === void 0 ? void 0 : _c.branchCode}:${(_e = (_d = seat.containedInPlace) === null || _d === void 0 ? void 0 : _d.containedInPlace) === null || _e === void 0 ? void 0 : _e.branchCode}:${(_f = seat.containedInPlace) === null || _f === void 0 ? void 0 : _f.branchCode}:${seat.branchCode}/update`);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
    }
    const forms = Object.assign({ additionalProperty: [], name: {} }, req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    const searchMovieTheatersResult = yield placeService.searchMovieTheaters({
        project: { ids: [req.project.id] }
    });
    const searchSeatingTypesResult = yield categoryCodeService.search({
        limit: 100,
        project: { id: { $eq: req.project.id } },
        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.SeatingType } }
    });
    res.render('places/seat/new', {
        message: message,
        errors: errors,
        forms: forms,
        movieTheaters: searchMovieTheatersResult.data,
        seatingTypes: searchSeatingTypesResult.data
    });
}));
seatRouter.get('', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const placeService = new chevre.service.Place({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient
    });
    const searchMovieTheatersResult = yield placeService.searchMovieTheaters({
        project: { ids: [req.project.id] }
    });
    res.render('places/seat/index', {
        message: '',
        movieTheaters: searchMovieTheatersResult.data
    });
}));
seatRouter.get('/search', 
// tslint:disable-next-line:cyclomatic-complexity
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23;
    try {
        const placeService = new chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const { data } = yield placeService.searchSeats({
            limit: limit,
            page: page,
            project: { id: { $eq: req.project.id } },
            branchCode: {
                $regex: (typeof ((_h = (_g = req.query) === null || _g === void 0 ? void 0 : _g.branchCode) === null || _h === void 0 ? void 0 : _h.$eq) === 'string'
                    && ((_k = (_j = req.query) === null || _j === void 0 ? void 0 : _j.branchCode) === null || _k === void 0 ? void 0 : _k.$eq.length) > 0)
                    ? (_m = (_l = req.query) === null || _l === void 0 ? void 0 : _l.branchCode) === null || _m === void 0 ? void 0 : _m.$eq : undefined
            },
            containedInPlace: {
                branchCode: {
                    $eq: (typeof ((_q = (_p = (_o = req.query) === null || _o === void 0 ? void 0 : _o.containedInPlace) === null || _p === void 0 ? void 0 : _p.branchCode) === null || _q === void 0 ? void 0 : _q.$eq) === 'string'
                        && ((_t = (_s = (_r = req.query) === null || _r === void 0 ? void 0 : _r.containedInPlace) === null || _s === void 0 ? void 0 : _s.branchCode) === null || _t === void 0 ? void 0 : _t.$eq.length) > 0)
                        ? (_w = (_v = (_u = req.query) === null || _u === void 0 ? void 0 : _u.containedInPlace) === null || _v === void 0 ? void 0 : _v.branchCode) === null || _w === void 0 ? void 0 : _w.$eq : undefined
                },
                containedInPlace: {
                    branchCode: {
                        $eq: (typeof ((_0 = (_z = (_y = (_x = req.query) === null || _x === void 0 ? void 0 : _x.containedInPlace) === null || _y === void 0 ? void 0 : _y.containedInPlace) === null || _z === void 0 ? void 0 : _z.branchCode) === null || _0 === void 0 ? void 0 : _0.$eq) === 'string'
                            && ((_4 = (_3 = (_2 = (_1 = req.query) === null || _1 === void 0 ? void 0 : _1.containedInPlace) === null || _2 === void 0 ? void 0 : _2.containedInPlace) === null || _3 === void 0 ? void 0 : _3.branchCode) === null || _4 === void 0 ? void 0 : _4.$eq.length) > 0)
                            ? (_8 = (_7 = (_6 = (_5 = req.query) === null || _5 === void 0 ? void 0 : _5.containedInPlace) === null || _6 === void 0 ? void 0 : _6.containedInPlace) === null || _7 === void 0 ? void 0 : _7.branchCode) === null || _8 === void 0 ? void 0 : _8.$eq : undefined
                    },
                    containedInPlace: {
                        branchCode: {
                            $eq: (typeof ((_13 = (_12 = (_11 = (_10 = (_9 = req.query) === null || _9 === void 0 ? void 0 : _9.containedInPlace) === null || _10 === void 0 ? void 0 : _10.containedInPlace) === null || _11 === void 0 ? void 0 : _11.containedInPlace) === null || _12 === void 0 ? void 0 : _12.branchCode) === null || _13 === void 0 ? void 0 : _13.$eq) === 'string'
                                && ((_18 = (_17 = (_16 = (_15 = (_14 = req.query) === null || _14 === void 0 ? void 0 : _14.containedInPlace) === null || _15 === void 0 ? void 0 : _15.containedInPlace) === null || _16 === void 0 ? void 0 : _16.containedInPlace) === null || _17 === void 0 ? void 0 : _17.branchCode) === null || _18 === void 0 ? void 0 : _18.$eq.length) > 0)
                                ? (_23 = (_22 = (_21 = (_20 = (_19 = req.query) === null || _19 === void 0 ? void 0 : _19.containedInPlace) === null || _20 === void 0 ? void 0 : _20.containedInPlace) === null || _21 === void 0 ? void 0 : _21.containedInPlace) === null || _22 === void 0 ? void 0 : _22.branchCode) === null || _23 === void 0 ? void 0 : _23.$eq : undefined
                        }
                    }
                }
            }
            // name: req.query.name
        });
        const results = data.map((seat, index) => {
            return Object.assign(Object.assign({}, seat), { seatingTypeStr: (Array.isArray(seat.seatingType)) ? seat.seatingType.join(',') : '', id: `${seat.branchCode}:${index}` });
        });
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: results
        });
    }
    catch (err) {
        res.json({
            success: false,
            count: 0,
            results: []
        });
    }
}));
// tslint:disable-next-line:use-default-type-parameter
seatRouter.all('/:id/update', ...validate(), (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let message = '';
        let errors = {};
        const splittedId = req.params.id.split(':');
        const movieTheaterBranchCode = splittedId[0];
        const screeningRoomBranchCode = splittedId[1];
        // tslint:disable-next-line:no-magic-numbers
        const screeningRoomSectionBranchCode = splittedId[2];
        // tslint:disable-next-line:no-magic-numbers
        const seatBranchCode = splittedId[3];
        const placeService = new chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const categoryCodeService = new chevre.service.CategoryCode({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const searchMovieTheatersResult = yield placeService.searchMovieTheaters({
            project: { ids: [req.project.id] }
        });
        const searchSeatingTypesResult = yield categoryCodeService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.SeatingType } }
        });
        const searchSeatsResult = yield placeService.searchSeats({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            branchCode: { $eq: seatBranchCode },
            containedInPlace: {
                branchCode: { $eq: screeningRoomSectionBranchCode },
                containedInPlace: {
                    branchCode: { $eq: screeningRoomBranchCode },
                    containedInPlace: {
                        branchCode: { $eq: movieTheaterBranchCode }
                    }
                }
            }
        });
        let seat = searchSeatsResult.data[0];
        if (seat === undefined) {
            throw new Error('Screening Room Not Found');
        }
        if (req.method === 'POST') {
            // バリデーション
            const validatorResult = express_validator_1.validationResult(req);
            errors = validatorResult.mapped();
            if (validatorResult.isEmpty()) {
                try {
                    seat = createFromBody(req, false);
                    debug('saving seat...', seat);
                    yield placeService.updateSeat(seat);
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);
                    return;
                }
                catch (error) {
                    message = error.message;
                }
            }
        }
        const forms = Object.assign(Object.assign({ additionalProperty: [] }, seat), req.body);
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }
        res.render('places/seat/update', {
            message: message,
            errors: errors,
            forms: forms,
            movieTheaters: searchMovieTheatersResult.data,
            seatingTypes: searchSeatingTypesResult.data
        });
    }
    catch (error) {
        next(error);
    }
}));
// tslint:disable-next-line:use-default-type-parameter
seatRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const splittedId = req.params.id.split(':');
    const movieTheaterBranchCode = splittedId[0];
    const screeningRoomBranchCode = splittedId[1];
    // tslint:disable-next-line:no-magic-numbers
    const screeningRoomSectionBranchCode = splittedId[2];
    // tslint:disable-next-line:no-magic-numbers
    const seatBranchCode = splittedId[3];
    const placeService = new chevre.service.Place({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient
    });
    yield placeService.deleteSeat({
        project: { id: req.project.id },
        branchCode: seatBranchCode,
        containedInPlace: {
            branchCode: screeningRoomSectionBranchCode,
            containedInPlace: {
                branchCode: screeningRoomBranchCode,
                containedInPlace: { branchCode: movieTheaterBranchCode }
            }
        }
    });
    res.status(http_status_1.NO_CONTENT)
        .end();
}));
function createFromBody(req, isNew) {
    let seatingType;
    if (typeof req.body.seatingType === 'string' && req.body.seatingType.length > 0) {
        seatingType = [req.body.seatingType];
    }
    return Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: chevre.factory.placeType.Seat, branchCode: req.body.branchCode, containedInPlace: {
            project: { typeOf: req.project.typeOf, id: req.project.id },
            typeOf: chevre.factory.placeType.ScreeningRoomSection,
            branchCode: req.body.containedInPlace.branchCode,
            containedInPlace: {
                project: { typeOf: req.project.typeOf, id: req.project.id },
                typeOf: chevre.factory.placeType.ScreeningRoom,
                branchCode: req.body.containedInPlace.containedInPlace.branchCode,
                containedInPlace: {
                    project: { typeOf: req.project.typeOf, id: req.project.id },
                    typeOf: chevre.factory.placeType.MovieTheater,
                    branchCode: req.body.containedInPlace.containedInPlace.containedInPlace.branchCode
                }
            }
        }, additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                .map((p) => {
                return {
                    name: String(p.name),
                    value: String(p.value)
                };
            })
            : undefined }, (Array.isArray(seatingType)) ? { seatingType: seatingType } : undefined), (!isNew)
        ? {
            $unset: Object.assign({ noExistingAttributeName: 1 }, (seatingType === undefined)
                ? { 'containsPlace.$[screeningRoom].containsPlace.$[screeningRoomSection].containsPlace.$[seat].seatingType': 1 }
                : undefined)
        }
        : undefined);
}
function validate() {
    return [
        express_validator_1.body('branchCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '枝番号'))
            .matches(/^[0-9a-zA-Z\-]+$/)
            .isLength({ max: 20 })
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('枝番号', 20)),
        express_validator_1.body('containedInPlace.containedInPlace.containedInPlace.branchCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '施設')),
        express_validator_1.body('containedInPlace.containedInPlace.branchCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'ルーム')),
        express_validator_1.body('containedInPlace.branchCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', 'セクション'))
        // body('name.ja')
        //     .notEmpty()
        //     .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
        //     .isLength({ max: 64 })
        //     // tslint:disable-next-line:no-magic-numbers
        //     .withMessage(Message.Common.getMaxLength('名称', 64))
    ];
}
exports.default = seatRouter;
