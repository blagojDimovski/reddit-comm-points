const fs = require('fs');
const {dataDirs, getStatsTemplateRlp, getStatsTemplateNative,
    ADDR_BYTES, SMALL_BYTES, MED_BYTES, GAS_COST_BYTE} = require('./consts')
const {getByteSize, readData, readFromFile, writeToFile} = require('./utils')

const getStatsCompressedRlp = (data) => {

    const stats = {
        global: getStatsTemplateRlp(),
        dists: {}
    }

    for(let fName in data) {
        let fData = data[fName];

        let distStats = getStatsTemplateRlp();
        distStats.byteSizes.newSingles = Buffer.byteLength(fData.newSingles);
        distStats.byteSizes.newGrouped = Buffer.byteLength(fData.newGrouped);
        distStats.byteSizes.repeatingSingles = Buffer.byteLength(fData.repeatingSingles);
        distStats.byteSizes.repeatingGrouped = Buffer.byteLength(fData.repeatingGrouped);
        distStats.byteSizes.repeatingSingles = distStats.byteSizes.repeatingSingles > 1 ? distStats.byteSizes.repeatingSingles : 0;
        distStats.byteSizes.repeatingGrouped = distStats.byteSizes.repeatingGrouped > 1 ? distStats.byteSizes.repeatingGrouped : 0;

        for(let k in distStats.byteSizes) {
            if(k === 'total') continue;
            distStats.gasCosts[k] = distStats.byteSizes[k] * GAS_COST_BYTE
            distStats.byteSizes.total += distStats.byteSizes[k]
            distStats.gasCosts.total += distStats.gasCosts[k]

            stats.global.byteSizes[k] += distStats.byteSizes[k]
            stats.global.gasCosts[k] += distStats.gasCosts[k]

            stats.global.byteSizes.total += distStats.byteSizes[k]
            stats.global.gasCosts.total += distStats.gasCosts[k]

        }
        stats.dists[fName] = distStats

    }

    return stats;

};

const calculateStatsRecursive = (data, byteSizes, gasCosts) => {

    let totalGasCost = 0;
    let totalByteSize = 0;

    for (let key in data) {
        if (data[key] instanceof Buffer || data[key] instanceof Uint8Array) {
            byteSizes[key] = Buffer.byteLength(data[key])
            gasCosts[key] = byteSizes[key] * GAS_COST_BYTE
            totalByteSize += byteSizes[key]
            totalGasCost += gasCosts[key]
        } else if(data[key] instanceof Object) {
            let res = calculateStatsRecursive(data[key], byteSizes[key], gasCosts[key], totalByteSize, totalGasCost)
            totalGasCost += res.totalGasCost;
            totalByteSize += res.totalByteSize;
        }
    }

    return {totalGasCost, totalByteSize}

}

const updateGlobalRecursive = (distStats, globalStats) => {

    for(key in distStats) {
        if (distStats[key] instanceof Object) {
            updateGlobalRecursive(distStats[key], globalStats[key]);
        } else {
            if(globalStats[key] instanceof Object) {
                globalStats[key] = distStats[key]
            } else {
                globalStats[key] += distStats[key];
            }
        }
    }

}

