const fs = require("fs");
const {dataDirs, RLP_MULTI_DIGIT_BYTES, RLP_SINGLE_DIGIT_BYTES, SMALL_BYTES, MED_BYTES, GAS_COST_BYTE, BITMAP_CLUSTER_GAP_SIZES} = require('./consts')
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

const getByteSizeForRepeatingGroup = (karma, ids, encType) => {
    let byteSizes = ids.map(num => getByteSize(num, encType));
    let itemsTotalByteSize = byteSizes.length ? byteSizes.reduce((acc, curr) => acc + curr) : byteSizes.length;
    return getByteSize(karma, encType) + getByteSize(ids.length, encType) + itemsTotalByteSize;

}



const compressBitmap = (bitmapStr, wordSizeBits = 8) => {

    let tmpId = 0;
    let header = '';
    let compressedBitmap = '';
    let emptyBytes = 0;
    let nonEmptyBytes = 0;
    while(tmpId !== bitmapStr.length) {
        let byte = bitmapStr.slice(tmpId, tmpId + wordSizeBits)

        let isEmpty = true;
        for(let bit of byte) {
            if (bit === '1') {
                isEmpty = false;
                break;
            }
        }

        if (isEmpty) {
            header = `${header}0`
            emptyBytes++;
        } else {
            header = `${header}1`
            compressedBitmap = `${compressedBitmap}${byte}`
            nonEmptyBytes++;
        }

        tmpId += wordSizeBits
    }


    let mod = header.length % wordSizeBits
    let rawBitmap = bitmapStr;
    if(mod !== 0) {
        let headerBitsRemaining = wordSizeBits - mod;
        header = header.padStart(header.length + headerBitsRemaining, '0');
        rawBitmap = rawBitmap.padStart(rawBitmap.length + (headerBitsRemaining) * 8, '0');
    }

    return {
        header,
        rawBitmap,
        compressedBitmap,
        emptyBytes,
        nonEmptyBytes
    }

}


const groupAddresses = (addrs) => {
    let addrsSm = [];
    let addrsMd = []

    for (let addr of addrs) {
        if(isSmallNum(addr)) {
            addrsSm.push(addr);
        } else {
            addrsMd.push(addr);
        }
    }
    return {
        addrsSm,
        addrsMd
    }
}

