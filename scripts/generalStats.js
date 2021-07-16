const fs = require('fs')
const {readData, getByteSizeForRepeatingGroup, getBitmapStats, groupByKarma, filterNewAndRepeatingItems} = require('./utils')
const {dataDirs, GAS_COST_BYTE} = require('./consts')

const getLargestRepeatingGroup = (data, encType='rlp') => {

    const largestGroup = {
        numItems: 0,
        items: [],
        karma: 0,
        byteSize: 0,
        gasCost: 0,
        fileName: '',
        groupKey: 0,
        range: 0
    };


    for (let fName in data) {
        let fData = data[fName];

        for(let key in fData) {
            // get only repeating groups
            if(key[5] !== '1' || key[6] !== '1') continue;

            let repeatingGroup = fData[key];

            for(let karma in repeatingGroup) {
                if(repeatingGroup[karma].length > largestGroup.numItems) {
                    let items = repeatingGroup[karma];
                    let maxId = Math.max(...items);
                    let minId = Math.min(...items);
                    let range = maxId - minId;
                    console.log(maxId, minId, range);
                    largestGroup.numItems = items.length;
                    largestGroup.items = items;
                    largestGroup.karma = karma;
                    largestGroup.fileName = fName;
                    largestGroup.groupKey = key;
                    largestGroup.range = range;
                }
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

const getUserStats = (data) => {

    let addrIndex = {};
    let stats = {
        global: {
            unique: 0,
            repeating: 0,
            percentRepeating: 0,
            total: 0
        },
        dists: {}
    };


    for (let fName in data) {

        let fData = data[fName];

        let unique = 0;
        let repeating = 0;
        let total = 0;
        for (let obj of fData) {
            if(!obj.address || !obj.karma) continue;
            if(obj.address in addrIndex) {
                repeating++;
            } else {
                unique++;
                addrIndex[obj.address] = 1;
            }
            total++;
        }

        stats.dists[fName] = {
            unique: unique,
            repeating: repeating,
            percentRepeating: (repeating/total) * 100,
            total: total
        }

        stats.global.total += total;

    }

    stats.global.unique = Object.keys(addrIndex).length;
    stats.global.repeating = stats.global.total - stats.global.unique;

    stats.global.percentRepeating = (stats.global.repeating/stats.global.total * 100);

    return stats;
}

const getGroupStats = (data) => {

    let stats = {
        dists: {}
    };

    const addrIndex = {};

    for (let fName in data) {


        let fData = data[fName];
        const {newItems, repeatingItems} = filterNewAndRepeatingItems(fData, addrIndex);

        if(fName === 'round_1_finalized') continue;

        const {groups, singles} = groupByKarma(repeatingItems);
        const numUniqueRepeating = Object.keys(singles).length;
        const numGroupedRepeating = repeatingItems.length - numUniqueRepeating;
        stats.dists[fName] = {
            numAirdrops: fData.length,
            new: newItems.length,
            repeating: repeatingItems.length,
            uniqueRepeating: numUniqueRepeating,
            groupedRepeating: numGroupedRepeating,
            uniquePercent: (numUniqueRepeating / repeatingItems.length) * 100,
            groupedPercent:(numGroupedRepeating / repeatingItems.length) * 100
        }

        console.log(`Stats for ${fName} calculated`);

    }

    return stats;
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

    // const largestGroup = getLargestRepeatingGroup(groupedData, encType)
    // fs.writeFileSync(`${statsDir}/largestGroupStats.json`, JSON.stringify(largestGroup))
    //
    // const bmapStats = getBitmapStats(largestGroup.karma, largestGroup.items, largestGroup.gasCost, encType);
    // fs.writeFileSync(`${statsDir}/largestGroupBitmapStats.json`, JSON.stringify(bmapStats))
    //
    // const userStats = getUserStats(jsonData)
    // fs.writeFileSync(`${statsDir}/userStats.json`, JSON.stringify(userStats))

    const groupStats = getGroupStats(jsonData)
    fs.writeFileSync(`${statsDir}/groupStats.json`, JSON.stringify(groupStats))


    console.log(`[${dataset}][${encType}] Stats saved!`)

};

module.exports = {
    generalStats
}
