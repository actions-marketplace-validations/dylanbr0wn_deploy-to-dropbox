var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
import { Dropbox } from 'dropbox';
import fs from 'fs';
import * as core from '@actions/core';
import glob from '@actions/glob';
const accessToken = core.getInput('DROPBOX_ACCESS_TOKEN');
const globSource = core.getInput('GLOB');
const dropboxPathPrefix = core.getInput('DROPBOX_DESTINATION_PATH_PREFIX');
const isDebug = core.getInput('DEBUG');
const dropbox = new Dropbox({ accessToken });
const fileWriteMode = core.getInput('FILE_WRITE_MODE');
let parsedFileWriteMode;
if (fileWriteMode === "overwrite") {
    parsedFileWriteMode = { '.tag': "overwrite" };
}
else {
    parsedFileWriteMode = { '.tag': "add" };
}
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function uploadFile(filePath) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const file = fs.readFileSync(filePath);
        const destinationPath = `${dropboxPathPrefix}${filePath}`;
        if (isDebug)
            console.log('uploaded file to Dropbox at: ', destinationPath);
        let max_retry = 5;
        let retry = 0;
        let wait = 0;
        while (1) {
            try {
                return yield dropbox
                    .filesUpload({ path: destinationPath, contents: file, mode: parsedFileWriteMode });
            }
            catch (err) {
                let error = err;
                if (((_a = error === null || error === void 0 ? void 0 : error.error) === null || _a === void 0 ? void 0 : _a['.tag']) === "too_many_write_operations") {
                    if (retry < max_retry) {
                        wait = error.headers['Retry-After'];
                        console.log("Too many write operations, retrying in ", delay, " seconds");
                        yield delay(wait * 1000);
                        retry += 1;
                    }
                    else {
                        throw err;
                    }
                }
                else {
                    throw err;
                }
            }
        }
    });
}
function run() {
    var e_1, _a;
    return __awaiter(this, void 0, void 0, function* () {
        const files = [];
        console.log(globSource);
        const source = globSource.split(',').join('\n');
        console.log(source);
        const globber = yield glob.create(source);
        try {
            for (var _b = __asyncValues(globber.globGenerator()), _c; _c = yield _b.next(), !_c.done;) {
                const file = _c.value;
                try {
                    const res = yield uploadFile(file);
                    if (res) {
                        files.push();
                    }
                }
                catch (err) {
                    const error = err;
                    console.error('error', err);
                    core.setFailed(error);
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
            }
            finally { if (e_1) throw e_1.error; }
        }
        console.log('Uploaded files', files);
    });
}
run().catch(err => {
    const error = err;
    console.error('error', err);
    core.setFailed(error);
});