const getBitmapStatsClusters = (karma, ids, encType='native') => {
    let items = ids.slice();
    let karmaBytes = getByteSize(karma, encType);
    items.sort((a, b) => {
        return a - b;
    })

    let bitmapByteSize = calculateBitmapStats(karma, items, encType).byteSize;

    let addrGroup = groupAddresses(items);
    let addrSmByteSize = getByteSizeForRepeatingGroup(karma, addrGroup.addrsSm, encType);
    let addrMdByteSize = getByteSizeForRepeatingGroup(karma, addrGroup.addrsMd, encType);
    let nativeByteSize = addrSmByteSize + addrMdByteSize;

    let bitmapGasCost = bitmapByteSize * GAS_COST_BYTE;
    let nativeGasCost = nativeByteSize * GAS_COST_BYTE;


    let clustersPerGapSize = {

    };

    let gasCostMin = Number.MAX_SAFE_INTEGER;
    let gasCostMinGapSize = 8;

    for(let gapSize of BITMAP_CLUSTER_GAP_SIZES) {
        let clusters = {};

        let clusterId = 0;
        let minClusterItems = items.length;
        let maxClusterItems = 0;

        let byteSize = 0;
        let gasCost = 0;
        let numClusters = 0;
        let clusteredAddresses = 0;
        let smallClusters = 0;
        let gasSavedOverNative = 0;
        let gasSavedOverBitmaps = 0;

        let prevItem = items[0];
        clusters[clusterId] = {items: [prevItem], stats: {byteSize: 0}};
        let unclusteredItems = [];
        for(let item of items.slice(1)) {
            if ((item - prevItem) >= gapSize) {
                // previous cluster stats
                let itemsPrevCluster = clusters[clusterId].items;
                if(itemsPrevCluster.length > maxClusterItems) {
                    maxClusterItems = itemsPrevCluster.length;
                }

                if (itemsPrevCluster.length < minClusterItems) {
                    minClusterItems = itemsPrevCluster.length;
                }


                if(itemsPrevCluster.length > 3) {
                    clusters[clusterId].stats = calculateBitmapStats(karma, itemsPrevCluster, encType);
                    numClusters++;
                    clusteredAddresses += itemsPrevCluster.length;
                    byteSize += clusters[clusterId].stats.byteSize;
                    clusterId++;
                } else {
                    let {addrsSm, addrsMd} = groupAddresses(itemsPrevCluster);


                    if(addrsSm.length === 1) {
                        byteSize += (1 + karmaBytes)
                    } else if(addrsSm.length >  1) {
                        let addrsSmLenBytes = getByteSize(addrsSm.length, encType)
                        byteSize += (karmaBytes + addrsSmLenBytes + addrsSm.length)
                    }

                    if(addrsMd.length === 1) {
                        byteSize += (1 + karmaBytes)
                    } else if(addrsMd.length >  1) {
                        let addrsMdLenBytes = getByteSize(addrsMd.length, encType)
                        byteSize += (karmaBytes + addrsMdLenBytes + addrsMd.length)
                    }

                    smallClusters++;
                    delete clusters[clusterId];

                }

                // create new cluster
                clusters[clusterId] = {items: [item], stats: {byteSize: 0}};
            } else {
                clusters[clusterId].items.push(item);
            }

            prevItem = item;

        }
        gasCost = byteSize * GAS_COST_BYTE;
        gasSavedOverBitmaps = bitmapGasCost - gasCost;
        gasSavedOverNative = nativeGasCost - gasCost;

        if(gasCost < gasCostMin) {
            gasCostMin = gasCost;
            gasCostMinGapSize = gapSize
        }

        clustersPerGapSize[gapSize] = {
            clusters: clusters,
            numClusters: numClusters,
            smallClusters: smallClusters,
            minClusterItems: minClusterItems,
            maxClusterItems: maxClusterItems,
            byteSize: byteSize,
            gasCost: gasCost,
            clusteredAddresses: clusteredAddresses,
            gasSavedOverNative: gasSavedOverNative,
            gasSavedOverBitmaps: gasSavedOverBitmaps
        };

    }


    return {
        clustersPerGapSize: clustersPerGapSize,
        bitmapGasCost: bitmapGasCost,
        nativeGasCost: nativeGasCost,
        gasCostMin: gasCostMin,
        gasCostMinGapSize: gasCostMinGapSize
    };
}


const getBitmapStats = (karma, ids, encType) => {

    let items = ids.slice();
    items.sort((a, b) => {
        return a - b;
    })

    return calculateBitmapStats(karma, items, encType)

}


const calculateBitmapStats = (karma, items, encType) => {


    let startId = items[0]
    let endId = items[items.length - 1];
    let range = (endId - startId) + 1;
    let projectedItems = items.map(item => item - startId)
    let bitmap = BigInt(0)

    for (let item of projectedItems) {
        bitmap = bitmap | (BigInt(1) << BigInt(item));
    }

    let mod = range % 8;
    let bits = range;
    if(mod !== 0) {
        let bitsRemaining = 8 - mod;
        bits += bitsRemaining;
    }


    let rawBitmap = bitmap.toString(2);

    // pad bitmap with zeroes
    rawBitmap = rawBitmap.padStart(bits, '0')

    let compressRes = compressBitmap(rawBitmap);

    let headerBytes = compressRes.header.length / 8
    let totalBitmapBytes = headerBytes + compressRes.nonEmptyBytes;

    let byteSize = getByteSize(karma, encType) + getByteSize(startId, encType) + getByteSize(range, encType) + getByteSize(headerBytes, encType) + totalBitmapBytes

    return {
        startId,
        range,
        headerBytes,
        header: compressRes.header,
        rawBitmap: compressRes.rawBitmap,
        compressedBitmap: compressRes.compressedBitmap,
        byteSize,
        karma
    }

}

const isSmallNum = (num) => {
    return parseInt(num) <= 255;
}


module.exports = {
    getByteSizeForRepeatingGroup,
    getBitmapStats,
    getBitmapStatsClusters,
    getFileNames,
    readData,
    writeData,
    readFromFile,
    writeToFile,
    stringifyBigIntReplacer,
    getByteSize,
    isSmallNum,
    groupAddresses
}