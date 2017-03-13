"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator.throw(value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments)).next());
    });
};
const queryAble_1 = require("./queryAble");
const queryWhere_1 = require("./queryWhere");
const pgUtils_1 = require("./pgUtils");
var util = require('util');
var _ = require('lodash');
class PgTable extends queryAble_1.QueryAble {
    constructor(schema, desc, fieldTypes = {}) {
        super();
        this.schema = schema;
        this.desc = desc;
        this.db = schema.db;
        this.qualifiedName = util.format('"%s"."%s"', desc.schema, desc.name);
        this.fieldTypes = fieldTypes;
    }
    toString() {
        return this.qualifiedName;
    }
    insert(records, options) {
        return __awaiter(this, void 0, void 0, function* () {
            options = options || {};
            if (!records) {
                throw new Error("insert should be called with data");
            }
            else if (!Array.isArray(records)) {
                records = [records];
            }
            else if (records.length === 0) {
                return 0; // just return empty arrays so bulk inserting variable-length lists is more friendly
            }
            let { sql, parameters } = this.getInsertQuery(records);
            sql = "WITH __RESULT as ( " + sql + " RETURNING 1) SELECT SUM(1) FROM __RESULT";
            let result = yield this.query(sql, parameters, { logger: options.logger });
            return result[0].sum;
        });
    }
    insertAndGet(records, options) {
        return __awaiter(this, void 0, void 0, function* () {
            var returnSingle = false;
            options = options || {};
            if (!records) {
                throw new Error("insert should be called with data");
            }
            else if (!Array.isArray(records)) {
                returnSingle = true;
                records = [records];
            }
            else if (records.length === 0) {
                return []; // just return empty arrays so bulk inserting variable-length lists is more friendly
            }
            let { sql, parameters } = this.getInsertQuery(records);
            if (options.return && Array.isArray(options.return)) {
                if (options.return.length == 0) {
                }
                else {
                    sql += " RETURNING " + options.return.map(pgUtils_1.pgUtils.quoteField).join(',');
                }
            }
            else {
                sql += " RETURNING *";
            }
            let result = yield this.query(sql, parameters, { logger: options.logger });
            if (options.return && options.return.length == 0) {
                return new Array(returnSingle ? 1 : records.length).fill({});
            }
            if (returnSingle) {
                return result[0];
            }
            else {
                return result;
            }
        });
    }
    ;
    updateOne(conditions, fields, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let affected = yield this.update(conditions, fields, options);
            if (affected > 1) {
                throw new Error('More then one record has been updated!');
            }
            return affected;
        });
    }
    updateAndGetOne(conditions, fields, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.updateAndGet(conditions, fields, options);
            if (result.length > 1) {
                throw new Error('More then one record has been updated!');
            }
            return result[0];
        });
    }
    update(conditions, fields, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let { sql, parameters } = this.getUpdateQuery(conditions, fields, options);
            sql = "WITH __RESULT as ( " + sql + " RETURNING 1) SELECT SUM(1) FROM __RESULT";
            let res = yield this.query(sql, parameters, options);
            return res[0].sum;
        });
    }
    ;
    updateAndGet(conditions, fields, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let { sql, parameters } = this.getUpdateQuery(conditions, fields, options);
            sql += " RETURNING " + (options && options.return && Array.isArray(options.return) ? options.return.map(pgUtils_1.pgUtils.quoteField).join(',') : '*');
            return this.query(sql, parameters, options);
        });
    }
    ;
    delete(conditions, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let { sql, parameters } = this.getDeleteQuery(conditions, options);
            sql = "WITH __RESULT as ( " + sql + " RETURNING 1) SELECT SUM(1) FROM __RESULT";
            let res = yield this.query(sql, parameters, options);
            return res[0].sum;
        });
    }
    deleteOne(conditions, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let affected = yield this.delete(conditions, options);
            if (affected > 1) {
                throw new Error('More then one record has been deleted!');
            }
            return affected;
        });
    }
    deleteAndGet(conditions, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let { sql, parameters } = this.getDeleteQuery(conditions, options);
            sql += " RETURNING " + options && options.return && Array.isArray(options.return) ? options.return.map(pgUtils_1.pgUtils.quoteField).join(',') : '*';
            return this.query(sql, parameters);
        });
    }
    deleteAndGetOne(conditions, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let result = yield this.deleteAndGet(conditions, options);
            if (result.length > 1) {
                throw new Error('More then one record has been deleted!');
            }
            return result[0];
        });
    }
    // async deleteAll(options?:UpdateDeleteOption):Promise<number> {
    //     let sql = util.format("DELETE FROM %s ", this.qualifiedName);
    //     sql = "WITH __RESULT as ( " + sql + " RETURNING 1) SELECT SUM(1) FROM __RESULT";
    //     let res = await this.query(sql, {logger:options.logger});
    //     return res[0].sum;
    // }
    truncate(options) {
        return __awaiter(this, void 0, void 0, function* () {
            let sql = `TRUNCATE ${this.qualifiedName}`;
            if (options && options.restartIdentity) {
                sql += ' RESTART IDENTITY';
            }
            if (options && options.cascade) {
                sql += ' CASCADE';
            }
            yield this.query(sql, null, options);
        });
    }
    find(conditions, options) {
        return __awaiter(this, void 0, void 0, function* () {
            options = options || {};
            options.skipUndefined = options.skipUndefined === true || (options.skipUndefined === undefined && ['all', 'select'].indexOf(this.db.config.skipUndefined) > -1);
            let where = _.isEmpty(conditions) ? { where: " ", params: null } : queryWhere_1.default(conditions, this.fieldTypes, this.qualifiedName, 0, options.skipUndefined);
            let sql = `SELECT ${pgUtils_1.pgUtils.processQueryFields(options)} FROM ${this.qualifiedName} ${where.where} ${pgUtils_1.pgUtils.processQueryOptions(options)}`;
            return options.stream ? this.queryAsStream(sql, where.params, options) : this.query(sql, where.params, options);
        });
    }
    findWhere(where, params, options) {
        return __awaiter(this, void 0, void 0, function* () {
            options = options || {};
            let sql = `SELECT ${pgUtils_1.pgUtils.processQueryFields(options)} FROM ${this.qualifiedName} WHERE ${where} ${pgUtils_1.pgUtils.processQueryOptions(options)}`;
            return options.stream ? this.queryAsStream(sql, params, options) : this.query(sql, params, options);
        });
    }
    findAll(options) {
        return __awaiter(this, void 0, void 0, function* () {
            options = options || {};
            let sql = `SELECT ${pgUtils_1.pgUtils.processQueryFields(options)} FROM ${this.qualifiedName} ${pgUtils_1.pgUtils.processQueryOptions(options)}`;
            return options.stream ? this.queryAsStream(sql, null, options) : this.query(sql, null, options);
        });
    }
    findOne(conditions, options) {
        return __awaiter(this, void 0, void 0, function* () {
            let res = yield this.find(conditions, options);
            if (res.length > 1) {
                throw new Error('More then one rows exists');
            }
            return res[0];
        });
    }
    findFirst(conditions, options) {
        return __awaiter(this, void 0, void 0, function* () {
            options = options || {};
            options.limit = 1;
            let res = yield this.find(conditions, options);
            return res[0];
        });
    }
    count(conditions, options) {
        return __awaiter(this, void 0, void 0, function* () {
            options = options || {};
            options.skipUndefined = options.skipUndefined === true || (options.skipUndefined === undefined && ['all', 'select'].indexOf(this.db.config.skipUndefined) > -1);
            var where = _.isEmpty(conditions) ? { where: " ", params: null } : queryWhere_1.default(conditions, this.fieldTypes, this.qualifiedName, 0, options.skipUndefined);
            var sql = `SELECT COUNT(*) c FROM ${this.qualifiedName} ${where.where}`;
            return (yield this.queryOneField(sql, where.params));
        });
    }
    findOneFieldOnly(conditions, field, options) {
        return __awaiter(this, void 0, void 0, function* () {
            options = options || {};
            options.fields = [field];
            let res = yield this.findOne(conditions, options);
            return res ? res[field] : null;
        });
    }
    getInsertQuery(records) {
        let columnsMap = {};
        records.forEach(rec => {
            for (let field in rec)
                columnsMap[field] = true;
        });
        let columns = Object.keys(columnsMap);
        let sql = util.format("INSERT INTO %s (%s) VALUES\n", this.qualifiedName, columns.map(pgUtils_1.pgUtils.quoteField).join(", "));
        let parameters = [];
        let placeholders = [];
        for (let i = 0, seed = 0; i < records.length; i++) {
            placeholders.push('(' + columns.map(c => "$" + (++seed)).join(', ') + ')');
            parameters.push.apply(parameters, columns.map(c => pgUtils_1.pgUtils.transformInsertUpdateParams(records[i][c], this.fieldTypes[c])));
        }
        sql += placeholders.join(",\n");
        return { sql, parameters };
    }
    getUpdateQuery(conditions, fields, options) {
        options = options || {};
        options.skipUndefined = options.skipUndefined === true || (options.skipUndefined === undefined && this.db.config.skipUndefined === 'all');
        var hasConditions = true;
        if (_.isEmpty(fields)) {
            throw new Error('Missing fields for update');
        }
        let parameters = [];
        let f = [];
        let seed = 0;
        _.each(fields, (value, fieldName) => {
            if (value === undefined)
                return;
            f.push(util.format('%s = $%s', pgUtils_1.pgUtils.quoteField(fieldName), (++seed)));
            parameters.push(pgUtils_1.pgUtils.transformInsertUpdateParams(value, this.fieldTypes[fieldName]));
        });
        let sql = util.format("UPDATE %s SET %s", this.qualifiedName, f.join(', '));
        if (!hasConditions || !_.isEmpty(conditions)) {
            var parsedWhere = queryWhere_1.default(conditions, this.fieldTypes, this.qualifiedName, parameters.length, options.skipUndefined);
            sql += parsedWhere.where;
        }
        parameters = parameters.concat(_.flatten(_.values(conditions).filter(v => v !== undefined)));
        return { sql, parameters };
    }
    getDeleteQuery(conditions, options) {
        options = options || {};
        options.skipUndefined = options.skipUndefined === true || (options.skipUndefined === undefined && this.db.config.skipUndefined === 'all');
        let sql = util.format("DELETE FROM %s ", this.qualifiedName);
        var parsedWhere;
        if (!_.isEmpty(conditions)) {
            parsedWhere = queryWhere_1.default(conditions, this.fieldTypes, this.qualifiedName, 0, options.skipUndefined);
            sql += parsedWhere.where;
        }
        return { sql, parameters: parsedWhere && parsedWhere.params || [] };
    }
}
exports.PgTable = PgTable;
//# sourceMappingURL=pgTable.js.map