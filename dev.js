"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
exports.__esModule = true;
var ts = require("typescript");
var fs = require("fs");
var path = require("path");
var SerialPort = require("serialport");
// serial port test
var port = new SerialPort('COM4', {
    baudRate: 115200
}, function (err) {
    if (err) {
        console.log(err.message);
    }
});
function main() {
    var _a;
    //get the directory of the modules
    var moduleDir = path.resolve((_a = process.env.MODULE_PATH) !== null && _a !== void 0 ? _a : './modules');
    fs.readdir(moduleDir, function (err, files) {
        if (err) {
            throw err;
        }
        var tsFiles = Array();
        // check if the file is a folder or a file
        files.forEach(function (file) {
            var filePath = path.join(moduleDir, file);
            var fileStats = fs.statSync(filePath);
            if (fileStats.isFile()) {
                // if it is a file we check if the etension is .ts
                var fileExtension = file.split('.').slice(1).join('.').toLowerCase();
                if (fileExtension === 'ts') {
                    // if the file is a ts file we take the name of the file as 
                    // module name and then add it to the tsFiles array
                    var moduleName = file.slice(0, -3);
                    tsFiles.push({
                        moduleName: moduleName,
                        path: filePath
                    });
                }
            }
            //  else if (fileStats.isDirectory()) {
            //     // if it is a directory we check if it has an index.ts file in the folder
            //     const modDir = fs.readdirSync(filePath);
            //     if (modDir.includes('index.ts')) {
            //         // if it has we take the name of the folder as the filename
            //         const moduleName = file
            //         tsFiles.push({
            //             moduleName: moduleName,
            //             path: path.join(filePath, 'index.ts')
            //         })
            //     }
            // }
        });
        // TODO: transpile sources 
        var promises = tsFiles.map(function (file, index) {
            return new Promise(function (resolve, reject) {
                try {
                    var tsSource = fs.readFileSync(file.path).toString();
                    var jsModule = ts.transpile(tsSource, { target: ts.ScriptTarget.Latest });
                    resolve(__assign(__assign({}, tsFiles[index]), { code: jsModule }));
                    // tsFiles[index].code = jsSource; 
                }
                catch (err) {
                    reject(file);
                }
            });
        });
        Promise.all(promises).then(function (jsFiles) {
            // TODO: upload via serial 
            jsFiles.forEach(function (file) {
                var code = file.code.split('\r\n').slice(0, -2);
                code.unshift("import { xapi } from 'xapi'");
                console.log(code);
                code = code.join('\n');
                var macroCommand = "xcommand Macros Macro Save Overwrite: True Name: " + file.moduleName + " Transpile: True\r\n" +
                    (code + ".\r\n") +
                    ("xcommand Macros Macro Activate Name: " + file.moduleName + "\r\n");
                port.write(macroCommand, function (err) {
                    if (err) {
                        console.log(err.message);
                    }
                    console.log("uploaded macro " + file.moduleName);
                });
            });
        });
    });
}
main();
