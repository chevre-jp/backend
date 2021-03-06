/**
 * オファー管理ルーター
 */
import * as chevre from '@chevre/api-nodejs-client';
import * as cinerino from '@cinerino/sdk';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import * as moment from 'moment-timezone';
import * as _ from 'underscore';

import * as Message from '../message';

import { itemAvailabilities } from '../factory/itemAvailability';
import { ProductType, productTypes } from '../factory/productType';

const NUM_ADDITIONAL_PROPERTY = 10;

// コード 半角64
const NAME_MAX_LENGTH_CODE = 30;
// 名称・日本語 全角64
const NAME_MAX_LENGTH_NAME_JA = 64;
// 金額
const CHAGE_MAX_LENGTH = 10;

const offersRouter = Router();

offersRouter.all<any>(
    '/add',
    ...validate(),
    // tslint:disable-next-line:max-func-body-length
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const itemOfferedTypeOf = req.query.itemOffered?.typeOf;
        if (itemOfferedTypeOf === ProductType.EventService) {
            res.redirect(`/ticketTypes/add`);

            return;
        }

        const offerService = new chevre.service.Offer({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const accountTitleService = new chevre.service.AccountTitle({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const categoryCodeService = new chevre.service.CategoryCode({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const iamService = new cinerino.service.IAM({
            endpoint: <string>process.env.CINERINO_API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        if (req.method === 'POST') {
            // 検証
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            // 検証
            if (validatorResult.isEmpty()) {
                // 登録プロセス
                try {
                    req.body.id = '';
                    let offer = await createFromBody(req, true);

                    // コード重複確認
                    const searchOffersResult = await offerService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        identifier: { $eq: offer.identifier }
                    });
                    if (searchOffersResult.data.length > 0) {
                        throw new Error('既に存在するコードです');
                    }

                    offer = await offerService.create(offer);
                    req.flash('message', '登録しました');
                    res.redirect(`/offers/${offer.id}/update`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }
        }

        const forms = {
            additionalProperty: [],
            name: {},
            alternateName: {},
            description: {},
            priceSpecification: {
                referenceQuantity: {
                    value: 1
                },
                accounting: {}
            },
            isBoxTicket: (_.isEmpty(req.body.isBoxTicket)) ? '' : req.body.isBoxTicket,
            isOnlineTicket: (_.isEmpty(req.body.isOnlineTicket)) ? '' : req.body.isOnlineTicket,
            seatReservationUnit: (_.isEmpty(req.body.seatReservationUnit)) ? 1 : req.body.seatReservationUnit,
            ...req.body
        };
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }

        const searchOfferCategoryTypesResult = await categoryCodeService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } }
        });

        const searchAccountTitlesResult = await accountTitleService.search({
            project: { ids: [req.project.id] }
        });

        const searchApplicationsResult = await iamService.searchMembers({
            member: { typeOf: { $eq: chevre.factory.creativeWorkType.WebApplication } }
        });

        res.render('offers/add', {
            message: message,
            errors: errors,
            forms: forms,
            ticketTypeCategories: searchOfferCategoryTypesResult.data,
            accountTitles: searchAccountTitlesResult.data,
            productTypes: productTypes,
            applications: searchApplicationsResult.data.map((d) => d.member)
                .sort((a, b) => {
                    if (String(a.name) < String(b.name)) {
                        return -1;
                    }
                    if (String(a.name) > String(b.name)) {
                        return 1;
                    }

                    return 0;
                })
        });
    }
);

// tslint:disable-next-line:use-default-type-parameter
offersRouter.all<ParamsDictionary>(
    '/:id/update',
    ...validate(),
    // tslint:disable-next-line:max-func-body-length
    async (req, res, next) => {
        let message = '';
        let errors: any = {};

        const itemOfferedTypeOf = req.query.itemOffered?.typeOf;
        if (itemOfferedTypeOf === ProductType.EventService) {
            res.redirect(`/ticketTypes/${req.params.id}/update`);

            return;
        }

        const offerService = new chevre.service.Offer({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const accountTitleService = new chevre.service.AccountTitle({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const searchAccountTitlesResult = await accountTitleService.search({
            project: { ids: [req.project.id] }
        });
        const categoryCodeService = new chevre.service.CategoryCode({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        const iamService = new cinerino.service.IAM({
            endpoint: <string>process.env.CINERINO_API_ENDPOINT,
            auth: req.user.authClient,
            project: { id: req.project.id }
        });

        try {
            let offer = await offerService.findById({ id: req.params.id });

            if (offer.itemOffered?.typeOf === ProductType.EventService) {
                res.redirect(`/ticketTypes/${req.params.id}/update`);

                return;
            }

            if (req.method === 'POST') {
                // 検証
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();

                // 検証
                if (validatorResult.isEmpty()) {
                    try {
                        req.body.id = req.params.id;
                        offer = await createFromBody(req, false);
                        await offerService.update(offer);
                        req.flash('message', '更新しました');
                        res.redirect(req.originalUrl);

                        return;
                    } catch (error) {
                        message = error.message;
                    }
                }
            }

            const forms = {
                ...offer,
                ...req.body
            };
            if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
                // tslint:disable-next-line:prefer-array-literal
                forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                    return {};
                }));
            }

            const searchOfferCategoryTypesResult = await categoryCodeService.search({
                limit: 100,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } }
            });

            const searchApplicationsResult = await iamService.searchMembers({
                member: { typeOf: { $eq: chevre.factory.creativeWorkType.WebApplication } }
            });

            res.render('offers/update', {
                message: message,
                errors: errors,
                forms: forms,
                ticketTypeCategories: searchOfferCategoryTypesResult.data,
                accountTitles: searchAccountTitlesResult.data,
                productTypes: productTypes,
                applications: searchApplicationsResult.data.map((d) => d.member)
                    .sort((a, b) => {
                        if (String(a.name) < String(b.name)) {
                            return -1;
                        }
                        if (String(a.name) > String(b.name)) {
                            return 1;
                        }

                        return 0;
                    })
            });
        } catch (error) {
            next(error);
        }
    }
);

offersRouter.get(
    '/:id/catalogs',
    async (req, res) => {
        try {
            const offerCatalogService = new chevre.service.OfferCatalog({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });

            const limit = 100;
            const page = 1;
            const { data } = await offerCatalogService.search({
                limit: limit,
                page: page,
                project: { id: { $eq: req.project.id } },
                itemListElement: {
                    id: { $in: [req.params.id] }
                }
            });

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: data
            });
        } catch (err) {
            res.json({
                success: false,
                message: err.message,
                count: 0,
                results: []
            });
        }
    }
);

