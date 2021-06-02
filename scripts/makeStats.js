/* eslint no-use-before-define: "warn" */
const fs = require("fs");
const {  ethers } = require("hardhat");
const {getFileNames} = require('./utils')

const ADDR_BYTES = 20;
const SMALL_NUM_BYTES = 1;
const MID_NUM_BYTES = 3;
const BATCH_TYPE_BYTES = 1;
const BITMASK_BYTES = 13;
const GAS_COST_BYTE = 16;


const getMaxGroupFromBatch = (batch) => {

    let maxGroup = {
        numItems: 0,
        items: [],
        karma: ''
    }
    for (let karma of Object.keys(batch)) {

        let items = batch[karma];
        if (items.length > maxGroup.numItems) {
            maxGroup.numItems = items.length;
            maxGroup.items = items;
            maxGroup.karma = karma;
        }

    }
    return maxGroup

}

const getStats = async (dirPathRead, dirPathWrite) => {

    const files = getFileNames(dirPathRead)
    const stats = {
        largestGroupRepeating: {
            filename: '',
            karma: '',
            numItems: 0,
            items: []
        }
    };
    for (let file of files) {
        let data = fs.readFileSync(`${dirPathRead}/${file}`)
        data = JSON.parse(data.toString('utf-8'));
        let fileName = file.replace('.json', '')


        for (let batch of data.repeatingGrouped) {
            if(Object.keys(batch).length === 0) continue;

            let largestGroupBatch = getMaxGroupFromBatch(batch);
            if (largestGroupBatch.numItems > stats.largestGroupRepeating.numItems) {
                stats.largestGroupRepeating = largestGroupBatch;
                stats.largestGroupRepeating.filename = fileName;
            }

        }
    }

    console.log("stats", stats)


    fs.writeFileSync(`${dirPathWrite}/general.json`, JSON.stringify(stats))


}

const indexAddresses = (dirPathRead, dirPathWrite, reindex=false) => {

    let indexPath = `${dirPathWrite}/addressIndex.json`;
    if(fs.existsSync(indexPath) && !reindex) {
        let data = fs.readFileSync(indexPath)
        return JSON.parse(data.toString('utf-8'));
    }

    const files = getFileNames(dirPathRead)
    const index = {

    };
    for (let file of files) {
        let data = fs.readFileSync(`${dirPathRead}/${file}`)
        console.log(`indexing file... ${file}`)
        data = JSON.parse(data.toString('utf-8'));

        for(let item of data) {
            if(!(item.address in index)) {
                index[item.address] = Object.keys(index).length
            }
        }
        console.log(`file ${file} indexed successfully!`)
    }
    fs.writeFileSync(`${dirPathWrite}/addressIndex.json`, JSON.stringify(index))
    return index;
}

const makeGroups = (dirPathRead, dirPathWrite, index) => {
    let subdir = `${dirPathWrite}/groups`

    const files = getFileNames(dirPathRead)
    const groupStatsMap = {};
    let groupId = 0;
    for (let file of files) {
        let data = fs.readFileSync(`${dirPathRead}/${file}`)
        data = JSON.parse(data.toString('utf-8'));
        let groups = {

        };
        for(let item of data) {
            let addrId = index[item.address];
            if(!(item.karma in groups)) {
                groups[item.karma] = [addrId]
            } else {
                groups[item.karma].push(addrId)
            }
        }
        for(let karma of Object.keys(groups)) {
            if (groups[karma].length > 1) {
                groupStatsMap[groupId] = {
                    karma: karma,
                    items: groups[karma],
                    numItems: groups[karma].length
                }
                groupId++;
            }
        }

    }

    fs.writeFileSync(`${subdir}/allGroups.json`, JSON.stringify(groupStatsMap))
}


const addAddressInGroup = (item, groups, addressIndex) => {
    let addrId = addressIndex[item.address]
    if(!(item.karma in groups)) {
        groups[item.karma] = [addrId]
    } else {
        groups[item.karma].push(addrId)
    }
}

const deleteAddrFromIndexById = (addrId, addressIndex) => {

    let key = Object.keys(addressIndex).find(key => addressIndex[key] === addrId)
    delete addressIndex[key];

}

