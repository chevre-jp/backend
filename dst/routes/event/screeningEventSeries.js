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
 * 上映イベントシリーズマスタ管理ルーター
 */
const chevre = require("@chevre/api-nodejs-client");
const createDebug = require("debug");
const express_1 = require("express");
const express_validator_1 = require("express-validator");
const http_status_1 = require("http-status");
const moment = require("moment-timezone");
const _ = require("underscore");
const Message = require("../../message");
const debug = createDebug('chevre-backend:routes');
const NUM_ADDITIONAL_PROPERTY = 10;
// 1ページに表示するデータ数
// const DEFAULT_LINES: number = 10;
// 作品コード 半角64
const NAME_MAX_LENGTH_CODE = 64;
// 作品名・日本語 全角64
const NAME_MAX_LENGTH_NAME_JA = 64;
// import * as Message from '../../message';
const screeningEventSeriesRouter = express_1.Router();
screeningEventSeriesRouter.all('/add', ...validate(), 
// tslint:disable-next-line:max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const creativeWorkService = new chevre.service.CreativeWork({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient
    });
    const eventService = new chevre.service.Event({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient
    });
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
    // 上映方式タイプ検索
    const searchVideoFormatTypesResult = yield categoryCodeService.search({
        limit: 100,
        project: { id: { $eq: req.project.id } },
        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.VideoFormatType } }
    });
    const searchContentRatingTypesResult = yield categoryCodeService.search({
        limit: 100,
        project: { id: { $eq: req.project.id } },
        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.ContentRatingType } }
    });
    const projectService = new chevre.service.Project({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient
    });
    const project = yield projectService.findById({ id: req.project.id });
    let message = '';
    let errors = {};
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = express_validator_1.validationResult(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            // 作品DB登録
            try {
                const searchMovieResult = yield creativeWorkService.searchMovies({
                    project: { ids: [req.project.id] },
                    identifier: { $eq: req.body.workPerformed.identifier }
                });
                const movie = searchMovieResult.data.shift();
                if (movie === undefined) {
                    throw new Error(`Movie ${req.body.workPerformed.identifier} Not Found`);
                }
                const movieTheater = yield placeService.findMovieTheaterById({ id: req.body.locationId });
                req.body.contentRating = movie.contentRating;
                const attributes = createEventFromBody(req, movie, movieTheater, true);
                debug('saving an event...', attributes);
                const events = yield eventService.create(attributes);
                debug('event created', events[0]);
                req.flash('message', '登録しました');
                const redirect = `/events/screeningEventSeries/${events[0].id}/update`;
                debug('redirecting...', redirect);
                res.redirect(redirect);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
        else {
            message = '入力に誤りがあります';
        }
    }
    const forms = Object.assign({ additionalProperty: [], headline: {}, workPerformed: {}, videoFormatType: [] }, req.body);
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    // 作品マスタ画面遷移
    debug('errors:', errors);
    res.render('events/screeningEventSeries/add', {
        message: message,
        errors: errors,
        forms: forms,
        movie: undefined,
        movieTheaters: searchMovieTheatersResult.data,
        videoFormatTypes: searchVideoFormatTypesResult.data,
        contentRatingTypes: searchContentRatingTypesResult.data,
        paymentServices: (_a = project.settings) === null || _a === void 0 ? void 0 : _a.paymentServices
    });
}));
screeningEventSeriesRouter.get('', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const placeService = new chevre.service.Place({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient
    });
    const searchMovieTheatersResult = yield placeService.searchMovieTheaters({
        project: { ids: [req.project.id] }
    });
    res.render('events/screeningEventSeries/index', {
        movieTheaters: searchMovieTheatersResult.data
    });
}));
screeningEventSeriesRouter.get('/getlist', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c, _d;
    try {
        const eventService = new chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const limit = Number(req.query.limit);
        const page = Number(req.query.page);
        const { data } = yield eventService.search({
            limit: limit,
            page: page,
            sort: { startDate: chevre.factory.sortType.Ascending },
            project: { ids: [req.project.id] },
            name: req.query.name,
            typeOf: chevre.factory.eventType.ScreeningEventSeries,
            endFrom: (req.query.containsEnded === '1') ? undefined : new Date(),
            location: {
                branchCodes: (req.query.locationBranchCode !== '') ? [req.query.locationBranchCode] : undefined
            },
            workPerformed: {
                identifiers: (typeof ((_b = req.query.workPerformed) === null || _b === void 0 ? void 0 : _b.identifier) === 'string' && ((_c = req.query.workPerformed) === null || _c === void 0 ? void 0 : _c.identifier.length) > 0)
                    ? [(_d = req.query.workPerformed) === null || _d === void 0 ? void 0 : _d.identifier]
                    : undefined
            }
        });
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: data
        });
    }
    catch (error) {
        res.json({
            success: false,
            count: 0,
            results: error
        });
    }
}));
/**
 * 名前から作品候補を検索する
 */
