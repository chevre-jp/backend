/**
 * 会員プログラム管理ルーター
 */
import * as chevre from '@chevre/api-nodejs-client';
import { Request, Router } from 'express';
import { NO_CONTENT } from 'http-status';
import * as _ from 'underscore';

import * as Message from '../../common/Const/Message';

const NUM_ADDITIONAL_PROPERTY = 10;

const membershipProgramRouter = Router();

membershipProgramRouter.all(
    '/new',
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const productService = new chevre.service.Product({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });

        if (req.method === 'POST') {
            // 検証
            validate(req);
            const validatorResult = await req.getValidationResult();
            errors = req.validationErrors(true);
            // 検証
            if (validatorResult.isEmpty()) {
                try {
                    let product = createFromBody(req);
                    product = await productService.create(product);
                    req.flash('message', '登録しました');
                    res.redirect(`/services/membershipProgram/${product.id}`);

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
            forms.additionalProperty.push(...[...Array(NUM_ADDITIONAL_PROPERTY - forms.additionalProperty.length)].map(() => {
                return {};
            }));
        }

        res.render('services/membershipProgram/new', {
            message: message,
            errors: errors,
            forms: forms
        });
    }
);

membershipProgramRouter.get(
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
                typeOf: { $eq: 'Service' },
                serviceOutput: { typeOf: { $eq: chevre.factory.programMembership.ProgramMembershipType.ProgramMembership } }
            };
            const { data } = await productService.search(searchConditions);

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: data.map((t) => {
                    return {
                        ...t
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

membershipProgramRouter.all(
    '/:id',
    // tslint:disable-next-line:cyclomatic-complexity max-func-body-length
    async (req, res, next) => {
        try {
            let message = '';
            let errors: any = {};

            const productService = new chevre.service.Product({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });
            let product = await productService.findById({ id: req.params.id });

            if (req.method === 'POST') {
                // 検証
                validate(req);
                const validatorResult = await req.getValidationResult();
                errors = req.validationErrors(true);
                if (validatorResult.isEmpty()) {
                    try {
                        product = createFromBody(req);
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
                ...product
            };

            res.render('services/membershipProgram/update', {
                message: message,
                errors: errors,
                forms: forms
            });
        } catch (err) {
            next(err);
        }
    }
);

membershipProgramRouter.get(
    '',
    async (__, res) => {
        res.render('services/membershipProgram/index', {
            message: ''
        });
    }
);

function createFromBody(req: Request): any {
    const body = req.body;

    return {
        project: req.project,
        typeOf: 'Service',
        id: req.params.id,
        // identifier: body.identifier,
        name: body.name,
        serviceOutput: {
            typeOf: chevre.factory.programMembership.ProgramMembershipType
        }
    };
}

function validate(req: Request): void {
    let colName: string = '';

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

    colName = '名称';
    req.checkBody('name.ja').notEmpty()
        .withMessage(Message.Common.required.replace('$fieldName$', colName))
        // tslint:disable-next-line:no-magic-numbers
        .withMessage(Message.Common.getMaxLength(colName, 30));
}

export default membershipProgramRouter;