offersRouter.get(
    '/:id/availableApplications',
    async (req, res) => {
        try {
            const offerService = new chevre.service.Offer({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            const iamService = new cinerino.service.IAM({
                endpoint: <string>process.env.CINERINO_API_ENDPOINT,
                auth: req.user.authClient,
                project: { id: req.project.id }
            });

            let data: any[] = [];
            const offer = await offerService.findById({ id: req.params.id });
            if (Array.isArray(offer.availableAtOrFrom) && offer.availableAtOrFrom.length > 0) {
                const searchApplicationsResult = await iamService.searchMembers({
                    member: {
                        typeOf: { $eq: chevre.factory.creativeWorkType.WebApplication },
                        id: { $in: offer.availableAtOrFrom.map((a: any) => a.id) }
                    }
                });

                data = searchApplicationsResult.data.map((m) => m.member);
            }

            res.json({
                success: true,
                count: data.length,
                results: data
            });
        } catch (err) {
            res.json({
                success: false,
                message: err.message,
                count: 0,
                results: []
            });
        }
    }
);

offersRouter.get(
    '',
    async (req, res) => {
        const categoryCodeService = new chevre.service.CategoryCode({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });

        const searchOfferCategoryTypesResult = await categoryCodeService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } }
        });

        // 券種マスタ画面遷移
        res.render('offers/index', {
            message: '',
            ticketTypeCategories: searchOfferCategoryTypesResult.data,
            productTypes: productTypes
        });
    }
);