const makeGroupsWithRepeatingUsersOnly = (dirPathRead, dirPathWrite) => {
    let subdir = `${dirPathWrite}/groups`

    const files = getFileNames(dirPathRead)
    const groupStatsMap = {};
    const addressIndex = {};
    let groupId = 0;
    for (let file of files) {
        let data = fs.readFileSync(`${dirPathRead}/${file}`)
        data = JSON.parse(data.toString('utf-8'));
        let groups = {};
        for(let item of data) {

            if(!(item.address in addressIndex)) {

                addressIndex[item.address] = Object.keys(addressIndex).length;

                if(file === files[0]) {
                    addAddressInGroup(item, groups, addressIndex);
                }
            } else {
                addAddressInGroup(item, groups, addressIndex);
            }

        }

        for(let karma of Object.keys(groups)) {
            if (groups[karma].length > 1) {
                groupStatsMap[groupId] = {
                    karma: karma,
                    items: groups[karma],
                    numItems: groups[karma].length,
                    filename: file
                }
                groupId++;
            } else {
                deleteAddrFromIndexById(groups[karma][0], addressIndex)
            }
        }

    }

    fs.writeFileSync(`${subdir}/groupsWithOnlyRepeatingUsers.json`, JSON.stringify(groupStatsMap))
    fs.writeFileSync(`${subdir}/addressIndexFromGrouping.json`, JSON.stringify(addressIndex))

}


const compareGroups = (group1, group2) => {
    let result = {
        duplicate: false,
        subset: false,
        groupId: 0
    }
    // if (group1.karma !== group2.karma) {
    //     return result;
    // }

    let duplicate = true;

    let smallerGroup;
    let largerGroup;

    if(group1.items > group2.items) {
        smallerGroup = group2;
        largerGroup = group1;
    } else {
        smallerGroup = group1;
        largerGroup = group2;
    }

    for (let item of smallerGroup.items) {
        if(!largerGroup.items.includes(item)) {
            duplicate = false;
            break;
        }
    }
    result.duplicate = duplicate;

    if(duplicate) {
        if(smallerGroup.items.length !== largerGroup.items.length) {
            result.subset = true;
        }
    }
    return result;

};

const findRepeatingGroups = (writePath, groups) => {

    let numGroups = Object.keys(groups).length;
    let repeatingGroups = {

    };
    for(let i = 0; i < numGroups; i++) {
        let iStr = i.toString();

        let groupI = groups[iStr];

        for(let j = i + 1; j < numGroups; j++) {
            let jStr = j.toString();
            let groupJ = groups[jStr];
            let result = compareGroups(groupI, groupJ);
            if(result.duplicate) {

                result.groupId = jStr;
                if(i in repeatingGroups) {
                    repeatingGroups[iStr].push(result)
                } else {
                    repeatingGroups[iStr] = [result]
                }
            }


        }

    }

    fs.writeFileSync(`${writePath}`, JSON.stringify(repeatingGroups))

}

const makeGroupsByMonth = (groups) => {

    const groupsByMonth = {

    };

    for (let groupId in groups) {
        if(!groups.hasOwnProperty(groupId)) continue;

        let group = groups[groupId];
        group.groupId = groupId;
        let filenameId = group.filename.split('_')[1];
        if(filenameId in groupsByMonth) {
            groupsByMonth[filenameId].push(group)
        } else {
            groupsByMonth[filenameId] = [group]
        }
    }


    return groupsByMonth;

}


const findSubsetsForEachGroup = (writePath, groups) => {

    const groupsByMonth = makeGroupsByMonth(groups);

    fs.writeFileSync(`${writePath}/groupsByMonth.json`, JSON.stringify(groupsByMonth))



    let distIds = Object.keys(groupsByMonth);
    distIds.sort((first, second) => parseInt(first) - parseInt(second));

    let subsets = {

    };

    for (let distId of distIds.slice(1)) {

        for(let distId2 of distIds) {
            if(distId === distId2) {
                break;
            }

            let groupsOld = groupsByMonth[distId2];
            let groupsNew = groupsByMonth[distId];

            for(let i = 0; i < groupsNew.length; i++) {
                let groupNew = groupsNew[i];
                subsets[groupNew.groupId] = {
                    repeats: [],
                    notIncluded: []
                }
                let included = []

                for(let j = 0; j < groupsOld.length; j++) {
                    let groupOld = groupsOld[j];

                    let grSubsets = {
                        groupId: groupOld.groupId,
                        items: [],
                        numItems: 0
                    }
                    for(let item of groupNew.items) {
                        if (groupOld.items.includes(item)) {
                            grSubsets.items.push(item);
                            grSubsets.numItems++;

                            included.push(item);
                        }
                    }
                    if(grSubsets.numItems > 0) {
                        subsets[groupNew.groupId].repeats.push(grSubsets);
                    }
                }

                for(let item of groupNew.items) {
                    if(!included.includes(item)) {
                        subsets[groupNew.groupId].notIncluded.push(item);
                    }
                }

            }

        }

    }

    fs.writeFileSync(`${writePath}/groupSubsets.json`, JSON.stringify(subsets))



};


