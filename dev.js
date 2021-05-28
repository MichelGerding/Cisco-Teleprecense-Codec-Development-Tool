"use strict";
exports.__esModule = true;
var ts = require("typescript");
var fs = require("fs");
var path = require("path");
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
                var fileExtension = path.extname(file).toLowerCase();
                if (fileExtension === '.ts') {
                    // if the file is a ts file we take the name of the file as 
                    // module name and then add it to the tsFiles array
                    var moduleName = file.slice(0, -3);
                    tsFiles.push({
                        moduleName: moduleName,
                        path: filePath
                    });
                }
            }
            else if (fileStats.isDirectory()) {
                // if it is a directory we check if it has an index.ts file in the folder
                var modDir = fs.readdirSync(filePath);
                if (modDir.includes('index.ts')) {
                    // if it has we take the name of the folder as the filename
                    var moduleName = file;
                    tsFiles.push({
                        moduleName: moduleName,
                        path: path.join(filePath, 'index.ts')
                    });
                }
            }
        });
        // TODO: transpile sources 
        tsFiles.forEach(function (file, index) {
            return new Promise(function (resolve, reject) {
                try {
                    var tsSource = fs.readFileSync(file.path).toString();
                    var jsModule = ts.transpile(tsSource);
                    tsFiles[index].code = jsModule;
                    // tsFiles[index].code = jsSource; 
                }
                catch (err) {
                    reject(file);
                }
            });
        });
        console.log(tsFiles);
        eval(tsFiles[0].code);
        // TODO: upload via serial 
    });
}
function compile(fileNames, options) {
    var program = ts.createProgram(fileNames, options);
    var emitResult = program.emit();
    var allDiagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);
    allDiagnostics.forEach(function (diagnostic) {
        if (diagnostic.file) {
            var _a = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start), line = _a.line, character = _a.character;
            var message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
            console.log(diagnostic.file.fileName + " (" + (line + 1) + "," + (character + 1) + "): " + message);
        }
        else {
            console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
        }
    });
    var exitCode = emitResult.emitSkipped ? 1 : 0;
    console.log("Process exiting with code '" + exitCode + "'.");
    process.exit(exitCode);
}
main();
