const fs = require('fs')
const {readData, getByteSizeForGroup} = require('./utils')
const {dataDirs, GAS_COST_BYTE} = require('./consts')

const getLargestRepeatingGroupRlp = (data) => {

    const largestGroup = {
        numItems: 0,
        items: [],
        karma: 0,
        byteSize: 0,
        gasCost: 0,
        fName: ''
    };

    for (let fName in data) {
        let fData = data[fName];

        let repeatingGrouped = fData.repeatingGrouped;

        for(let karma in repeatingGrouped) {
            if(repeatingGrouped[karma].length > largestGroup.numItems) {
                largestGroup.numItems = repeatingGrouped[karma].length;
                largestGroup.items = repeatingGrouped[karma];
                largestGroup.karma = karma;
                largestGroup.fName = fName;
            }
        }

    }

    largestGroup.byteSize = getByteSizeForGroup(largestGroup.karma, largestGroup.items, 'rlp');
    largestGroup.gasCost = largestGroup.byteSize * GAS_COST_BYTE

    return largestGroup;



};


const getLargestRepeatingRecursive = (data, path) => {

    let largestGroup = {
        numItems: 0,
        items: [],
        karma: 0,
        path: []
    }

    for (let key in data) {
        if (data[key] instanceof Array) {

            if(data[key].length > largestGroup.numItems) {
                largestGroup = {
                    numItems: data[key].length,
                    items: data[key],
                    karma: key,
                    path: path
                }
            }

        } else {
            let pathTmp = path.slice();
            pathTmp.push(key);
            let resGroup = getLargestRepeatingRecursive(data[key], pathTmp)
            largestGroup = resGroup.numItems > largestGroup.numItems ? resGroup : largestGroup;
        }
    }

    return largestGroup;

}

const getLargestRepeatingGroupNative = (data) => {

    const largestGroup = {
        numItems: 0,
        items: [],
        karma: 0,
        path: [],
        byteSize: 0,
        gasCost: 0,
        fName: ''
    };

    for (let fName in data) {
        let fData = data[fName];

        let repeatingGrouped = fData.repeatingGrouped;
        let largestGroupTmp = getLargestRepeatingRecursive(repeatingGrouped, []);
        if(largestGroupTmp.numItems > largestGroup.numItems) {
            largestGroup.numItems = largestGroupTmp.numItems;
            largestGroup.items = largestGroupTmp.items;
            largestGroup.karma = largestGroupTmp.karma;
            largestGroup.path = largestGroupTmp.path;
            largestGroup.fName = fName;
        }


    }
    largestGroup.byteSize = getByteSizeForGroup(largestGroup.karma, largestGroup.items, 'native');
    largestGroup.gasCost = largestGroup.byteSize * GAS_COST_BYTE

    return largestGroup;

}

const makeAddressIndex = (data) => {

    const index = {};

    for (let fName in data) {
        let fData = data[fName];

        for (let addr in fData) {
            if (!(addr in index)) {
                index[addr] = Object.keys(index).length
            }
        }

    }
    return index;

}


const bitmapStats = (group) => {

    let items = group.items.slice();
    items.sort((a, b) => {
        return a - b;
    })

    let startIndex = items[0]
    let endIndex = items[items.length - 1];
    let bitmapRange = endIndex - startIndex;
    let projectedItems = items.map(item => item - startIndex)
    let bitmap = BigInt(0)




    for (let item of projectedItems) {
        bitmap = bitmap | (BigInt(1) << BigInt(item));
    }
    //
    // // pad bitmap with ones
    let bitsRemaining = 8 - (bitmapRange % 8)
    // bitmap = bitmap | (BigInt(1) << BigInt(bitsRemaining));


    let bitmapStr = bitmap.toString(2);
    let bitmapBits = bitsRemaining + bitmapRange;
    let bitmapBytes = bitmapBits / 8;

    return {
        startIndex,
        endIndex,
        bitmapBits,
        bitmapBytes,
        bitmapRange,
        items,
        projectedItems,
        bitmapStr,
        group
    }

}

const generalStats = (argv) => {

    let dataset = argv.dataset;
    let encType = argv.encType;
    console.log(`[${dataset}][${encType}] Making stats...`)

    const groupedData = readData(dataset, 'grouped', encType);
    const jsonData = readData(dataset, 'json');

    let statsDir = `${dataDirs.generalStats}/${encType}/${dataset}`
    if(!fs.existsSync(statsDir)) {
        fs.mkdirSync(statsDir, {recursive: true});
    }

    const largestGroup = encType === 'rlp' ? getLargestRepeatingGroupRlp(groupedData) : getLargestRepeatingGroupNative(groupedData);
    fs.writeFileSync(`${statsDir}/largestGroupStats.json`, JSON.stringify(largestGroup))

    const bmapStats = bitmapStats(largestGroup);
    fs.writeFileSync(`${statsDir}/largestGroupBitmapStats.json`, JSON.stringify(bmapStats))

    // const index = makeAddressIndex(jsonData);
    // fs.writeFileSync(`${statsDir}/addrIndex.json`, JSON.stringify(index))



    console.log(`[${dataset}][${encType}] Stats saved!`)

};

module.exports = {
    generalStats
}
