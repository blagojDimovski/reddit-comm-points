const fs = require("fs");
const {dataDirs, RLP_MULTI_DIGIT_BYTES, RLP_SINGLE_DIGIT_BYTES, SMALL_BYTES, MED_BYTES} = require('./consts')
const getFileNames = (readDirPath) => {
    let files = fs.readdirSync(readDirPath);
    return files.sort((a, b) => {
        let aSplit = a.split("_");
        let bSplit = b.split("_");
        aRound = parseInt(aSplit[1]);
        bRound = parseInt(bSplit[1]);
        return aRound - bRound;
    });
};

const readData = (dataset = 'bricks', dType = 'json', encType='') => {
    let readDir;
    if(encType) {
        readDir = `${dataDirs[dType]}/${encType}/${dataset}`;
    } else {
        readDir = `${dataDirs[dType]}/${dataset}`;
    }
    const files = getFileNames(readDir)
    let data = {};

    if (dType !== 'encoded') {

        for (let file of files) {
            let fName = file.split('.')[0]
            data[fName] = JSON.parse(fs.readFileSync(`${readDir}/${file}`, 'utf-8'))
        }
    } else {
        for (let file of files) {
            try {
                let subDir = `${readDir}/${file}`;
                let subFiles = fs.readdirSync(subDir)
                let sFileData = {};
                for (let sFile of subFiles) {
                    let fSplit = sFile.split('_')
                    readDataRecursively(fSplit, subDir, sFileData, 0);
                }
                data[file] = sFileData
            } catch (e) {
                // fallback for non directories
                continue;
            }

        }
    }
    return data;

}

const readDataRecursively = (fSplit, basePath, data, index= 0) => {
    if(fSplit.length > 1) {

        if(index === fSplit.length - 1) {
            let fPath = `${basePath}/${fSplit.join('_')}`
            data[fSplit[index]] = fs.readFileSync(fPath)
        } else {
            if(!(fSplit[index] in data)) {
                data[fSplit[index]] = {}
            }
            readDataRecursively(fSplit, basePath, data[fSplit[index]], index + 1)
        }

    } else {
        let fName = fSplit[0];
        data[fName] = fs.readFileSync(`${basePath}/${fName}`);
    }

};



const writeData = (data, dataset = 'bricks', dType = 'grouped', encType = 'rlp') => {
    // data is in the format {'round_1_finalized: {...}, 'round_2_finalized': {...}} -> the keys are the filenames without prefix
    let writeDir;
    if(encType) {
        writeDir = `${dataDirs[dType]}/${encType}/${dataset}`;
    } else {
        writeDir = `${dataDirs[dType]}/${dataset}`;
    }

    if(!fs.existsSync(writeDir)) {
        fs.mkdirSync(writeDir, {recursive: true})
    }

    for (let file in data) {
        let fName = file;
        let fData = data[file];
        if(dType !== 'encoded') {
            fName = `${fName}.json`;
            fData = JSON.stringify(fData);
            fs.writeFileSync(`${writeDir}/${fName}`, fData);
        } else {
            let fileDir = `${writeDir}/${fName}`;
            if(!fs.existsSync(fileDir)) {
                fs.mkdirSync(fileDir)
            }
            writeFilesRecursively(fData, fileDir, '');
        }
    }


}

const writeFilesRecursively = (fData, basePath, path='') => {

    for (let key in fData) {
        let kData = fData[key];
        let fKey = path ? `${path}_${key}` : `${key}`
        if(kData instanceof Uint8Array) {
            fs.writeFileSync(`${basePath}/${fKey}`, kData)
        } else if (kData instanceof Object) {
            writeFilesRecursively(kData, basePath, fKey)
        }
    }

}

const stringifyBigIntReplacer = (key, value) => {
    return typeof value === 'bigint' ? value.toString(2) : value;
};

const writeToFile = (filePath, obj) => {

    fs.writeFileSync(filePath, JSON.stringify(obj, stringifyBigIntReplacer))

}

const readFromFile = (filePath) => {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

const getByteSize = (num, mode= "rlp") => {
    // get byte size for num (karma) up to 2 bytes
    num = parseInt(num)
    if(mode === "rlp") {
        return num < 128 ? RLP_SINGLE_DIGIT_BYTES : RLP_MULTI_DIGIT_BYTES;
    } else {
        return num < 256 ? SMALL_BYTES : MED_BYTES;
    }
}

const getByteSizeForGroup = (karma, items, encType) => {
    let byteSizes = items.map(num => getByteSize(num, encType));
    let itemsTotalByteSize = byteSizes.length ? byteSizes.reduce((acc, curr) => acc + curr) : byteSizes.length;
    return getByteSize(karma, encType) + getByteSize(items.length, encType) + itemsTotalByteSize;

}


module.exports = {
    getByteSizeForGroup,
    getFileNames,
    readData,
    writeData,
    readFromFile,
    writeToFile,
    stringifyBigIntReplacer,
    getByteSize
}