offersRouter.get(
    '/getlist',
    // tslint:disable-next-line:max-func-body-length
    async (req, res) => {
        try {
            const offerService = new chevre.service.Offer({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            const categoryCodeService = new chevre.service.CategoryCode({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });

            const searchOfferCategoryTypesResult = await categoryCodeService.search({
                limit: 100,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } }
            });
            const offerCategoryTypes = searchOfferCategoryTypesResult.data;

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const identifierRegex = req.query.identifier;

            const searchConditions: chevre.factory.offer.ISearchConditions = {
                limit: limit,
                page: page,
                sort: { 'priceSpecification.price': chevre.factory.sortType.Ascending },
                availableAtOrFrom: {
                    id: {
                        $eq: (typeof req.query.application === 'string' && req.query.application.length > 0)
                            ? req.query.application
                            : undefined
                    }
                },
                project: { id: { $eq: req.project.id } },
                itemOffered: {
                    typeOf: {
                        $eq: (typeof req.query.itemOffered?.typeOf === 'string' && req.query.itemOffered?.typeOf.length > 0)
                            ? req.query.itemOffered?.typeOf
                            : undefined
                    }
                },
                identifier: {
                    $regex: (typeof identifierRegex === 'string' && identifierRegex.length > 0) ? identifierRegex : undefined
                },
                id: (typeof req.query.id === 'string' && req.query.id.length > 0) ? { $eq: req.query.id } : undefined,
                name: (req.query.name !== undefined
                    && req.query.name !== '')
                    ? { $regex: req.query.name }
                    : undefined,
                priceSpecification: {
                    price: {
                        $gte: (req.query.priceSpecification !== undefined
                            && req.query.priceSpecification.minPrice !== undefined
                            && req.query.priceSpecification.minPrice !== '')
                            ? Number(req.query.priceSpecification.minPrice)
                            : undefined,
                        $lte: (req.query.priceSpecification !== undefined
                            && req.query.priceSpecification.maxPrice !== undefined
                            && req.query.priceSpecification.maxPrice !== '')
                            ? Number(req.query.priceSpecification.maxPrice)
                            : undefined
                    },
                    referenceQuantity: {
                        value: {
                            $eq: (req.query.priceSpecification !== undefined
                                && req.query.priceSpecification.referenceQuantity !== undefined
                                && req.query.priceSpecification.referenceQuantity.value !== undefined
                                && req.query.priceSpecification.referenceQuantity.value !== '')
                                ? Number(req.query.priceSpecification.referenceQuantity.value)
                                : undefined
                        }
                    }
                },
                category: {
                    codeValue: (req.query.category !== undefined
                        && typeof req.query.category.codeValue === 'string'
                        && req.query.category.codeValue !== '')
                        ? { $in: [req.query.category.codeValue] }
                        : undefined
                }
            };

            let data: chevre.factory.offer.IUnitPriceOffer[];
            const searchResult = await offerService.search(searchConditions);
            data = searchResult.data;

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                // tslint:disable-next-line:cyclomatic-complexity
                results: data.map((t) => {
                    const categoryCode = t.category?.codeValue;

                    const productType = productTypes.find((p) => p.codeValue === t.itemOffered.typeOf);
                    const itemAvailability = itemAvailabilities.find((i) => i.codeValue === t.availability);

                    return {
                        ...t,
                        itemOfferedName: productType?.name,
                        availabilityName: itemAvailability?.name,
                        availableAtOrFromCount: (Array.isArray(t.availableAtOrFrom))
                            ? t.availableAtOrFrom.length
                            : 0,
                        categoryName: (typeof categoryCode === 'string')
                            ? (<chevre.factory.multilingualString>offerCategoryTypes.find((c) => c.codeValue === categoryCode)?.name)?.ja
                            : '',
                        validRateLimitStr: ((<any>t).validRateLimit !== undefined && (<any>t).validRateLimit !== null)
                            ? `1 ${(<any>t).validRateLimit.scope} / ${(<any>t).validRateLimit.unitInSeconds} s`
                            : '',
                        addOnCount: (Array.isArray(t.addOn))
                            ? t.addOn.length
                            : 0
                    };
                })
            });
        } catch (err) {
            res.json({
                success: false,
                message: err.message,
                count: 0,
                results: []
            });
        }
    }
);