screeningEventSeriesRouter.get('/searchMovies', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const creativeWorkService = new chevre.service.CreativeWork({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const searchMovieResult = yield creativeWorkService.searchMovies({
            limit: 100,
            sort: { identifier: chevre.factory.sortType.Ascending },
            project: { ids: [req.project.id] },
            offers: {
                availableFrom: new Date()
            },
            name: req.query.q
        });
        res.json(searchMovieResult);
    }
    catch (error) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json({
            message: error.message
        });
    }
}));
screeningEventSeriesRouter.get('/search', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventService = new chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const placeService = new chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const locationId = req.query.locationId;
        const movieTheater = yield placeService.findMovieTheaterById({ id: locationId });
        const branchCode = movieTheater.branchCode;
        const fromDate = req.query.fromDate;
        const toDate = req.query.toDate;
        if (branchCode === undefined) {
            throw new Error();
        }
        // 上映終了して「いない」施設作品を検索
        const limit = 100;
        const page = 1;
        const { data } = yield eventService.search({
            limit: limit,
            page: page,
            project: { ids: [req.project.id] },
            typeOf: chevre.factory.eventType.ScreeningEventSeries,
            inSessionFrom: (fromDate !== undefined)
                ? moment(`${fromDate}T23:59:59+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                    .toDate()
                : new Date(),
            inSessionThrough: (toDate !== undefined)
                ? moment(`${toDate}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                    .toDate()
                : undefined,
            location: {
                branchCodes: [branchCode]
            }
        });
        const results = data.map((event) => {
            var _a;
            let mvtkFlg = 1;
            const unacceptedPaymentMethod = (_a = event.offers) === null || _a === void 0 ? void 0 : _a.unacceptedPaymentMethod;
            if (Array.isArray(unacceptedPaymentMethod)
                && unacceptedPaymentMethod.includes(chevre.factory.paymentMethodType.MovieTicket)) {
                mvtkFlg = 0;
            }
            let translationType = '';
            if (event.subtitleLanguage !== undefined && event.subtitleLanguage !== null) {
                translationType = '字幕';
            }
            if (event.dubLanguage !== undefined && event.dubLanguage !== null) {
                translationType = '吹替';
            }
            return Object.assign(Object.assign({}, event), { id: event.id, filmNameJa: event.name.ja, filmNameEn: event.name.en, kanaName: event.kanaName, duration: moment.duration(event.duration)
                    .humanize(), contentRating: event.workPerformed.contentRating, translationType: translationType, videoFormat: event.videoFormat, mvtkFlg: mvtkFlg });
        });
        // results.sort((event1, event2) => {
        //     if (event1.filmNameJa > event2.filmNameJa) {
        //         return 1;
        //     }
        //     if (event1.filmNameJa < event2.filmNameJa) {
        //         return -1;
        //     }
        //     return 0;
        // });
        res.json({
            success: true,
            count: (data.length === Number(limit))
                ? (Number(page) * Number(limit)) + 1
                : ((Number(page) - 1) * Number(limit)) + Number(data.length),
            results: results
        });
    }
    catch (_) {
        res.json({
            success: false,
            count: 0,
            results: []
        });
    }
}));
// tslint:disable-next-line:use-default-type-parameter
screeningEventSeriesRouter.all('/:eventId/update', ...validate(), 
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
(req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _e, _f;
    const creativeWorkService = new chevre.service.CreativeWork({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient
    });
    const eventService = new chevre.service.Event({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient
    });
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
    // 上映方式タイプ検索
    const searchVideoFormatTypesResult = yield categoryCodeService.search({
        limit: 100,
        project: { id: { $eq: req.project.id } },
        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.VideoFormatType } }
    });
    const searchContentRatingTypesResult = yield categoryCodeService.search({
        limit: 100,
        project: { id: { $eq: req.project.id } },
        inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.ContentRatingType } }
    });
    let message = '';
    let errors = {};
    const eventId = req.params.eventId;
    const event = yield eventService.findById({
        id: eventId
    });
    let searchMovieResult = yield creativeWorkService.searchMovies({
        project: { ids: [req.project.id] },
        identifier: { $eq: event.workPerformed.identifier }
    });
    let movie = searchMovieResult.data.shift();
    if (movie === undefined) {
        throw new Error(`Movie ${req.body.workPerformed.identifier} Not Found`);
    }
    const projectService = new chevre.service.Project({
        endpoint: process.env.API_ENDPOINT,
        auth: req.user.authClient
    });
    const project = yield projectService.findById({ id: req.project.id });
    if (req.method === 'POST') {
        // バリデーション
        const validatorResult = express_validator_1.validationResult(req);
        errors = validatorResult.mapped();
        if (validatorResult.isEmpty()) {
            // 作品DB登録
            try {
                searchMovieResult = yield creativeWorkService.searchMovies({
                    project: { ids: [req.project.id] },
                    identifier: { $eq: req.body.workPerformed.identifier }
                });
                movie = searchMovieResult.data.shift();
                if (movie === undefined) {
                    throw new Error(`Movie ${req.body.workPerformed.identifier} Not Found`);
                }
                const movieTheater = yield placeService.findMovieTheaterById({ id: req.body.locationId });
                req.body.contentRating = movie.contentRating;
                const attributes = createEventFromBody(req, movie, movieTheater, false);
                debug('saving an event...', attributes);
                yield eventService.update({
                    id: eventId,
                    attributes: attributes
                });
                req.flash('message', '更新しました');
                res.redirect(req.originalUrl);
                return;
            }
            catch (error) {
                message = error.message;
            }
        }
        else {
            message = '入力に誤りがあります';
        }
    }
    let mvtkFlg = 1;
    const unacceptedPaymentMethod = (_e = event.offers) === null || _e === void 0 ? void 0 : _e.unacceptedPaymentMethod;
    if (Array.isArray(unacceptedPaymentMethod)
        && unacceptedPaymentMethod.includes(chevre.factory.paymentMethodType.MovieTicket)) {
        mvtkFlg = 0;
    }
    let translationType = '';
    if (event.subtitleLanguage !== undefined && event.subtitleLanguage !== null) {
        translationType = '0';
    }
    if (event.dubLanguage !== undefined && event.dubLanguage !== null) {
        translationType = '1';
    }
    const forms = Object.assign(Object.assign(Object.assign({ additionalProperty: [], headline: {} }, event), req.body), { nameJa: (_.isEmpty(req.body.nameJa)) ? event.name.ja : req.body.nameJa, nameEn: (_.isEmpty(req.body.nameEn)) ? event.name.en : req.body.nameEn, duration: (_.isEmpty(req.body.duration)) ? moment.duration(event.duration)
            .asMinutes() : req.body.duration, locationId: event.location.id, translationType: translationType, videoFormatType: (Array.isArray(event.videoFormat)) ? event.videoFormat.map((f) => f.typeOf) : [], startDate: (_.isEmpty(req.body.startDate)) ?
            (event.startDate !== null) ? moment(event.startDate)
                .tz('Asia/Tokyo')
                .format('YYYY/MM/DD') : '' :
            req.body.startDate, endDate: (_.isEmpty(req.body.endDate)) ?
            (event.endDate !== null) ? moment(event.endDate)
                .tz('Asia/Tokyo')
                .add(-1, 'day')
                .format('YYYY/MM/DD') : '' :
            req.body.endDate, mvtkFlg: (_.isEmpty(req.body.mvtkFlg)) ? mvtkFlg : req.body.mvtkFlg });
    if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
        // tslint:disable-next-line:prefer-array-literal
        forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
            return {};
        }));
    }
    // 作品マスタ画面遷移
    debug('errors:', errors);
    res.render('events/screeningEventSeries/edit', {
        message: message,
        errors: errors,
        forms: forms,
        movie: movie,
        movieTheaters: searchMovieTheatersResult.data,
        videoFormatTypes: searchVideoFormatTypesResult.data,
        contentRatingTypes: searchContentRatingTypesResult.data,
        paymentServices: (_f = project.settings) === null || _f === void 0 ? void 0 : _f.paymentServices
    });
}));
screeningEventSeriesRouter.get('/:eventId/screeningEvents', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const eventService = new chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const searchScreeningEventsResult = yield eventService.search(Object.assign(Object.assign({}, req.query), { typeOf: chevre.factory.eventType.ScreeningEvent, superEvent: { ids: [req.params.eventId] } }));
        res.json(searchScreeningEventsResult);
    }
    catch (error) {
        res.status(http_status_1.INTERNAL_SERVER_ERROR)
            .json({ error: { message: error.message } });
    }
}));
/**
 * リクエストボディからイベントオブジェクトを作成する
 */
// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
function createEventFromBody(req, movie, movieTheater, isNew) {
    var _a, _b, _c;
    const videoFormat = (Array.isArray(req.body.videoFormatType)) ? req.body.videoFormatType.map((f) => {
        return { typeOf: f, name: f };
    }) : [];
    const soundFormat = (Array.isArray(req.body.soundFormatType)) ? req.body.soundFormatType.map((f) => {
        return { typeOf: f, name: f };
    }) : [];
    // let acceptedPaymentMethod: chevre.factory.paymentMethodType[] | undefined;
    let unacceptedPaymentMethod = req.body.unacceptedPaymentMethod;
    // ムビチケ除外の場合は対応決済方法を追加
    if (typeof unacceptedPaymentMethod === 'string') {
        unacceptedPaymentMethod = [unacceptedPaymentMethod];
    }
    // if (req.body.mvtkFlg !== '1') {
    //     if (!Array.isArray(unacceptedPaymentMethod)) {
    //         unacceptedPaymentMethod = [];
    //     }
    //     unacceptedPaymentMethod.push(chevre.factory.paymentMethodType.MovieTicket);
    // }
    // Object.keys(chevre.factory.paymentMethodType)
    //     .forEach((key) => {
    //         if (acceptedPaymentMethod === undefined) {
    //             acceptedPaymentMethod = [];
    //         }
    //         const paymentMethodType = (<any>chevre.factory.paymentMethodType)[key];
    //         if (req.body.mvtkFlg !== '1' && paymentMethodType === chevre.factory.paymentMethodType.MovieTicket) {
    //             return;
    //         }
    //         acceptedPaymentMethod.push(paymentMethodType);
    //     });
    const offers = Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: chevre.factory.offerType.Offer, priceCurrency: chevre.factory.priceCurrency.JPY }, (Array.isArray(unacceptedPaymentMethod)) ? { unacceptedPaymentMethod: unacceptedPaymentMethod } : undefined);
    let subtitleLanguage;
    if (req.body.translationType === '0') {
        subtitleLanguage = { typeOf: 'Language', name: 'Japanese' };
    }
    let dubLanguage;
    if (req.body.translationType === '1') {
        dubLanguage = { typeOf: 'Language', name: 'Japanese' };
    }
    if (typeof movie.duration !== 'string') {
        throw new Error('コンテンツの上映時間が未登録です');
    }
    let description;
    if (typeof req.body.description === 'string' && req.body.description.length > 0) {
        description = { ja: req.body.description };
    }
    let headline;
    if (typeof ((_a = req.body.headline) === null || _a === void 0 ? void 0 : _a.ja) === 'string' && ((_b = req.body.headline) === null || _b === void 0 ? void 0 : _b.ja.length) > 0) {
        headline = { ja: (_c = req.body.headline) === null || _c === void 0 ? void 0 : _c.ja };
    }
    const workPerformed = Object.assign({ project: movie.project, typeOf: movie.typeOf, id: movie.id, identifier: movie.identifier, name: movie.name }, (typeof movie.duration === 'string') ? { duration: movie.duration } : undefined);
    const duration = (typeof movie.duration === 'string') ? movie.duration : undefined;
    return Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({ project: { typeOf: req.project.typeOf, id: req.project.id }, typeOf: chevre.factory.eventType.ScreeningEventSeries, name: Object.assign({ ja: req.body.nameJa }, (typeof req.body.nameEn === 'string' && req.body.nameEn.length > 0) ? { en: req.body.nameEn } : undefined), kanaName: req.body.kanaName, location: {
            project: { typeOf: req.project.typeOf, id: req.project.id },
            id: movieTheater.id,
            typeOf: movieTheater.typeOf,
            branchCode: movieTheater.branchCode,
            name: movieTheater.name,
            kanaName: movieTheater.kanaName
        }, 
        // organizer: {
        //     typeOf: OrganizationType.MovieTheater,
        //     identifier: params.movieTheater.identifier,
        //     name: params.movieTheater.name
        // },
        videoFormat: videoFormat, soundFormat: soundFormat, workPerformed: workPerformed, startDate: (typeof req.body.startDate === 'string' && req.body.startDate.length > 0)
            ? moment(`${req.body.startDate}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                .toDate()
            : undefined, endDate: (typeof req.body.endDate === 'string' && req.body.endDate.length > 0)
            ? moment(`${req.body.endDate}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                .add(1, 'day')
                .toDate()
            : undefined, eventStatus: chevre.factory.eventStatusType.EventScheduled, additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                .map((p) => {
                return {
                    name: String(p.name),
                    value: String(p.value)
                };
            })
            : undefined, offers: offers }, (typeof duration === 'string') ? { duration } : undefined), (subtitleLanguage !== undefined) ? { subtitleLanguage } : undefined), (dubLanguage !== undefined) ? { dubLanguage } : undefined), (headline !== undefined) ? { headline } : undefined), (description !== undefined) ? { description } : undefined), (!isNew)
        ? {
            $unset: Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, (typeof duration !== 'string') ? { duration: 1 } : undefined), (subtitleLanguage === undefined) ? { subtitleLanguage: 1 } : undefined), (dubLanguage === undefined) ? { dubLanguage: 1 } : undefined), (headline === undefined) ? { headline: 1 } : undefined), (description === undefined) ? { description: 1 } : undefined)
        }
        : undefined);
}
function validate() {
    return [
        express_validator_1.body('workPerformed.identifier', Message.Common.required.replace('$fieldName$', 'コード'))
            .notEmpty(),
        express_validator_1.body('workPerformed.identifier', Message.Common.getMaxLength('コード', NAME_MAX_LENGTH_CODE))
            .isLength({ max: NAME_MAX_LENGTH_CODE }),
        express_validator_1.body('nameJa', Message.Common.required.replace('$fieldName$', '名称'))
            .notEmpty(),
        express_validator_1.body('nameJa', Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_CODE))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA }),
        express_validator_1.body('kanaName', Message.Common.getMaxLength('名称カナ', NAME_MAX_LENGTH_NAME_JA))
            .optional()
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA }),
        // body('startDate')
        //     .isDate()
        //     .withMessage('日付を入力してください'),
        // body('endDate')
        //     .isDate()
        //     .withMessage('日付を入力してください'),
        express_validator_1.body('headline.ja', Message.Common.getMaxLength('サブタイトル', NAME_MAX_LENGTH_CODE))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
        // body('videoFormatType', Message.Common.required.replace('$fieldName$', '上映方式'))
        //     .notEmpty()
    ];
}
exports.default = screeningEventSeriesRouter;
