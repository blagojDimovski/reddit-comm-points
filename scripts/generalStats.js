const fs = require('fs')
const {readData, getByteSizeForRepeatingGroup, getBitmapStats} = require('./utils')
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

    largestGroup.byteSize = getByteSizeForRepeatingGroup(largestGroup.karma, largestGroup.items, 'rlp');
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
    largestGroup.byteSize = getByteSizeForRepeatingGroup(largestGroup.karma, largestGroup.items, 'native');
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

    const bmapStats = getBitmapStats(largestGroup.karma, largestGroup.items, largestGroup.gasCost, encType);
    fs.writeFileSync(`${statsDir}/largestGroupBitmapStats.json`, JSON.stringify(bmapStats))

    // const index = makeAddressIndex(jsonData);
    // fs.writeFileSync(`${statsDir}/addrIndex.json`, JSON.stringify(index))



    console.log(`[${dataset}][${encType}] Stats saved!`)

};

module.exports = {
    generalStats
}