// tslint:disable-next-line:cyclomatic-complexity max-func-body-length
async function createFromBody(req: Request, isNew: boolean): Promise<chevre.factory.offer.IUnitPriceOffer> {
    const categoryCodeService = new chevre.service.CategoryCode({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient
    });

    let offerCategory: chevre.factory.categoryCode.ICategoryCode | undefined;

    if (typeof req.body.category?.codeValue === 'string' && req.body.category?.codeValue.length > 0) {
        const searchOfferCategoryTypesResult = await categoryCodeService.search({
            limit: 1,
            project: { id: { $eq: req.project.id } },
            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.OfferCategoryType } },
            codeValue: { $eq: req.body.category?.codeValue }
        });
        if (searchOfferCategoryTypesResult.data.length === 0) {
            throw new Error('オファーカテゴリーが見つかりません');
        }
        offerCategory = searchOfferCategoryTypesResult.data[0];
    }

    const availability: chevre.factory.itemAvailability = chevre.factory.itemAvailability.InStock;

    const referenceQuantityValue: number = Number(req.body.priceSpecification.referenceQuantity.value);
    const referenceQuantity: chevre.factory.quantitativeValue.IQuantitativeValue<chevre.factory.unitCode.C62> = {
        typeOf: <'QuantitativeValue'>'QuantitativeValue',
        value: referenceQuantityValue,
        unitCode: req.body.priceSpecification.referenceQuantity.unitCode
    };

    const eligibleQuantityMinValue: number | undefined = (req.body.priceSpecification !== undefined
        && req.body.priceSpecification.eligibleQuantity !== undefined
        && req.body.priceSpecification.eligibleQuantity.minValue !== undefined
        && req.body.priceSpecification.eligibleQuantity.minValue !== '')
        ? Number(req.body.priceSpecification.eligibleQuantity.minValue)
        : undefined;
    const eligibleQuantityMaxValue: number | undefined = (req.body.priceSpecification !== undefined
        && req.body.priceSpecification.eligibleQuantity !== undefined
        && req.body.priceSpecification.eligibleQuantity.maxValue !== undefined
        && req.body.priceSpecification.eligibleQuantity.maxValue !== '')
        ? Number(req.body.priceSpecification.eligibleQuantity.maxValue)
        : undefined;
    const eligibleQuantity: chevre.factory.quantitativeValue.IQuantitativeValue<chevre.factory.unitCode.C62> | undefined =
        (eligibleQuantityMinValue !== undefined || eligibleQuantityMaxValue !== undefined)
            ? {
                typeOf: <'QuantitativeValue'>'QuantitativeValue',
                minValue: eligibleQuantityMinValue,
                maxValue: eligibleQuantityMaxValue,
                unitCode: chevre.factory.unitCode.C62
            }
            : undefined;

    const eligibleTransactionVolumePrice: number | undefined = (req.body.priceSpecification !== undefined
        && req.body.priceSpecification.eligibleTransactionVolume !== undefined
        && req.body.priceSpecification.eligibleTransactionVolume.price !== undefined
        && req.body.priceSpecification.eligibleTransactionVolume.price !== '')
        ? Number(req.body.priceSpecification.eligibleTransactionVolume.price)
        : undefined;
    // tslint:disable-next-line:max-line-length
    const eligibleTransactionVolume: chevre.factory.priceSpecification.IPriceSpecification<chevre.factory.priceSpecificationType> | undefined =
        (eligibleTransactionVolumePrice !== undefined)
            ? {
                project: { typeOf: req.project.typeOf, id: req.project.id },
                typeOf: chevre.factory.priceSpecificationType.PriceSpecification,
                price: eligibleTransactionVolumePrice,
                priceCurrency: chevre.factory.priceCurrency.JPY,
                valueAddedTaxIncluded: true
            }
            : undefined;

    const accounting = {
        typeOf: <'Accounting'>'Accounting',
        operatingRevenue: <any>undefined,
        accountsReceivable: Number(req.body.priceSpecification.price) // とりあえず発生金額に同じ
    };
    if (req.body.accountTitle !== undefined && req.body.accountTitle !== '') {
        accounting.operatingRevenue = {
            typeOf: 'AccountTitle',
            codeValue: req.body.accountTitle,
            identifier: req.body.accountTitle,
            name: ''
        };
    }

    let nameFromJson: any = {};
    if (typeof req.body.nameStr === 'string' && req.body.nameStr.length > 0) {
        try {
            nameFromJson = JSON.parse(req.body.nameStr);
        } catch (error) {
            throw new Error(`高度な名称の型が不適切です ${error.message}`);
        }
    }

    let validFrom: Date | undefined;
    if (typeof req.body.validFrom === 'string' && req.body.validFrom.length > 0) {
        validFrom = moment(`${req.body.validFrom}T00:00:00+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
            .toDate();
        // validFrom = moment(req.body.validFrom)
        //     .toDate();
    }

    let validThrough: Date | undefined;
    if (typeof req.body.validThrough === 'string' && req.body.validThrough.length > 0) {
        validThrough = moment(`${req.body.validThrough}T23:59:59+09:00`, 'YYYY/MM/DDTHH:mm:ssZ')
            .toDate();
        // validThrough = moment(req.body.validThrough)
        //     .toDate();
    }

    const priceSpec: chevre.factory.priceSpecification.IPriceSpecification<chevre.factory.priceSpecificationType.UnitPriceSpecification> = {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: chevre.factory.priceSpecificationType.UnitPriceSpecification,
        name: req.body.name,
        price: Number(req.body.priceSpecification.price),
        priceCurrency: chevre.factory.priceCurrency.JPY,
        valueAddedTaxIncluded: true,
        referenceQuantity: referenceQuantity,
        accounting: accounting,
        eligibleQuantity: eligibleQuantity,
        eligibleTransactionVolume: eligibleTransactionVolume
    };

    let itemOffered: chevre.factory.service.IService;
    const itemOfferedTypeOf = req.body.itemOffered?.typeOf;
    switch (itemOfferedTypeOf) {
        case ProductType.Account:
        case ProductType.Product:
            itemOffered = {
                project: { typeOf: req.project.typeOf, id: req.project.id },
                typeOf: itemOfferedTypeOf
            };
            break;

        case ProductType.MembershipService:
            itemOffered = {
                project: { typeOf: req.project.typeOf, id: req.project.id },
                typeOf: itemOfferedTypeOf,
                serviceOutput: {
                    project: { typeOf: req.project.typeOf, id: req.project.id },
                    typeOf: chevre.factory.programMembership.ProgramMembershipType.ProgramMembership
                }
            };
            break;

        default:
            throw new Error(`${req.body.itemOffered?.typeOf} not implemented`);
    }

    let pointAward: any;
    if (typeof req.body.pointAwardStr === 'string' && req.body.pointAwardStr.length > 0) {
        try {
            pointAward = JSON.parse(req.body.pointAwardStr);
        } catch (error) {
            throw new Error(`invalid pointAward ${error.message}`);
        }
    }
    if (pointAward !== undefined) {
        itemOffered.pointAward = pointAward;
    }

    // 利用可能なアプリケーション設定
    const availableAtOrFrom: { id: string }[] = [];
    const availableAtOrFromParams = req.body.availableAtOrFrom?.id;
    if (Array.isArray(availableAtOrFromParams)) {
        availableAtOrFromParams.forEach((applicationId) => {
            if (typeof applicationId === 'string' && applicationId.length > 0) {
                availableAtOrFrom.push({ id: applicationId });
            }
        });
    } else if (typeof availableAtOrFromParams === 'string' && availableAtOrFromParams.length > 0) {
        availableAtOrFrom.push({ id: availableAtOrFromParams });
    }

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: chevre.factory.offerType.Offer,
        priceCurrency: chevre.factory.priceCurrency.JPY,
        id: req.body.id,
        identifier: req.body.identifier,
        name: {
            ...nameFromJson,
            ja: req.body.name.ja,
            en: req.body.name.en
        },
        description: req.body.description,
        alternateName: { ja: <string>req.body.alternateName.ja, en: '' },
        availability: availability,
        availableAtOrFrom: availableAtOrFrom,
        itemOffered: itemOffered,
        // eligibleCustomerType: eligibleCustomerType,
        priceSpecification: priceSpec,
        additionalProperty: (Array.isArray(req.body.additionalProperty))
            ? req.body.additionalProperty.filter((p: any) => typeof p.name === 'string' && p.name !== '')
                .map((p: any) => {
                    return {
                        name: String(p.name),
                        value: String(p.value)
                    };
                })
            : undefined,
        ...(offerCategory !== undefined)
            ? {
                category: {
                    project: offerCategory.project,
                    id: offerCategory.id,
                    codeValue: offerCategory.codeValue
                }
            }
            : undefined,
        ...(validFrom instanceof Date)
            ? {
                validFrom: validFrom
            }
            : undefined,
        ...(validThrough instanceof Date)
            ? {
                validThrough: validThrough
            }
            : undefined,
        ...(!isNew)
            ? {
                $unset: {
                    ...(offerCategory === undefined) ? { category: 1 } : undefined,
                    ...(validFrom === undefined) ? { validFrom: 1 } : undefined,
                    ...(validThrough === undefined) ? { validThrough: 1 } : undefined
                }
            }
            : undefined
    };
}

function validate() {
    return [
        body('identifier', Message.Common.required.replace('$fieldName$', 'コード'))
            .notEmpty()
            .isLength({ max: NAME_MAX_LENGTH_CODE })
            .withMessage(Message.Common.getMaxLengthHalfByte('コード', NAME_MAX_LENGTH_CODE))
            .matches(/^[0-9a-zA-Z\-_]+$/)
            .withMessage(() => '英数字で入力してください'),

        body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
            .withMessage(Message.Common.getMaxLength('名称', NAME_MAX_LENGTH_CODE)),

        body('alternateName.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '代替名称'))
            .isLength({ max: NAME_MAX_LENGTH_NAME_JA })
            .withMessage(Message.Common.getMaxLength('代替名称', NAME_MAX_LENGTH_NAME_JA)),

        body('priceSpecification.referenceQuantity.value')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '適用数')),

        body('priceSpecification.referenceQuantity.unitCode')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '適用単位')),

        body('priceSpecification.price')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '発生金額'))
            .isNumeric()
            .isLength({ max: CHAGE_MAX_LENGTH })
            .withMessage(Message.Common.getMaxLengthHalfByte('発生金額', CHAGE_MAX_LENGTH))
            .custom((value) => Number(value) >= 0)
            .withMessage(() => '0もしくは正の値を入力してください')
    ];
}

export default offersRouter;
