const fs = require('fs');
const {dataDirs, getStatsTemplateRlp, getStatsTemplateNativeWithCosts,
    ADDR_BYTES, SMALL_BYTES, MED_BYTES, GAS_COST_BYTE} = require('./consts')
const {getByteSize, readData, readFromFile, writeToFile} = require('./utils')

const getStatsCompressed = (data) => {

    const stats = {
        global: {
            byteSizes: {
                total: 0
            },
            gasCosts: {
                total: 0
            }
        },
        dists: {}
    }

    for(let fName in data) {
        let fData = data[fName];

        let distStats = {
            byteSizes: {
                total: 0
            },
            gasCosts: {
                total: 0
            }
        };

        for (let key in fData) {
            let encodedData = fData[key]
            distStats.byteSizes[key] = Buffer.byteLength(encodedData);
            distStats.gasCosts[key] = distStats.byteSizes[key] * GAS_COST_BYTE

            distStats.byteSizes.total += distStats.byteSizes[key]
            distStats.gasCosts.total += distStats.gasCosts[key]

            stats.global.byteSizes[key] += distStats.byteSizes[key]
            stats.global.gasCosts[key] += distStats.gasCosts[key]

            stats.global.byteSizes.total += distStats.byteSizes[key]
            stats.global.gasCosts.total += distStats.gasCosts[key]

        }


        stats.dists[fName] = distStats

    }

    return stats;

};




const compareGasCosts = (stats) => {
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

    let statsDir = `${dataDirs.sizeStats}/${encType}/${dataset}`
    if(!fs.existsSync(statsDir)) {
        fs.mkdirSync(statsDir, {recursive: true});
    }

    let costsObj = {

    }

    if(argv.naive) {
        console.log(`[${dataset}][${encType}] Calculating naive gas costs...`)
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
        console.log(`[${dataset}][${encType}] Calculating compressed gas costs...`)
        let compressedGasCosts;
        let compressedGasCostsPath = `${statsDir}/compressedGasCosts.json`;

        if(argv.cache) {
            compressedGasCosts = readFromFile(compressedGasCostsPath);
        } else {
            compressedGasCosts = getStatsCompressed(encodedData)
            writeToFile(compressedGasCostsPath, compressedGasCosts)
        }
        costsObj['compressed'] = compressedGasCosts
    }


    let savingStats = compareGasCosts(costsObj);
    writeToFile(`${statsDir}/savings.json`, savingStats)
    console.log(`[${dataset}][${encType}] Savings calculated and written to file!`);
}


module.exports = {
    computeStats
}