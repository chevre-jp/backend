/**
 * カテゴリーコードルーター
 */
import * as chevre from '@chevre/api-nodejs-client';
import { Request, Router } from 'express';

import * as Message from '../message';

import { categoryCodeSets } from '../factory/categoryCodeSet';

const categoryCodesRouter = Router();

categoryCodesRouter.get(
    '',
    async (_, res) => {
        res.render('categoryCodes/index', {
            message: '',
            CategorySetIdentifier: chevre.factory.categoryCode.CategorySetIdentifier,
            categoryCodeSets: categoryCodeSets
        });
    }
);

categoryCodesRouter.get(
    '/search',
    async (req, res) => {
        try {
            const categoryCodeService = new chevre.service.CategoryCode({
                endpoint: <string>process.env.API_ENDPOINT,
                auth: req.user.authClient
            });

            const limit = Number(req.query.limit);
            const page = Number(req.query.page);
            const { data } = await categoryCodeService.search({
                limit: limit,
                page: page,
                project: { id: { $eq: req.project.id } },
                ...(req.query.codeValue !== undefined && req.query.codeValue !== null
                    && typeof req.query.codeValue.$eq === 'string' && req.query.codeValue.$eq.length > 0)
                    ? { codeValue: { $eq: req.query.codeValue.$eq } }
                    : undefined,
                ...(req.query.inCodeSet !== undefined && req.query.inCodeSet !== null
                    && typeof req.query.inCodeSet.identifier === 'string' && req.query.inCodeSet.identifier.length > 0)
                    ? { inCodeSet: { identifier: { $eq: req.query.inCodeSet.identifier } } }
                    : undefined,
                ...(req.query.name !== undefined && req.query.name !== null
                    && typeof req.query.name.$regex === 'string' && req.query.name.$regex.length > 0)
                    ? { name: { $regex: req.query.name.$regex } }
                    : undefined
            });

            res.json({
                success: true,
                count: (data.length === Number(limit))
                    ? (Number(page) * Number(limit)) + 1
                    : ((Number(page) - 1) * Number(limit)) + Number(data.length),
                results: data.map((d) => {
                    const categoryCodeSet = categoryCodeSets.find((c) => c.identifier === d.inCodeSet.identifier);

                    return {
                        ...d,
                        categoryCodeSetName: categoryCodeSet?.name
                    };
                })
            });
        } catch (error) {
            res.json({
                success: false,
                message: error.message,
                count: 0,
                results: []
            });
        }
    }
);

categoryCodesRouter.all(
    '/new',
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const categoryCodeService = new chevre.service.CategoryCode({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });

        if (req.method === 'POST') {
            // バリデーション
            validate(req);
            const validatorResult = await req.getValidationResult();
            errors = req.validationErrors(true);
            if (validatorResult.isEmpty()) {
                try {
                    let categoryCode = createMovieFromBody(req);

                    // コード重複確認
                    const { data } = await categoryCodeService.search({
                        limit: 1,
                        project: { id: { $eq: req.project.id } },
                        codeValue: { $eq: categoryCode.codeValue },
                        inCodeSet: { identifier: { $eq: categoryCode.inCodeSet.identifier } }
                    });
                    if (data.length > 0) {
                        throw new Error('既に存在するコードです');
                    }

                    categoryCode = await categoryCodeService.create(categoryCode);

                    req.flash('message', '登録しました');
                    res.redirect(`/categoryCodes/${(<any>categoryCode).id}/update`);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }
        }

        const forms = {
            appliesToCategoryCode: {},
            ...req.body
        };

        res.render('categoryCodes/new', {
            message: message,
            errors: errors,
            forms: forms,
            CategorySetIdentifier: chevre.factory.categoryCode.CategorySetIdentifier,
            categoryCodeSets: categoryCodeSets
        });
    }
);

categoryCodesRouter.all(
    '/:id/update',
    async (req, res) => {
        let message = '';
        let errors: any = {};

        const categoryCodeService = new chevre.service.CategoryCode({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        let categoryCode = await categoryCodeService.findById({
            id: req.params.id
        });

        if (req.method === 'POST') {
            // バリデーション
            validate(req);
            const validatorResult = await req.getValidationResult();
            errors = req.validationErrors(true);
            if (validatorResult.isEmpty()) {
                // 作品DB登録
                try {
                    categoryCode = { ...createMovieFromBody(req), ...{ id: (<any>categoryCode).id } };
                    await categoryCodeService.update(categoryCode);
                    req.flash('message', '更新しました');
                    res.redirect(req.originalUrl);

                    return;
                } catch (error) {
                    message = error.message;
                }
            }
        }

        const forms = {
            ...categoryCode,
            ...req.body
        };

        res.render('categoryCodes/update', {
            message: message,
            errors: errors,
            forms: forms,
            CategorySetIdentifier: chevre.factory.categoryCode.CategorySetIdentifier,
            categoryCodeSets: categoryCodeSets
        });
    }
);

function createMovieFromBody(req: Request): chevre.factory.categoryCode.ICategoryCode {
    const body = req.body;

    return {
        project: req.project,
        typeOf: 'CategoryCode',
        codeValue: body.codeValue,
        inCodeSet: {
            typeOf: 'CategoryCodeSet',
            identifier: body.inCodeSet.identifier
        },
        name: <any>{ ja: body.name.ja }
    };
}

function validate(req: Request): void {
    let colName: string = '';

    colName = '区分分類';
    req.checkBody('inCodeSet.identifier')
        .notEmpty()
        .withMessage(Message.Common.required.replace('$fieldName$', colName));

    colName = 'コード';
    req.checkBody('codeValue')
        .notEmpty()
        .withMessage(Message.Common.required.replace('$fieldName$', colName))
        // .isAlphanumeric()
        .matches(/^[0-9a-zA-Z\+]+$/)
        .len({ max: 20 })
        // tslint:disable-next-line:no-magic-numbers
        .withMessage(Message.Common.getMaxLength(colName, 20));

    colName = '名称';
    req.checkBody('name.ja')
        .notEmpty()
        .withMessage(Message.Common.required.replace('$fieldName$', colName))
        // tslint:disable-next-line:no-magic-numbers
        .withMessage(Message.Common.getMaxLength(colName, 30));
}

export default categoryCodesRouter;
