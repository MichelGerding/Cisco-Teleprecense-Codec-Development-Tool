import * as ts from "typescript";
import * as fs from 'fs';
import * as path from 'path';

function main () {
    //get the directory of the modules
    const moduleDir: string = path.resolve(process.env.MODULE_PATH ?? './modules');

    fs.readdir(moduleDir, (err, files) => {
        if (err) {throw err}
    
        let tsFiles = Array<{moduleName: string, path: string, code?: string}>()

        // check if the file is a folder or a file
        files.forEach((file) => {
            const filePath = path.join(moduleDir, file)

            const fileStats = fs.statSync(filePath);
            if (fileStats.isFile()){
                
                // if it is a file we check if the etension is .ts
                const fileExtension = path.extname(file).toLowerCase()
                if (fileExtension === '.ts') {
                    // if the file is a ts file we take the name of the file as 
                    // module name and then add it to the tsFiles array
                    const moduleName = file.slice(0, -3);
                    tsFiles.push({
                        moduleName: moduleName,
                        path: filePath
                    })
                }
            } else if (fileStats.isDirectory()) {
                // if it is a directory we check if it has an index.ts file in the folder
                const modDir = fs.readdirSync(filePath);
                if (modDir.includes('index.ts')) {
                    // if it has we take the name of the folder as the filename
                    const moduleName = file
                    tsFiles.push({
                        moduleName: moduleName,
                        path: path.join(filePath, 'index.ts')
                    })
                }
            }

        })


        // TODO: transpile sources 
        tsFiles.forEach((file, index) => {
            return new Promise((resolve, reject) => {
                try {
                    const tsSource = fs.readFileSync(file.path).toString();
                    const jsModule = ts.transpile(tsSource)

                    tsFiles[index].code = jsModule;
                    // tsFiles[index].code = jsSource; 
                } catch(err) {
                    reject(file)
                }
            })
        })


        console.log(tsFiles)

        eval(tsFiles[0].code)
        // TODO: upload via serial 
    })
}

function compile(fileNames: string[], options: ts.CompilerOptions): void {
  let program = ts.createProgram(fileNames, options);
  let emitResult = program.emit();

  let allDiagnostics = ts
    .getPreEmitDiagnostics(program)
    .concat(emitResult.diagnostics);

  allDiagnostics.forEach(diagnostic => {
    if (diagnostic.file) {
      let { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
      let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
      console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
    } else {
      console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    }
  });

  let exitCode = emitResult.emitSkipped ? 1 : 0;
  console.log(`Process exiting with code '${exitCode}'.`);
  process.exit(exitCode);
}

main();