const groupItems = (items, addressMap= null) => {

    let groupedItems = {};
    for(let item of items) {
        let address = item.address;
        if(addressMap) {
            address = addressMap(address);
        }
        if (item.karma in groupedItems) {
            groupedItems[item.karma].push(address)
        } else {
            groupedItems[item.karma] = [address]
        }
    }

    let singles = {}
    let grouped = {}
    for(let karma in groupedItems) {
        if(groupedItems[karma].length === 1) {
            let addr = groupedItems[karma][0]
            singles[addr] = karma;
        } else {
            grouped[karma] = groupedItems[karma]
        }
    }
    return {
        singles,
        grouped
    }

}


const getGroupsForRepeatingUsersPerKarma = (karma, items) => {
    const groups = {

    };
    items.sort();

    for(let item of items) {
        let groupId = Math.floor(item/100);
        let bitmapPosition = item % 100;
        if (groupId in groups) {
            groups[groupId].items.push(item);
            groups[groupId].bitmap = groups[groupId].bitmap | BigInt(1) << BigInt(bitmapPosition);
        } else {
            groups[groupId] = {
                items: [item],
                bitmap: BigInt(1) << BigInt(bitmapPosition)
            }
        }
    }
    return groups;

}


const isSmallNum = (num) => {
    return parseInt(num) < 128;
}

const calculateStats = (classifiedItems) => {

    // newSingles = 1 byte + (20 bytes + 1 or 3 bytes) * numAddresses
    // newGrouped = 1 byte + (1 or 3 bytes + 1 or 3 bytes + numAddr * 20 bytes) * numGroups
    // repeatingSingles = 1 byte + (1 or 3 bytes + 1 or 3 bytes) * numAddresses
    // repeatingMasks = 1 byte + (1 or 3 bytes + 1 or 3 bytes + (1 or 3 bytes + 13 bytes) * numGroupsInKarma) * numGroups

    // newSingles
    let stats = {
        gasCosts: {
            newSingles: 0,
            newGrouped: 0,
            repeatedSingles: 0,
            repeatedMasks: 0
        },
        byteSizes: {
            newSingles: 0,
            newGrouped: 0,
            repeatedSingles: 0,
            repeatedMasks: 0
        }
    }

    // new singles
    for(let addr in classifiedItems.newSingles) {
        let byteSize = 0;
        if(isSmallNum(classifiedItems.newSingles[addr])) {
            byteSize += SMALL_NUM_BYTES
        } else {
            byteSize += MID_NUM_BYTES
        }
        byteSize += ADDR_BYTES;
        stats.byteSizes.newSingles += byteSize;
    }

    // new grouped
    for(let karma in classifiedItems.newGrouped) {
        let byteSize = 0;
        let items = classifiedItems.newGrouped[karma];
        if(isSmallNum(karma)) {
            byteSize += SMALL_NUM_BYTES;
        } else {
            byteSize += MID_NUM_BYTES;
        }

        if(isSmallNum(items.length)) {
            byteSize += SMALL_NUM_BYTES;
        } else {
            byteSize += MID_NUM_BYTES;
        }

        byteSize += ADDR_BYTES * items.length;
        stats.byteSizes.newGrouped += byteSize
    }


    // repeating singles
    for(let addrId in classifiedItems.repeatedSingles) {
        let byteSize = 0;
        if(isSmallNum(classifiedItems.repeatedSingles[addrId])) {
            byteSize += SMALL_NUM_BYTES
        } else {
            byteSize += MID_NUM_BYTES
        }

        if(isSmallNum(addrId)) {
            byteSize += SMALL_NUM_BYTES
        } else {
            byteSize += MID_NUM_BYTES
        }

        stats.byteSizes.repeatedSingles += byteSize;
    }

    // repeating masks
    for(let karma in classifiedItems.repeatedMasks) {
        let byteSize = 0;

        // karma
        if(isSmallNum(karma)) {
            byteSize += SMALL_NUM_BYTES
        } else {
            byteSize += MID_NUM_BYTES
        }

        // numGroups
        if(isSmallNum(Object.keys(classifiedItems.repeatedMasks[karma]).length)) {
            byteSize += SMALL_NUM_BYTES
        } else {
            byteSize += MID_NUM_BYTES
        }

        for(let groupId in classifiedItems.repeatedMasks[karma]) {
            // groupId
            if(isSmallNum(groupId)) {
                byteSize += SMALL_NUM_BYTES
            } else {
                byteSize += MID_NUM_BYTES
            }

            // bitMask
            byteSize += BITMASK_BYTES
        }

        stats.byteSizes.repeatedMasks += byteSize;
    }

    for (let key in stats.byteSizes) {
        if(stats.byteSizes[key] > 0) {
            stats.byteSizes[key] += 1;
            stats.gasCosts[key] = GAS_COST_BYTE * stats.byteSizes[key];
        }
    }

    return stats
}

