/**
 * 勘定科目コントローラー
 */
import * as chevre from '@chevre/api-nodejs-client';
import * as createDebug from 'debug';
import { Request, Response } from 'express';
import * as _ from 'underscore';

import * as Message from '../common/Const/Message';

const debug = createDebug('chevre-backend:controllers');

// 作品コード 半角64
const NAME_MAX_LENGTH_CODE: number = 64;
// 作品名・日本語 全角64
const NAME_MAX_LENGTH_NAME_JA: number = 64;

/**
 * 科目分類作成
 */
export async function createAccountTitleCategory(req: Request, res: Response): Promise<void> {
    let message = '';
    let errors: any = {};
    if (req.method === 'POST') {
        // バリデーション
        validateAccountTitleCategory(req);
        const validatorResult = await req.getValidationResult();
        errors = req.validationErrors(true);
        if (validatorResult.isEmpty()) {
            try {
                const accountTitle = {
                    typeOf: <'AccountTitle'>'AccountTitle',
                    codeValue: req.body.codeValue,
                    name: req.body.name,
                    description: req.body.description
                };
                debug('saving account title...', accountTitle);
                const accountTitleService = new chevre.service.AccountTitle({
                    endpoint: <string>process.env.API_ENDPOINT,
                    auth: req.user.authClient
                });
                await accountTitleService.createAccounTitleCategory(accountTitle);
                req.flash('message', '登録しました');
                res.redirect(`/accountTitles`);

                return;
            } catch (error) {
                message = error.message;
            }
        }
    }

    const forms = {
        ...req.body
    };

    // 作品マスタ画面遷移
    res.render('accountTitles/add', {
        message: message,
        errors: errors,
        forms: forms
    });
}

/**
 * 編集
 */
// export async function update(req: Request, res: Response): Promise<void> {
//     const accountTitleService = new chevre.service.AccountTitle({
//         endpoint: <string>process.env.API_ENDPOINT,
//         auth: req.user.authClient
//     });
//     let message = '';
//     let errors: any = {};
//     let accountTitle = await accountTitleService.findByIdentifier({
//         identifier: req.params.identifier
//     });
//     if (req.method === 'POST') {
//         // バリデーション
//         validate(req);
//         const validatorResult = await req.getValidationResult();
//         errors = req.validationErrors(true);
//         if (validatorResult.isEmpty()) {
//             // 作品DB登録
//             try {
//                 accountTitle = createFromBody(req.body);
//                 debug('saving account title...', accountTitle);
//                 await accountTitleService.update(accountTitle);
//                 req.flash('message', '更新しました');
//                 res.redirect(req.originalUrl);

//                 return;
//             } catch (error) {
//                 message = error.message;
//             }
//         }
//     }

//     const forms = {
//         identifier: (_.isEmpty(req.body.identifier)) ? accountTitle.identifier : req.body.identifier,
//         name: (_.isEmpty(req.body.name)) ? accountTitle.name : req.body.name,
//         category: {
//             category: {}
//         },
//         ...{
//             category: (_.isEmpty(req.body.category))
//                 ? (accountTitle.category !== undefined)
//                     ? {
//                         category: {},
//                         ...accountTitle.category
//                     }
//                     : {
//                         category: {}
//                     }
//                 : req.body.category
//         }
//     };

//     // 作品マスタ画面遷移
//     res.render('accountTitles/edit', {
//         message: message,
//         errors: errors,
//         forms: forms
//     });
// }

// function createFromBody(body: any): chevre.factory.accountTitle.IAccountTitle {
//     return {
//         typeOf: 'AccountTitle',
//         identifier: body.identifier,
//         name: body.name,
//         description: body.description,
//         category: body.category
//     };
// }

/**
 * 一覧データ取得API
 */
export async function getList(req: Request, res: Response): Promise<void> {
    try {
        const accountTitleService = new chevre.service.AccountTitle({
            endpoint: <string>process.env.API_ENDPOINT,
            auth: req.user.authClient
        });
        debug('searching...', req.query);
        const result = await accountTitleService.search({
            limit: Number(req.query.limit),
            page: Number(req.query.page),
            codeValue: (req.query.codeValue !== undefined && req.query.codeValue !== '') ? `^${req.query.codeValue}$` : undefined,
            inCodeSet: {
                codeValue: (req.query.inCodeSet.codeValue !== undefined && req.query.inCodeSet.codeValue !== '')
                    ? `^${req.query.inCodeSet.codeValue}$`
                    : undefined,
                inCodeSet: {
                    codeValue: (req.query.inCodeSet.inCodeSet.codeValue !== undefined && req.query.inCodeSet.inCodeSet.codeValue !== '')
                        ? `^${req.query.inCodeSet.inCodeSet.codeValue}$`
                        : undefined
                }
            }
        });
        res.json({
            success: true,
            count: result.totalCount,
            results: result.data
        });
    } catch (error) {
        res.json({
            success: false,
            count: 0,
            results: []
        });
    }
}

/**
 * 一覧
 */
