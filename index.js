"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ts = require("typescript");
const fs = require("fs");
const Path = require("path");
const SerialPort = require("serialport");
const UglifyJS = require("uglify-js");
const config = require("./config.json");
process.env.ENV = process.argv[2] == '--prod' ? 'build' : 'dev';
main();
async function main() {
    // setup the serial port
    const port = new SerialPort(config.com_port, {
        baudRate: 115200
    }, (err) => {
        if (err) {
            console.log(err.message);
        }
    });
    // get the ts sources as strings
    const TsSources = await getTSSources();
    const compact = process.env.ENV == 'build' ? true : false;
    transpileAndUpload(TsSources, port, compact);
}
function transpileAndUpload(tsSrc, port, compact) {
    tsSrc.forEach(src => {
        console.log('Transpiling module: ' + src.name + ' ...');
        // in the following few lines of code we transpile the code, prefix the xapi import, remove empty exports, 
        // remove empty lines and if the user wants it to be compact we make it a single line.
        // we can do that because the transpiler adds ; at the end of the lines
        let code = ('import xapi from "xapi";\r\n' +
            ts.transpile(src.src, { target: ts.ScriptTarget.ES2019 }))
            .split('\r\n')
            .filter((line, index) => {
            return (line === '' ||
                line === 'export {};' ||
                (line.startsWith("import { xapi } from '.") &&
                    line.endsWith("/xapi'")) || (index < 2 && index !== 0)) ? false : true;
        })
            .join('\n');
        if (compact) {
            console.log('minifing module ' + src.name + '...');
            let result = UglifyJS.minify(code);
            if (result.error) {
                console.error(result.errror);
            }
            code = result.code;
            src.name += '-minified';
        }
        //now we have the code transpiled and formatted we can create the command for the codec.
        let command = `echo off \r\nxcommand Macros Macro Save Overwrite: True Name: "${src.name}" Transpile: True\r\n` +
            code + '\r\n.\r\n' +
            `xcommand Macros Macro Activate Name: "${src.name}"\r\n`;
        console.log(command);
        // now that we have created the command we can upload it to the codec
        port.write(command, (err) => {
            if (err) {
                return console.error(err.message);
            }
            console.log('succesfully uploaded macro: ' + src.name);
        });
    });
}
async function getTSSources(folderPath = undefined) {
    folderPath = folderPath ?? Path.resolve(process.env.MODULE_PATH ?? './modules');
    const files = getFilesInFolderRecursive(folderPath);
    // console.log(files)
    const promises = files.map((file) => {
        return new Promise((resolve, reject) => {
            fs.readFile(file.path, (err, data) => {
                if (err) {
                    reject(err);
                }
                resolve({ src: data.toString(), name: file.name });
            });
        });
    });
    return Promise.all(promises);
}
function getFilesInFolderRecursive(path, moduleName = "") {
    let tsSources = [];
    const files = fs.readdirSync(path);
    files.forEach((file) => {
        const filePath = Path.join(path, file);
        const fileStats = fs.statSync(filePath);
        const fileNameParts = file.split('.');
        const fileName = fileNameParts.shift();
        const extension = fileNameParts.join('.');
        if (fileStats.isDirectory()) {
            const moduleStr = moduleName === "" ? fileName : `${moduleName}_${fileName}`;
            tsSources = [...tsSources, ...getFilesInFolderRecursive(filePath, moduleStr)];
        }
        else if (fileStats.isFile() && extension == 'ts') {
            const moduleStr = moduleName === "" ? fileName : `${moduleName}_${fileName}`;
            tsSources.push({
                name: moduleStr,
                path: filePath
            });
        }
    });
    return tsSources;
}
