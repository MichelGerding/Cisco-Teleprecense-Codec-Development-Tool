import * as ts from "typescript";
import * as fs from 'fs';
import * as path from 'path';
import * as SerialPort from 'serialport';


// serial port test
const port = new SerialPort('COM4', {
    baudRate: 115200
}, (err) => {
    if (err) {
        console.log(err.message)
    }
})

function main () {
    //get the directory of the modules
    const moduleDir: string = path.resolve(process.env.MODULE_PATH ?? './modules');

    fs.readdir(moduleDir, (err, files) => {
        if (err) {throw err}
    
        let tsFiles = Array<{moduleName: string, path: string}>()

        // check if the file is a folder or a file
        files.forEach((file) => {
            const filePath = path.join(moduleDir, file)

            const fileStats = fs.statSync(filePath);
            if (fileStats.isFile()){
                
                // if it is a file we check if the etension is .ts
                const fileExtension = file.split('.').slice(1).join('.').toLowerCase()
                if (fileExtension === 'ts') {
                    // if the file is a ts file we take the name of the file as 
                    // module name and then add it to the tsFiles array
                    const moduleName = file.slice(0, -3);
                    tsFiles.push({
                        moduleName: moduleName,
                        path: filePath
                    })
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

        })



        // TODO: transpile sources 
        let promises = tsFiles.map((file, index) => {
            return new Promise((resolve, reject) => {
                try {
                    const tsSource = fs.readFileSync(file.path).toString();
                    const jsModule = ts.transpile(tsSource, {target: ts.ScriptTarget.Latest})

                    resolve( {...tsFiles[index], code: jsModule});
                    // tsFiles[index].code = jsSource; 
                } catch(err) {
                    reject(file)
                }
            })
        })


        Promise.all(promises).then((jsFiles: Array<any>) => {
            // TODO: upload via serial 
            jsFiles.forEach((file) => {
                let code =  file.code.split('\r\n').slice(0, -2);
                code.unshift(`import { xapi } from 'xapi'`)
                console.log(code)
                code = code.join('\n')

                const macroCommand = `xcommand Macros Macro Save Overwrite: True Name: ${file.moduleName} Transpile: True\r\n` + 
                `${code}.\r\n` +
                `xcommand Macros Macro Activate Name: ${file.moduleName}\r\n`

                port.write(macroCommand, (err) => {
                    if (err) {
                        console.log(err.message);
                    }
    
                    console.log(`uploaded macro ${file.moduleName}`);
                })
            });
        })


    })
}

main()