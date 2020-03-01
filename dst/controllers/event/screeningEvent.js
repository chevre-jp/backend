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
 * 上映イベントコントローラー
 */
const chevre = require("@chevre/api-nodejs-client");
const createDebug = require("debug");
const http_status_1 = require("http-status");
const moment = require("moment");
const debug = createDebug('chevre-backend:controllers');
const DEFAULT_OFFERS_VALID_AFTER_START_IN_MINUTES = -20;
var SaleStartDateType;
(function (SaleStartDateType) {
    SaleStartDateType["Default"] = "default";
    SaleStartDateType["Absolute"] = "absolute";
    SaleStartDateType["Relative"] = "relative";
})(SaleStartDateType || (SaleStartDateType = {}));
var OnlineDisplayType;
(function (OnlineDisplayType) {
    OnlineDisplayType["Absolute"] = "absolute";
    OnlineDisplayType["Relative"] = "relative";
})(OnlineDisplayType || (OnlineDisplayType = {}));
function index(req, res, next) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const offerService = new chevre.service.Offer({
                endpoint: process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            const placeService = new chevre.service.Place({
                endpoint: process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            const searchMovieTheatersResult = yield placeService.searchMovieTheaters({
                project: { ids: [req.project.id] }
            });
            if (searchMovieTheatersResult.data.length === 0) {
                throw new Error('劇場が見つかりません');
            }
            const searchTicketTypeGroupsResult = yield offerService.searchTicketTypeGroups({
                project: { id: { $eq: req.project.id } },
                itemOffered: { typeOf: { $eq: 'EventService' } }
            });
            res.render('events/screeningEvent/index', {
                movieTheaters: searchMovieTheatersResult.data,
                moment: moment,
                ticketGroups: searchTicketTypeGroupsResult.data
            });
        }
        catch (err) {
            next(err);
        }
    });
}
exports.index = index;
// tslint:disable-next-line:max-func-body-length
function search(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const offerService = new chevre.service.Offer({
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
        try {
            debug('searching...query:', req.query);
            const date = req.query.date;
            const days = req.query.days;
            const screen = req.query.screen;
            const movieTheater = yield placeService.findMovieTheaterById({ id: req.query.theater });
            const limit = 100;
            const searchResult = yield eventService.search({
                limit: limit,
                project: { ids: [req.project.id] },
                typeOf: chevre.factory.eventType.ScreeningEvent,
                eventStatuses: [chevre.factory.eventStatusType.EventScheduled],
                inSessionFrom: moment(`${date}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                    .toDate(),
                inSessionThrough: moment(`${date}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                    .add(days, 'day')
                    .toDate(),
                superEvent: {
                    locationBranchCodes: [movieTheater.branchCode]
                },
                offers: {
                    itemOffered: {
                        serviceOutput: {
                            reservedTicket: {
                                ticketedSeat: {
                                    // 座席指定有のみの検索の場合
                                    typeOfs: req.query.onlyReservedSeatsAvailable === '1'
                                        ? [chevre.factory.placeType.Seat]
                                        : undefined
                                }
                            }
                        }
                    }
                }
            });
            let data;
            let screens;
            if (screen !== undefined) {
                data = searchResult.data.filter((event) => event.location.branchCode === screen);
                if (searchResult.data.length >= limit) {
                    let dataPage2;
                    const searchResultPage2 = yield eventService.search({
                        project: { ids: [req.project.id] },
                        typeOf: chevre.factory.eventType.ScreeningEvent,
                        eventStatuses: [chevre.factory.eventStatusType.EventScheduled],
                        inSessionFrom: moment(`${date}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                            .toDate(),
                        inSessionThrough: moment(`${date}T00:00:00+09:00`, 'YYYYMMDDTHH:mm:ssZ')
                            .add(days, 'day')
                            .toDate(),
                        superEvent: {
                            locationBranchCodes: [movieTheater.branchCode]
                        },
                        page: 2
                    });
                    dataPage2 = searchResultPage2.data.filter((event) => event.location.branchCode === screen);
                    for (const dataP2 of dataPage2) {
                        data.push(dataP2);
                    }
                }
                screens = movieTheater.containsPlace.filter((place) => place.branchCode === screen);
            }
            else {
                data = searchResult.data;
                screens = movieTheater.containsPlace;
            }
            const searchTicketTypeGroupsResult = yield offerService.searchTicketTypeGroups({
                project: { id: { $eq: req.project.id } },
                itemOffered: { typeOf: { $eq: 'EventService' } }
            });
            res.json({
                error: undefined,
                performances: data,
                screens,
                ticketGroups: searchTicketTypeGroupsResult.data
            });
        }
        catch (err) {
            debug('search error', err);
            res.json({
                error: err.message
            });
        }
    });
}
exports.search = search;
/**
 * 作品検索
 */
function searchScreeningEventSeries(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        const eventService = new chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        try {
            const searchResult = yield eventService.search({
                project: { ids: [req.project.id] },
                typeOf: chevre.factory.eventType.ScreeningEventSeries,
                location: {
                    branchCodes: [req.query.movieTheaterBranchCode]
                },
                workPerformed: {
                    identifiers: [req.query.identifier]
                }
            });
            res.json({
                error: undefined,
                screeningEventSeries: searchResult.data
            });
        }
        catch (err) {
            debug('searchScreeningEvent error', err);
            res.json({
                error: err.message
            });
        }
    });
}
exports.searchScreeningEventSeries = searchScreeningEventSeries;
/**
 * 新規登録
 */
function regist(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const eventService = new chevre.service.Event({
                endpoint: process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            addValidation(req);
            const validatorResult = yield req.getValidationResult();
            // const validations = req.validationErrors(true);
            if (!validatorResult.isEmpty()) {
                throw new Error('Invalid');
            }
            debug('saving screening event...', req.body);
            const attributes = yield createMultipleEventFromBody(req, req.user);
            const events = yield eventService.create(attributes);
            debug(events.length, 'events created', events.map((e) => e.id));
            res.json({
                error: undefined
            });
        }
        catch (err) {
            debug('regist error', err);
            const obj = {
                error: err.message
            };
            if (err.code === http_status_1.BAD_REQUEST) {
                res.status(err.code)
                    .json(obj);
            }
            else {
                res.json(obj);
            }
        }
    });
}
exports.regist = regist;
/**
 * 更新
 */
function update(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const eventService = new chevre.service.Event({
                endpoint: process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            updateValidation(req);
            const validatorResult = yield req.getValidationResult();
            // const validations = req.validationErrors(true);
            if (!validatorResult.isEmpty()) {
                throw new Error('Invalid');
            }
            debug('saving screening event...', req.body);
            const attributes = yield createEventFromBody(req);
            yield eventService.update({
                id: req.params.eventId,
                attributes: attributes
            });
            res.json({
                error: undefined
            });
        }
        catch (err) {
            debug('update error', err);
            res.json({
                error: err.message
            });
        }
    });
}
exports.update = update;
/**
 * 物理削除ではなくイベントキャンセル
 */
function cancelPerformance(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const eventService = new chevre.service.Event({
                endpoint: process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            const event = yield eventService.findById({ id: req.params.eventId });
            if (moment(event.startDate)
                .tz('Asia/Tokyo')
                .isSameOrAfter(moment()
                .tz('Asia/Tokyo'), 'day')) {
                event.eventStatus = chevre.factory.eventStatusType.EventCancelled;
                yield eventService.update({ id: event.id, attributes: event });
                res.json({
                    error: undefined
                });
            }
            else {
                res.json({
                    error: '開始日時'
                });
            }
        }
        catch (err) {
            debug('delete error', err);
            res.status(http_status_1.NO_CONTENT)
                .json({
                error: err.message
            });
        }
    });
}
exports.cancelPerformance = cancelPerformance;
/**
 * リクエストボディからイベントオブジェクトを作成する
 */
// tslint:disable-next-line:max-func-body-length
function createEventFromBody(req) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const body = req.body;
        const user = req.user;
        const eventService = new chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const placeService = new chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const offerService = new chevre.service.Offer({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const categoryCodeService = new chevre.service.CategoryCode({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const screeningEventSeries = yield eventService.findById({
            id: body.screeningEventId
        });
        const movieTheater = yield placeService.findMovieTheaterById({ id: body.theater });
        const screeningRoom = movieTheater.containsPlace.find((p) => p.branchCode === body.screen);
        if (screeningRoom === undefined) {
            throw new Error('上映スクリーンが見つかりません');
        }
        if (screeningRoom.name === undefined) {
            throw new Error('上映スクリーン名が見つかりません');
        }
        const ticketTypeGroup = yield offerService.findTicketTypeGroupById({ id: body.ticketTypeGroup });
        if (typeof ticketTypeGroup.id !== 'string') {
            throw new Error('Offer Catalog ID undefined');
        }
        let serviceType;
        const offerCatagoryServiceTypeCode = (_a = ticketTypeGroup.itemOffered.serviceType) === null || _a === void 0 ? void 0 : _a.codeValue;
        if (typeof offerCatagoryServiceTypeCode === 'string') {
            const searchServiceTypesResult = yield categoryCodeService.search({
                limit: 1,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.ServiceType } },
                codeValue: { $eq: offerCatagoryServiceTypeCode }
            });
            serviceType = searchServiceTypesResult.data.shift();
            if (serviceType === undefined) {
                throw new Error('興行区分が見つかりません');
            }
        }
        let offersValidAfterStart;
        if (body.endSaleTimeAfterScreening !== undefined && body.endSaleTimeAfterScreening !== '') {
            offersValidAfterStart = Number(body.endSaleTimeAfterScreening);
        }
        else if (movieTheater.offers !== undefined
            && movieTheater.offers.availabilityEndsGraceTime !== undefined
            && movieTheater.offers.availabilityEndsGraceTime.value !== undefined) {
            // tslint:disable-next-line:no-magic-numbers
            offersValidAfterStart = Math.floor(movieTheater.offers.availabilityEndsGraceTime.value / 60);
        }
        else {
            offersValidAfterStart = DEFAULT_OFFERS_VALID_AFTER_START_IN_MINUTES;
        }
        const doorTime = moment(`${body.day}T${body.doorTime}+09:00`, 'YYYYMMDDTHHmmZ')
            .toDate();
        const startDate = moment(`${body.day}T${body.startTime}+09:00`, 'YYYYMMDDTHHmmZ')
            .toDate();
        const endDate = moment(`${body.endDay}T${body.endTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
            .toDate();
        const salesStartDate = moment(`${body.saleStartDate}T${body.saleStartTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
            .toDate();
        const salesEndDate = moment(startDate)
            .add(offersValidAfterStart, 'minutes')
            .toDate();
        // オンライン表示開始日時は、絶対指定or相対指定
        const onlineDisplayStartDate = (String(body.onlineDisplayType) === OnlineDisplayType.Relative)
            ? moment(`${moment(startDate)
                .tz('Asia/Tokyo')
                .format('YYYY-MM-DD')}T00:00:00+09:00`)
                .add(Number(body.onlineDisplayStartDate) * -1, 'days')
                .toDate()
            : moment(`${String(body.onlineDisplayStartDate)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                .toDate();
        let acceptedPaymentMethod;
        // ムビチケ除外の場合は対応決済方法を追加
        if (body.mvtkExcludeFlg === '1') {
            Object.keys(chevre.factory.paymentMethodType)
                .forEach((key) => {
                if (acceptedPaymentMethod === undefined) {
                    acceptedPaymentMethod = [];
                }
                const paymentMethodType = chevre.factory.paymentMethodType[key];
                if (paymentMethodType !== chevre.factory.paymentMethodType.MovieTicket) {
                    acceptedPaymentMethod.push(paymentMethodType);
                }
            });
        }
        const serviceOutput = (body.reservedSeatsAvailable === '1')
            ? {
                typeOf: chevre.factory.reservationType.EventReservation,
                reservedTicket: {
                    typeOf: 'Ticket',
                    ticketedSeat: {
                        typeOf: chevre.factory.placeType.Seat
                    }
                }
            }
            : {
                typeOf: chevre.factory.reservationType.EventReservation,
                reservedTicket: {
                    typeOf: 'Ticket'
                }
            };
        const offers = {
            project: { typeOf: req.project.typeOf, id: req.project.id },
            id: ticketTypeGroup.id,
            name: ticketTypeGroup.name,
            typeOf: chevre.factory.offerType.Offer,
            priceCurrency: chevre.factory.priceCurrency.JPY,
            availabilityEnds: salesEndDate,
            availabilityStarts: onlineDisplayStartDate,
            eligibleQuantity: {
                typeOf: 'QuantitativeValue',
                unitCode: chevre.factory.unitCode.C62,
                maxValue: Number(body.maxSeatNumber),
                value: 1
            },
            itemOffered: {
                serviceType: serviceType,
                serviceOutput: serviceOutput
            },
            validFrom: salesStartDate,
            validThrough: salesEndDate,
            acceptedPaymentMethod: acceptedPaymentMethod
        };
        return {
            project: req.project,
            typeOf: chevre.factory.eventType.ScreeningEvent,
            doorTime: doorTime,
            startDate: startDate,
            endDate: endDate,
            workPerformed: screeningEventSeries.workPerformed,
            location: {
                project: req.project,
                typeOf: screeningRoom.typeOf,
                branchCode: screeningRoom.branchCode,
                name: screeningRoom.name,
                alternateName: screeningRoom.alternateName,
                address: screeningRoom.address
            },
            superEvent: screeningEventSeries,
            name: screeningEventSeries.name,
            eventStatus: chevre.factory.eventStatusType.EventScheduled,
            offers: offers,
            checkInCount: undefined,
            attendeeCount: undefined,
            additionalProperty: (Array.isArray(body.additionalProperty))
                ? body.additionalProperty.filter((p) => typeof p.name === 'string' && p.name !== '')
                    .map((p) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
                : []
        };
    });
}
/**
 * リクエストボディからイベントオブジェクトを作成する
 */
// tslint:disable-next-line:max-func-body-length
function createMultipleEventFromBody(req, user) {
    return __awaiter(this, void 0, void 0, function* () {
        const body = req.body;
        debug('body:', body);
        const eventService = new chevre.service.Event({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const placeService = new chevre.service.Place({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const offerService = new chevre.service.Offer({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const categoryCodeService = new chevre.service.CategoryCode({
            endpoint: process.env.API_ENDPOINT,
            auth: user.authClient
        });
        const screeningEventSeries = yield eventService.findById({
            id: body.screeningEventId
        });
        const movieTheater = yield placeService.findMovieTheaterById({ id: body.theater });
        const screeningRoom = movieTheater.containsPlace.find((p) => p.branchCode === body.screen);
        if (screeningRoom === undefined) {
            throw new Error('上映スクリーンが見つかりません');
        }
        if (screeningRoom.name === undefined) {
            throw new Error('上映スクリーン名が見つかりません');
        }
        const startDate = moment(`${body.startDate}T00:00:00+09:00`, 'YYYYMMDDTHHmmZ')
            .tz('Asia/Tokyo');
        const toDate = moment(`${body.toDate}T00:00:00+09:00`, 'YYYYMMDDTHHmmZ')
            .tz('Asia/Tokyo');
        const weekDays = body.weekDayData;
        const ticketTypeIds = body.ticketData;
        const mvtkExcludeFlgs = body.mvtkExcludeFlgData;
        const timeData = body.timeData;
        const searchTicketTypeGroupsResult = yield offerService.searchTicketTypeGroups({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            itemOffered: { typeOf: { $eq: 'EventService' } }
        });
        const ticketTypeGroups = searchTicketTypeGroupsResult.data;
        const searchServiceTypesResult = yield categoryCodeService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.ServiceType } }
        });
        const serviceTypes = searchServiceTypesResult.data;
        const attributes = [];
        for (let date = startDate; date <= toDate; date = date.add(1, 'day')) {
            const formattedDate = date.format('YYYY/MM/DD');
            const day = date.get('day')
                .toString();
            if (weekDays.indexOf(day) >= 0) {
                // tslint:disable-next-line:max-func-body-length
                timeData.forEach((data, i) => {
                    var _a;
                    const offersValidAfterStart = (body.endSaleTimeAfterScreening !== undefined && body.endSaleTimeAfterScreening !== '')
                        ? Number(body.endSaleTimeAfterScreening)
                        : DEFAULT_OFFERS_VALID_AFTER_START_IN_MINUTES;
                    const eventStartDate = moment(`${formattedDate}T${data.startTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
                        .toDate();
                    const salesEndDate = moment(eventStartDate)
                        .add(offersValidAfterStart, 'minutes')
                        .toDate();
                    const endDayRelative = Number(data.endDayRelative);
                    // tslint:disable-next-line:no-magic-numbers
                    if (endDayRelative < 0 || endDayRelative > 3) {
                        throw new Error('終了日の相対設定が不適切です');
                    }
                    const formattedEndDate = moment(date)
                        .add(endDayRelative, 'days')
                        .format('YYYY/MM/DD');
                    // 販売開始日時は、劇場設定 or 絶対指定 or 相対指定
                    let salesStartDate;
                    switch (String(body.saleStartDateType)) {
                        case SaleStartDateType.Absolute:
                            salesStartDate = moment(`${String(body.saleStartDate)}T${body.saleStartTime}:00+09:00`, 'YYYY/MM/DDTHHmm:ssZ')
                                .toDate();
                            break;
                        case SaleStartDateType.Relative:
                            salesStartDate = moment(`${moment(eventStartDate)
                                .tz('Asia/Tokyo')
                                .format('YYYY-MM-DD')}T00:00:00+09:00`)
                                .add(Number(body.saleStartDate) * -1, 'days')
                                .toDate();
                            break;
                        default:
                            salesStartDate = moment(`${formattedDate}T0000+09:00`, 'YYYY/MM/DDTHHmmZ')
                                .add(parseInt(body.saleStartDays, 10) * -1, 'day')
                                .toDate();
                    }
                    // オンライン表示開始日時は、絶対指定or相対指定
                    const onlineDisplayStartDate = (String(body.onlineDisplayType) === OnlineDisplayType.Relative)
                        ? moment(`${moment(eventStartDate)
                            .tz('Asia/Tokyo')
                            .format('YYYY-MM-DD')}T00:00:00+09:00`)
                            .add(Number(body.onlineDisplayStartDate) * -1, 'days')
                            .toDate()
                        : moment(`${String(body.onlineDisplayStartDate)}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
                            .toDate();
                    let acceptedPaymentMethod;
                    // ムビチケ除外の場合は対応決済方法を追加
                    if (mvtkExcludeFlgs[i] === '1') {
                        Object.keys(chevre.factory.paymentMethodType)
                            .forEach((key) => {
                            if (acceptedPaymentMethod === undefined) {
                                acceptedPaymentMethod = [];
                            }
                            const paymentMethodType = chevre.factory.paymentMethodType[key];
                            if (paymentMethodType !== chevre.factory.paymentMethodType.MovieTicket) {
                                acceptedPaymentMethod.push(paymentMethodType);
                            }
                        });
                    }
                    const ticketTypeGroup = ticketTypeGroups.find((t) => t.id === ticketTypeIds[i]);
                    if (ticketTypeGroup === undefined) {
                        throw new Error('Ticket Type Group');
                    }
                    if (typeof ticketTypeGroup.id !== 'string') {
                        throw new Error('Offer Catalog ID undefined');
                    }
                    let serviceType;
                    const offerCatagoryServiceTypeCode = (_a = ticketTypeGroup.itemOffered.serviceType) === null || _a === void 0 ? void 0 : _a.codeValue;
                    if (typeof offerCatagoryServiceTypeCode === 'string') {
                        serviceType = serviceTypes.find((t) => t.codeValue === offerCatagoryServiceTypeCode);
                        if (serviceType === undefined) {
                            throw new chevre.factory.errors.NotFound('サービス区分');
                        }
                    }
                    const serviceOutput = (body.reservedSeatsAvailable === '1')
                        ? {
                            typeOf: chevre.factory.reservationType.EventReservation,
                            reservedTicket: {
                                typeOf: 'Ticket',
                                ticketedSeat: { typeOf: chevre.factory.placeType.Seat }
                            }
                        } : {
                        typeOf: chevre.factory.reservationType.EventReservation,
                        reservedTicket: {
                            typeOf: 'Ticket'
                        }
                    };
                    const offers = {
                        project: { typeOf: req.project.typeOf, id: req.project.id },
                        id: ticketTypeGroup.id,
                        name: ticketTypeGroup.name,
                        typeOf: chevre.factory.offerType.Offer,
                        priceCurrency: chevre.factory.priceCurrency.JPY,
                        availabilityEnds: salesEndDate,
                        availabilityStarts: onlineDisplayStartDate,
                        eligibleQuantity: {
                            typeOf: 'QuantitativeValue',
                            unitCode: chevre.factory.unitCode.C62,
                            maxValue: Number(body.maxSeatNumber),
                            value: 1
                        },
                        itemOffered: {
                            serviceType: serviceType,
                            serviceOutput: serviceOutput
                        },
                        validFrom: salesStartDate,
                        validThrough: salesEndDate,
                        acceptedPaymentMethod: acceptedPaymentMethod
                    };
                    attributes.push({
                        project: req.project,
                        typeOf: chevre.factory.eventType.ScreeningEvent,
                        doorTime: moment(`${formattedDate}T${data.doorTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
                            .toDate(),
                        startDate: eventStartDate,
                        endDate: moment(`${formattedEndDate}T${data.endTime}+09:00`, 'YYYY/MM/DDTHHmmZ')
                            .toDate(),
                        workPerformed: screeningEventSeries.workPerformed,
                        location: {
                            project: req.project,
                            typeOf: screeningRoom.typeOf,
                            branchCode: screeningRoom.branchCode,
                            name: screeningRoom.name === undefined
                                ? { en: '', ja: '', kr: '' }
                                : screeningRoom.name,
                            alternateName: screeningRoom.alternateName,
                            address: screeningRoom.address
                        },
                        superEvent: screeningEventSeries,
                        name: screeningEventSeries.name,
                        eventStatus: chevre.factory.eventStatusType.EventScheduled,
                        offers: offers,
                        checkInCount: undefined,
                        attendeeCount: undefined
                    });
                });
            }
        }
        return attributes;
    });
}
/**
 * 新規登録バリデーション
 */
function addValidation(req) {
    req.checkBody('screeningEventId', '上映イベントシリーズが未選択です')
        .notEmpty();
    req.checkBody('startDate', '上映日が未選択です')
        .notEmpty();
    req.checkBody('toDate', '上映日が未選択です')
        .notEmpty();
    req.checkBody('weekDayData', '曜日が未選択です')
        .notEmpty();
    req.checkBody('screen', 'スクリーンが未選択です')
        .notEmpty();
    req.checkBody('theater', '劇場が未選択です')
        .notEmpty();
    req.checkBody('timeData', '時間情報が未選択です')
        .notEmpty();
    req.checkBody('ticketData', '券種グループが未選択です')
        .notEmpty();
}
/**
 * 編集バリデーション
 */
function updateValidation(req) {
    req.checkBody('screeningEventId', '上映イベントシリーズが未選択です')
        .notEmpty();
    req.checkBody('day', '上映日が未選択です')
        .notEmpty();
    req.checkBody('doorTime', '開場時刻が未選択です')
        .notEmpty();
    req.checkBody('startTime', '開始時刻が未選択です')
        .notEmpty();
    req.checkBody('endTime', '終了時刻が未選択です')
        .notEmpty();
    req.checkBody('screen', 'スクリーンが未選択です')
        .notEmpty();
    req.checkBody('ticketTypeGroup', '券種グループが未選択です')
        .notEmpty();
}