const getStatsCompressedNative = (data) => {

    const stats = {
        global: getStatsTemplateNative(),
        dists: {}
    }

    for(let fName in data) {
        let fData = data[fName];

        let distStats = getStatsTemplateNative();


        let res = calculateStatsRecursive(fData, distStats.byteSizes, distStats.gasCosts);
        distStats.byteSizes.total = res.totalByteSize;
        distStats.gasCosts.total = res.totalGasCost;

        updateGlobalRecursive(distStats, stats.global)

        stats.dists[fName] = distStats;


    }

    return stats;

};const compareGasCosts = (stats) => {
    /***
     * gasCosts has the following structure: {
     *     'naive': {
     *         global:{
     *             gasCosts: {
     *                 total: 1
     *             },
     *             byteSizes: {
     *                 total: 1
     *             }
     *         },
     *         dists: {...}
     *     },
     *     'compressed': {
     *         global: {
     *             gasCosts: {
     *                 total: 1,
     *             },
     *             byteSizes: {
     *                 total: 1
     *             }
     *         },
     *         dists: {...}
     *     },
     *     ...
     * }
     *
     * **/

    let statKeys = Object.keys(stats);
    let statsComputed = {

    };
    for(let i = 0; i < statKeys.length; i++) {

        let statI = stats[statKeys[i]];

        for (let j = i + 1; j < statKeys.length; j++) {
            let statJ = stats[statKeys[j]];

            let compKey = `${statKeys[j]}_${statKeys[i]}`
            let gcSaving = statI.global.gasCosts.total - statJ.global.gasCosts.total;
            let gcSavingP = (gcSaving / statI.global.gasCosts.total) * 100;
            let bsSaving = statI.global.byteSizes.total - statJ.global.byteSizes.total;
            let bsSavingP = (bsSaving / statI.global.byteSizes.total) * 100;
            let compObj = {
                global: {
                    gasCosts: {
                        saving: gcSaving,
                        savingPercent: gcSavingP
                    },
                    byteSizes: {
                        saving: bsSaving,
                        savingPercent: bsSavingP
                    }
                },
                dists: {}
            }

            for (let distKey in statJ.dists) {

                let gcSavingDist = statI.dists[distKey].gasCosts.total - statJ.dists[distKey].gasCosts.total;
                let gcSavingDistP = (gcSavingDist / statI.dists[distKey].gasCosts.total) * 100;
                let bsSavingDist = statI.dists[distKey].byteSizes.total - statJ.dists[distKey].byteSizes.total;
                let bsSavingDistP = (bsSavingDist / statI.dists[distKey].byteSizes.total) * 100;

                compObj.dists[distKey] = {
                    gasCosts: {
                        saving: gcSavingDist,
                        savingPercent: gcSavingDistP
                    },
                    byteSizes: {
                        saving: bsSavingDist,
                        savingPercent: bsSavingDistP
                    }
                }

            }
            statsComputed[compKey] = compObj

        }


    }


    return statsComputed;


};



const getStatsNaive = (fileData, encType='rlp') => {

    const stats = {
        global: {
            gasCosts: {
                total: 0,
            },
            byteSizes: {
                total: 0
            }
        },
        dists: {

        }

    }

    for (let fName in fileData) {
        let data = fileData[fName];
        let byteSize = 0;
        for(let item of data) {
            byteSize += getByteSize(item.karma, encType);
            byteSize += ADDR_BYTES;
        }
        stats.dists[fName] = {
            gasCosts: {
                total: byteSize * GAS_COST_BYTE
            },
            byteSizes: {
                total: byteSize
            }
        }

        stats.global.byteSizes.total += stats.dists[fName].byteSizes.total
        stats.global.gasCosts.total += stats.dists[fName].gasCosts.total
    }

    return stats;
};



const computeStats = (argv) => {

    let dataset = argv.dataset;
    let encType = argv.encType;

    const jsonData = readData(dataset, 'json');
    const encodedData = readData(dataset, 'encoded', encType);

    let statsDir = `${dataDirs.stats}/${encType}/${dataset}`
    if(!fs.existsSync(statsDir)) {
        fs.mkdirSync(statsDir, {recursive: true});
    }

    let costsObj = {

    }

    if(argv.naive) {
        console.log(`[${dataset}] Calculating naive gas costs, enc type: [${encType}]...`)
        let naiveGasCosts;
        let naiveGasCostsPath = `${statsDir}/naiveGasCosts.json`;
        if(argv.cache) {
            naiveGasCosts = readFromFile(naiveGasCostsPath)
        } else {
            naiveGasCosts = getStatsNaive(jsonData, encType)
            writeToFile(naiveGasCostsPath, naiveGasCosts)
        }

        costsObj['naive'] = naiveGasCosts;

    }

    if(argv.compressed) {
        console.log(`[${dataset}] Calculating compressed gas costs, enc type: [${encType}]...`)
        let compressedGasCosts;
        let compressedGasCostsPath = `${statsDir}/compressedGasCosts.json`;

        if(argv.cache) {
            compressedGasCosts = readFromFile(compressedGasCostsPath);
        } else {
            compressedGasCosts = encType === 'rlp' ? getStatsCompressedRlp(encodedData) : getStatsCompressedNative(encodedData)
            writeToFile(compressedGasCostsPath, compressedGasCosts)
        }
        costsObj['compressed'] = compressedGasCosts
    }


    let savingStats = compareGasCosts(costsObj);
    writeToFile(`${statsDir}/savings.json`, savingStats)
    console.log(`[${dataset}] Savings calculated and written to file, enc type: [${encType}]`);
}


module.exports = {
    computeStats
}