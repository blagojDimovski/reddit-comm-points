/* eslint no-use-before-define: "warn" */
const fs = require("fs");
const {  ethers } = require("hardhat");
const {getFileNames} = require('./utils')


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

    if(!fs.existsSync(subdir)) {
        fs.mkdirSync(subdir)
    }
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



const main = async () => {
    console.log("Making group stats...");

    const dirPathBricksRead = "reddit-data-parsed/bricks";
    const dirPathBricksJson = 'reddit-data-json/bricks'
    const dirPathBricksWrite = "reddit-data-stats/bricks";

    const dirPathMoonsRead = "reddit-data-parsed/moons";
    const dirPathMoonsWrite = "reddit-data-stats/moons";

    console.log("Making bricks stats...")
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

    const groupsPathBricks = "reddit-data-stats/bricks/groups/allGroups.json"
    const repeatingGroupsPathBricks = "reddit-data-stats/bricks/groups/repeatingGroups.json"
    const groupsBricks = JSON.parse(fs.readFileSync(groupsPathBricks, 'utf-8'));
    findRepeatingGroups(repeatingGroupsPathBricks, groupsBricks);




};

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
