
const ADDR_BYTES = 20;
const RLP_SINGLE_DIGIT_BYTES = 1;
const SMALL_BYTES = 1;
const MED_BYTES = 2;
const RLP_MULTI_DIGIT_BYTES = 3;
const BATCH_TYPE_BYTES = 1;
const BITMASK_BYTES = 13;
const GAS_COST_BYTE = 16;


const dataDirs = {
    raw: 'data/raw',
    encoded: 'data/encoded',
    decoded: 'data/decoded',
    grouped: 'data/grouped',
    stats: 'data/stats',
    json: 'data/json',
    addrIndex: 'data/addrIndex'
}

const statsTemplateRlp = {
    gasCosts: {
        newSingles: 0,
        newGrouped: 0,
        repeatingSingles: 0,
        repeatingGrouped: 0,
        total: 0
    },
    byteSizes: {
        newSingles: 0,
        newGrouped: 0,
        repeatingSingles: 0,
        repeatingGrouped: 0,
        total: 0
    }
}

const nativeTemplate = {
    newSingles: {
        amountSmall: {},
        amountMed: {}
    },
    newGrouped: {
        amountSmall: {
            numAddrSmall: {},
            numAddrMed: {},
        },
        amountMed: {
            numAddrSmall: {},
            numAddrMed: {}
        }
    },
    repeatingSingles: {
        amountSmall: {
            addrSmall: {},
            addrMed: {},
        },
        amountMed: {
            addrSmall: {},
            addrMed: {},
        }
    },
    repeatingGrouped: {
        amountSmall: {
            numAddrSmall: {
                addrSmall: {},
                addrMed: {}
            },
            numAddrMed: {
                addrSmall: {},
                addrMed: {}
            }
        },
        amountMed: {
            numAddrSmall: {
                addrSmall: {},
                addrMed: {}
            },
            numAddrMed: {
                addrSmall: {},
                addrMed: {}
            }
        }
    }
}




const getStatsTemplateRlp = () => {
    return JSON.parse(JSON.stringify(statsTemplateRlp))
}

const getStatsTemplateNative = () => {

    return {
        gasCosts: JSON.parse(JSON.stringify({...nativeTemplate, total: 0})),
        byteSizes: JSON.parse(JSON.stringify({...nativeTemplate, total: 0})),
    };

}

module.exports = {
    dataDirs,
    getStatsTemplateRlp,
    getStatsTemplateNative,
    ADDR_BYTES,
    RLP_SINGLE_DIGIT_BYTES,
    RLP_MULTI_DIGIT_BYTES,
    BATCH_TYPE_BYTES,
    BITMASK_BYTES,
    SMALL_BYTES,
    MED_BYTES,
    GAS_COST_BYTE
}