const makeStatsWithCosts = (dirPathRead, dirPathWrite) => {

    let subdir = `${dirPathWrite}/stats`

    const files = getFileNames(dirPathRead)
    const addressIndex = {};
    const stats = {
        global: {
            gasCosts: {
                newSingles: 0,
                newGrouped: 0,
                repeatedSingles: 0,
                repeatedMasks: 0
            },
            byteSizes: {
                newSingles: 0,
                newGrouped: 0,
                repeatedSingles: 0,
                repeatedMasks: 0
            }
        },
        dists: {

        }

    }

    for (let file of files) {
        let data =  fs.readFileSync(`${dirPathRead}/${file}`)
        data = JSON.parse(data.toString('utf-8'));
        let classifiedItems = {
            newSingles: {

            },
            newGrouped: {

            },
            repeatedSingles: {

            },
            repeatedMasks: {

            }
        };
        let newItems = [];
        let repeatingItems = [];
        for(let item of data) {
            if(!(item.address in addressIndex)) {
                newItems.push(item);
                addressIndex[item.address] = Object.keys(addressIndex).length;
            } else {
                repeatingItems.push(item);
            }
        }


        let {singles, grouped} = groupItems(newItems)
        classifiedItems.newSingles = singles;
        classifiedItems.newGrouped = grouped;


        let addressMap = (addr) => addressIndex[addr];
        let res = groupItems(repeatingItems, addressMap)
        classifiedItems.repeatedSingles = res.singles;

        for(let karma in res.grouped) {
            let items = res.grouped[karma].slice();
            classifiedItems.repeatedMasks[karma] = getGroupsForRepeatingUsersPerKarma(karma, items);
        }

        let distStats = calculateStats(classifiedItems);
        let distName = file.replace('.json', '')
        stats.dists[distName] = distStats

        for (let key in distStats.byteSizes) {
            stats.global.byteSizes[key] += distStats.byteSizes[key]
            stats.global.gasCosts[key] += distStats.gasCosts[key]
        }

        fs.writeFileSync(`${subdir}/${file}`, JSON.stringify(classifiedItems, (key, value) => {
            return typeof value === 'bigint' ? value.toString(2) : value
        }))

    }

    fs.writeFileSync(`${subdir}/statsGlobal.json`, JSON.stringify(stats))


};



const main = async () => {
    console.log("Making group stats...");

    const dirPathBricksRead = "reddit-data-parsed/bricks";
    const dirPathBricksJson = 'reddit-data-json/bricks'
    const dirPathBricksWrite = "reddit-data-stats/bricks";

    const dirPathMoonsRead = "reddit-data-parsed/moons";
    const dirPathMoonsWrite = "reddit-data-stats/moons";

    // console.log("Making bricks stats...")
    // await getStats(dirPathBricksRead, dirPathBricksWrite);
    //
    // console.log("Making address index...")
    // let index = indexAddresses(dirPathBricksJson, dirPathBricksWrite);
    // console.log("Address index created...")
    // console.log("Making groups...")
    // makeGroups(dirPathBricksJson, dirPathBricksWrite, index);
    // console.log("Groups created...")
    // console.log("Making moons stats...")
    // await getStats(dirPathMoonsRead, dirPathMoonsWrite);
    //
    // console.log("Making groups from repeating users only...")
    // makeGroupsWithRepeatingUsersOnly(dirPathBricksJson, dirPathBricksWrite);

    // const groupsPathBricks = "reddit-data-stats/bricks/groups/groupsWithOnlyRepeatingUsers.json"
    // const repeatingGroupsPathBricks = "reddit-data-stats/bricks/groups/repeatingGroups.json"
    // const groupsBricks = JSON.parse(fs.readFileSync(groupsPathBricks, 'utf-8'));
    // findRepeatingGroups(repeatingGroupsPathBricks, groupsBricks);

    //
    // console.log("Finding group subsets...")
    // findSubsetsForEachGroup('reddit-data-stats/bricks/groups', groupsBricks)

    //
    //
    console.log("Making bricks stats with costs...")
    makeStatsWithCosts(dirPathBricksJson, dirPathBricksWrite)


};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
