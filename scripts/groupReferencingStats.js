/* eslint no-use-before-define: "warn" */
const fs = require("fs");
const {readData, writeData, getBitmapStats, getByteSizeForRepeatingGroup, getBitmapStatsClusters, isSmallNum, groupAddresses, groupByKarma, filterNewAndRepeatingItems} = require('./utils')
const {dataDirs, GAS_COST_BYTE, getNativeTemplate, getNativeTemplateWithBitmaps, getGroupBitKeys} = require('./consts')


const getGroupIndexAndMetadata = (data) => {
    let stats = {};
    let groupIndex = {0: {dist: '', ids: [], amount: 0}};
    let addressIndex = {};
    let groupId = 0;
    for (let fName in data) {
        let fData  = data[fName];

        let distGroups = {0: {dist: fName, ids: [], amount: 0}};
        let amountAddressIndex = {};
        let amountGroupIndex = {};
        let distGroupId = 0;

        for (let item of fData) {

            if(!(item.address in addressIndex)) {
                addressIndex[item.address] = Object.keys(addressIndex).length;
            }

            if (!(item.karma in amountGroupIndex)) {
                amountGroupIndex[item.karma] = distGroupId
                amountAddressIndex[item.karma] = [item.address];
                distGroups[distGroupId] = {
                    dist: fName,
                    amount: item.karma,
                    ids: [item.address]
                }
                distGroupId++;
            } else {
                amountAddressIndex[item.karma].push(item.address);

                let tmpGroupId = amountGroupIndex[item.karma];
                distGroups[tmpGroupId].ids.push(item.address);
            }


        }


        for (let dstGrId in distGroups) {
            groupIndex[groupId] = distGroups[dstGrId];
            groupId++;
        }

        stats[fName] = {
            groups: distGroups,
            amountAddressIndex: amountAddressIndex,
            amountGroupIndex: amountGroupIndex
        }
        console.log(`Metadata obtained for ${fName}`)
    }

    return {
      metadata: stats,
      groupIndex: groupIndex,
      addressIndex: addressIndex
    };

};

const isDistLower = (dist1, dist2) => {
    let dist1id = parseInt(dist1.split('_')[1]);
    let dist2id = parseInt(dist2.split('_')[1]);

    if( dist1id < dist2id) {
        return true;
    }
    return false;
}

const getGroupsWithLowerDist = (currentDist, groupIndex) => {

    const groupSubset = {}

    for( let groupId in groupIndex) {
        let group = groupIndex[groupId];
        if(isDistLower(group.dist, currentDist)) {
            groupSubset[groupId] = group;
        }
    }

    return groupSubset;

}

const areIdsEqual = (ids1, ids2) => {
    if(ids1.length !== ids2.length) return false;
    for(let id in ids1) {
        if(ids2.indexOf(id) < 0) {
            return false;
        }
    }
    // arrays of equal length + no mismatch ids;
    return true;
}


const getReferencingGroups = (data, groupIndex) => {
    const iterativeAddressIndex = {};
    const referencingStats = {};
    for (let fName in data) {

        let fData = data[fName];
        const {newItems, repeatingItems} = filterNewAndRepeatingItems(fData, iterativeAddressIndex);

        if(fName === 'round_1_finalized') continue;

        const {groups, singles} = groupByKarma(repeatingItems);

        const groupsIndexed = getGroupsWithLowerDist(fName, groupIndex);

        referencingStats[fName] = {
            numReferencedGroups: 0,
            groupIds: []
        }

        for(let karma in groups) {
            const group = groups[karma];

            for (let groupId in groupsIndexed) {
                const groupIndexed = groupsIndexed[groupId];
                if (karma === groupIndexed.amount) {
                    let res = areIdsEqual(groupIndexed.ids, group)
                    if(res) {
                        referencingStats[fName].numReferencedGroups++;
                        referencingStats[fName].groupIds.push(groupId);
                        break;
                    }
                }
            }

        }


    }

    return referencingStats;

};

const groupReferencingStats = (argv) => {
    const dataset = argv.dataset;

    const jsonData = readData(dataset, 'json');

    console.log(`[${dataset}] Making referencing stats...`);

    let stats = getGroupIndexAndMetadata(jsonData);

    writeData(stats.metadata, dataset, 'groupingMetadata');
    fs.writeFileSync(`data/stats/groupingMetadata/${dataset}/group_index.json`, JSON.stringify(stats.groupIndex))

    let referencingStats = getReferencingGroups(jsonData, stats.groupIndex);
    writeData(referencingStats, dataset, 'groupingStats');


    console.log(`[${dataset}] Referencing stats created!`);

};


module.exports = {
    groupReferencingStats
}

