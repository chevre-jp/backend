import { Models } from '@motionpicture/chevre-domain';
import * as moment from 'moment';
//import * as mongoose from 'mongoose';
import BaseController from '../BaseController';
/**
 * マスタ共通コントローラー基底クラス
 *
 * @export
 * @class MasterBaseController
 * @extends {BaseController}
 */
export default class MasterBaseController extends BaseController {
    /**
     * 前方一致正規表現取得
     *
     * @param {string} value
     * @returns {RegExp}
     */
    protected static getRegxForwardMatching(value: string): RegExp {
        return new RegExp('^' + value);
    }
    /**
     * DB検索用ISO日付取得
     *
     * @param {string} dateStr
     * @param {number} addDay
     * @returns {string}
     */
    protected static toISOStringJapan(dateStr: string, addDay: number = 0): string {
        const dateWk: string = moment(dateStr, 'YYYY/MM/DD').add(addDay, 'days').format('YYYYMMDD');
        // tslint:disable-next-line:no-magic-numbers
        return dateWk.substr(0, 4) + '-' + dateWk.substr(4, 2) + '-' + dateWk.substr(6, 2) + 'T00:00:00+09:00';
    }
    /**
     * Id自動採番
     *
     * @param {string} target
     * @param {number} digits
     * @param {function} cb
     */
    protected static getId(target: string, digits: number, cb: (err: Error, no: string | null) => void): void {
        Models.Sequence.findOneAndUpdate(
            { target: target },
            {
                $inc: { no: 1 }
            },
            {
                upsert: true,
                new: true
            },
            (err, sequence) => {
                if (err !== null) {
                    cb(err, null);
                    return;
                }
                const no: number = sequence.get('no');
                // 指定桁数になるように0で埋める
                let source = no.toString();
                while (source.length < digits) {
                    source = '0' + source;
                }
                cb(err, source);
            }
        );
    }
    /**
     * 画面入力値のモデルセット処理
     *
     * @param {T} model
     * @returns {T}
     */
    protected parseModel<T>(model: T): T {
        // 画面入力値をモデルにセット
        if (this.req) {
            Object.getOwnPropertyNames(this.req.body).forEach((propertyName) => {
                (<any>model)[propertyName] = this.req.body[propertyName];
            });
        }
        return model;
    }
}