export async function index(req: Request, res: Response): Promise<void> {
    const accountTitleService = new chevre.service.AccountTitle({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient
    });

    // 科目分類検索
    const searchAccountTitleCategoriesResult = await accountTitleService.searchAccountTitleCategories({ limit: 100 });
    debug(searchAccountTitleCategoriesResult);

    // 科目検索
    const searchAccountTitleSetsResult = await accountTitleService.searchAccountTitleSets({ limit: 100 });
    debug(searchAccountTitleSetsResult);

    res.render('accountTitles/index', {
        forms: {},
        accountTitleCategories: searchAccountTitleCategoriesResult.data,
        accountTitleSets: searchAccountTitleSetsResult.data
    });
}

/**
 * 科目新規登録画面検証
 */
function validateAccountTitleCategory(req: Request): void {
    // 科目分類コード
    let colName: string = '科目分類コード';
    req.checkBody('codeValue', Message.Common.required.replace('$fieldName$', colName)).notEmpty();
    req.checkBody('codeValue', Message.Common.getMaxLengthHalfByte(colName, NAME_MAX_LENGTH_CODE))
        .len({ max: NAME_MAX_LENGTH_CODE });
    // 科目分類名称
    colName = '科目分類名称';
    req.checkBody('name', Message.Common.required.replace('$fieldName$', colName)).notEmpty();
    req.checkBody('name', Message.Common.getMaxLength(colName, NAME_MAX_LENGTH_NAME_JA))
        .len({ max: NAME_MAX_LENGTH_NAME_JA });

    // colName = '科目コード';
    // req.checkBody('category.identifier', Message.Common.required.replace('$fieldName$', colName)).notEmpty();
    // req.checkBody('category.identifier', Message.Common.getMaxLengthHalfByte(colName, NAME_MAX_LENGTH_CODE))
    //     .len({ max: NAME_MAX_LENGTH_CODE });

    // colName = '科目名称';
    // req.checkBody('category.name', Message.Common.required.replace('$fieldName$', colName)).notEmpty();
    // req.checkBody('category.name', Message.Common.getMaxLength(colName, NAME_MAX_LENGTH_NAME_JA))
    //     .len({ max: NAME_MAX_LENGTH_NAME_JA });

    // colName = '細目コード';
    // req.checkBody('identifier', Message.Common.required.replace('$fieldName$', colName)).notEmpty();
    // req.checkBody('identifier', Message.Common.getMaxLengthHalfByte(colName, NAME_MAX_LENGTH_CODE))
    //     .len({ max: NAME_MAX_LENGTH_CODE });

    // colName = '細目名称';
    // req.checkBody('name', Message.Common.required.replace('$fieldName$', colName)).notEmpty();
    // req.checkBody('name', Message.Common.getMaxLength(colName, NAME_MAX_LENGTH_NAME_JA))
    //     .len({ max: NAME_MAX_LENGTH_NAME_JA });
}

/**
 * 科目追加
 */
export async function addAccountTitleSet(req: Request, res: Response): Promise<void> {
    let message = '';
    let errors: any = {};

    const accountTitleService = new chevre.service.AccountTitle({
        endpoint: <string>process.env.API_ENDPOINT,
        auth: req.user.authClient
    });

    // 科目分類検索
    const searchAccountTitleCategoriesResult = await accountTitleService.searchAccountTitleCategories({ limit: 100 });

    if (req.method === 'POST') {
        // バリデーション
        validateAccountTitleSet(req);
        const validatorResult = await req.getValidationResult();
        errors = req.validationErrors(true);
        if (validatorResult.isEmpty()) {
            try {
                const accountTitle = {
                    typeOf: <'AccountTitle'>'AccountTitle',
                    codeValue: req.body.codeValue,
                    name: req.body.name,
                    description: req.body.description,
                    inCodeSet: {
                        typeOf: <'AccountTitle'>'AccountTitle',
                        codeValue: req.body.inCodeSet.codeValue,
                        name: ''
                    }
                };
                debug('saving account title...', accountTitle);
                await accountTitleService.createAccounTitleSet(accountTitle);
                req.flash('message', '登録しました');
                res.redirect(`/accountTitles`);

                return;
            } catch (error) {
                console.error(error);
                message = error.message;
            }
        }
    }

    const forms = {
        inCodeSet: {},
        ...req.body
    };

    // 作品マスタ画面遷移
    res.render('accountTitles/hasCategoryCode/add', {
        message: message,
        errors: errors,
        forms: forms,
        accountTitleCategories: searchAccountTitleCategoriesResult.data
    });
}

/**
 * 科目バリデーション
 */
function validateAccountTitleSet(req: Request): void {
    let colName: string = '科目分類';
    req.checkBody('inCodeSet.codeValue', Message.Common.required.replace('$fieldName$', colName)).notEmpty();

    colName = '科目コード';
    req.checkBody('codeValue', Message.Common.required.replace('$fieldName$', colName)).notEmpty();
    req.checkBody('codeValue', Message.Common.getMaxLengthHalfByte(colName, NAME_MAX_LENGTH_CODE))
        .len({ max: NAME_MAX_LENGTH_CODE });

    colName = '科目名称';
    req.checkBody('name', Message.Common.required.replace('$fieldName$', colName)).notEmpty();
    req.checkBody('name', Message.Common.getMaxLength(colName, NAME_MAX_LENGTH_NAME_JA))
        .len({ max: NAME_MAX_LENGTH_NAME_JA });
}