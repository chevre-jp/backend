/**
 * 決済カードサービスルーター
 */
import * as chevre from '@chevre/api-nodejs-client';
import { Request, Router } from 'express';
// tslint:disable-next-line:no-implicit-dependencies
import { ParamsDictionary } from 'express-serve-static-core';
import { body, validationResult } from 'express-validator';
import { NO_CONTENT } from 'http-status';
import * as _ from 'underscore';

import * as Message from '../../message';

import { ProductType } from '../../factory/productType';

const NUM_ADDITIONAL_PROPERTY = 10;

const paymentCardRouter = Router();

paymentCardRouter.all<any>(
    '/new',
    ...validate(),
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const offerCatalogService = new chevre.service.OfferCatalog({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });

        const productService = new chevre.service.Product({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });

        const categoryCodeService = new chevre.service.CategoryCode({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });

        if (req.method === 'POST') {
            // 検証
            const validatorResult = validationResult(req);
            errors = validatorResult.mapped();
            // 検証
            if (validatorResult.isEmpty()) {
                try {
                    let product = createFromBody(req, true);
                    product = await productService.create(product);
                    req.flash('message', '登録しました');
                    res.redirect(`/services/paymentCard/${product.id}`);

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
            itemOffered: { name: {} },
            seatReservationUnit: (_.isEmpty(req.body.seatReservationUnit)) ? 1 : req.body.seatReservationUnit,
            ...req.body
        };
        if (forms.additionalProperty.length < NUM_ADDITIONAL_PROPERTY) {
            // tslint:disable-next-line:prefer-array-literal
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }

        // 口座タイプ検索
        const searchAccountTypesResult = await categoryCodeService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.AccountType } }
        });

        const searchOfferCatalogsResult = await offerCatalogService.search({
            limit: 100,
            project: { id: { $eq: req.project.id } },
            itemOffered: { typeOf: { $eq: ProductType.MembershipService } }
        });

        res.render('services/paymentCard/new', {
            message: message,
            errors: errors,
            forms: forms,
            accountTypes: searchAccountTypesResult.data,
            offerCatalogs: searchOfferCatalogsResult.data
        });
    }
);

paymentCardRouter.get(
    '/search',
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res) => {
        try {
            const productService = new chevre.service.Product({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const searchConditions = {
                limit: limit,
                page: page,
                project: { id: { $eq: req.project.id } },
                typeOf: { $eq: ProductType.PaymentCard }
            };
            const { data } = await productService.search(searchConditions);

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

// tslint:disable-next-line:use-default-type-parameter
paymentCardRouter.all<ParamsDictionary>(
    '/:id',
    ...validate(),
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res, next) => {
        try {
            let message = '';
            let errors: any = {};

            const offerCatalogService = new chevre.service.OfferCatalog({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });

            const productService = new chevre.service.Product({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });

            const categoryCodeService = new chevre.service.CategoryCode({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });

            let product = await productService.findById({ id: req.params.id });

            if (req.method === 'POST') {
                // 検証
                const validatorResult = validationResult(req);
                errors = validatorResult.mapped();
                if (validatorResult.isEmpty()) {
                    try {
                        product = createFromBody(req, false);
                        await productService.update(product);
                        req.flash('message', '更新しました');
                        res.redirect(req.originalUrl);

                        return;
                    } catch (error) {
                        message = error.message;
                    }
                }
            } else if (req.method === 'DELETE') {
                await productService.deleteById({ id: req.params.id });
                res.status(NO_CONTENT)
                    .end();

                return;
            }

            const forms = {
                ...product,
                ...req.body
            };

            // 口座タイプ検索
            const searchAccountTypesResult = await categoryCodeService.search({
                limit: 100,
                project: { id: { $eq: req.project.id } },
                inCodeSet: { identifier: { $eq: chevre.factory.categoryCode.CategorySetIdentifier.AccountType } }
            });

            const searchOfferCatalogsResult = await offerCatalogService.search({
                limit: 100,
                project: { id: { $eq: req.project.id } },
                itemOffered: { typeOf: { $eq: ProductType.MembershipService } }
            });

            res.render('services/paymentCard/update', {
                message: message,
                errors: errors,
                forms: forms,
                accountTypes: searchAccountTypesResult.data,
                offerCatalogs: searchOfferCatalogsResult.data
            });
        } catch (err) {
            next(err);
        }
    }
);

paymentCardRouter.get(
    '',
    async (__, res) => {
        res.render('services/paymentCard/index', {
            message: ''
        });
    }
);

function createFromBody(req: Request, isNew: boolean): any {
    let hasOfferCatalog: any;
    if (typeof req.body.hasOfferCatalog?.id === 'string' && req.body.hasOfferCatalog?.id.length > 0) {
        hasOfferCatalog = {
            typeOf: 'OfferCatalog',
            id: req.body.hasOfferCatalog?.id
        };
    }

    let serviceOutput: any[] = [];
    if (Array.isArray(req.body.serviceOutput)) {
        serviceOutput = req.body.serviceOutput.map((s: any) => {
            let membershipPointsEarned: any;
            if (typeof s.membershipPointsEarned?.name === 'string' && s.membershipPointsEarned?.name.length > 0
                && typeof s.membershipPointsEarned?.unitText === 'string' && s.membershipPointsEarned?.unitText.length > 0
                && typeof s.membershipPointsEarned?.value === 'string' && s.membershipPointsEarned?.value.length > 0) {
                membershipPointsEarned = {
                    name: s.membershipPointsEarned.name,
                    typeOf: 'QuantitativeValue',
                    unitText: s.membershipPointsEarned.unitText,
                    value: Number(s.membershipPointsEarned.value)
                };
            }

            return {
                typeOf: chevre.factory.programMembership.ProgramMembershipType.ProgramMembership,
                ...(membershipPointsEarned !== undefined) ? { membershipPointsEarned } : undefined
            };
        });
    }

    return {
        project: { typeOf: req.project.typeOf, id: req.project.id },
        typeOf: ProductType.MembershipService,
        id: req.params.id,
        // identifier: body.identifier,
        name: req.body.name,
        serviceOutput: serviceOutput,
        ...(hasOfferCatalog !== undefined) ? { hasOfferCatalog } : undefined,
        ...(!isNew)
            ? {
                $unset: {
                    ...(hasOfferCatalog === undefined) ? { hasOfferCatalog: 1 } : undefined
                }
            }
            : undefined
    };
}

function validate() {
    return [
        // colName = '区分分類';
        // req.checkBody('inCodeSet.identifier').notEmpty()
        //     .withMessage(Message.Common.required.replace('$fieldName$', colName));

        // colName = '区分コード';
        // req.checkBody('codeValue')
        //     .notEmpty()
        //     .withMessage(Message.Common.required.replace('$fieldName$', colName))
        //     .isAlphanumeric()
        //     .len({ max: 20 })
        //     // tslint:disable-next-line:no-magic-numbers
        //     .withMessage(Message.Common.getMaxLength(colName, 20));

        body('name.ja')
            .notEmpty()
            .withMessage(Message.Common.required.replace('$fieldName$', '名称'))
            // tslint:disable-next-line:no-magic-numbers
            .withMessage(Message.Common.getMaxLength('名称', 30))
    ];
}

export default paymentCardRouter;